import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpenAIClient } from "@/lib/ai-client";
import { buildChapterPrompt } from "@/agents/prompt-builder";
import type { ChapterOutlineItem } from "@/types";

interface RouteParams {
  params: { id: string; chapterId: string };
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET /api/projects/:id/chapters/:chapterId/stream
// Returns Server-Sent Events: {type:"start"} | {type:"chunk",text:string} | {type:"done",wordCount:number} | {type:"error",message:string}
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id: projectId, chapterId } = params;
  const enc = new TextEncoder();
  const sse = (data: object) => enc.encode(`data: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    async start(ctrl) {
      try {
        const [chapter, project] = await Promise.all([
          prisma.chapter.findUniqueOrThrow({ where: { id: chapterId, projectId } }),
          prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
        ]);

        const bookPlan = await prisma.bookPlan.findUnique({ where: { projectId } });
        if (!bookPlan) {
          ctrl.enqueue(sse({ type: "error", message: "Buchplan nicht gefunden" }));
          ctrl.close();
          return;
        }

        await prisma.chapter.update({
          where: { id: chapterId },
          data: { status: "GENERATING" },
        });
        ctrl.enqueue(sse({ type: "start" }));

        const [prevChapter, nextChapter] = await Promise.all([
          chapter.order > 1
            ? prisma.chapter.findFirst({
                where: { projectId, order: chapter.order - 1 },
                select: { summary: true },
              })
            : null,
          prisma.chapter.findFirst({
            where: { projectId, order: chapter.order + 1 },
            select: { goal: true, title: true },
          }),
        ]);

        const outline = (typeof bookPlan.outline === "string" ? JSON.parse(bookPlan.outline) : bookPlan.outline) as ChapterOutlineItem[];

        const systemPrompt = `You are an expert author writing a ${project.bookType} book in ${project.language}.
Write ONE complete chapter — never stop mid-chapter.
The chapter must have a clear opening, developed main body with H2/H3 headings, and a closing paragraph that bridges to the next chapter.
Target length: ${chapter.targetWordCount} words (±10%). Do NOT cut off early.
After the chapter text write exactly this on its own line: ---SUMMARY---
Then write a 2-3 sentence summary of the chapter for narrative continuity.`;

        const userPrompt = buildChapterPrompt({
          bookTitle: project.title,
          bookTopic: project.topic,
          bookType: project.bookType,
          targetAudience: project.targetAudience,
          language: project.language,
          tonality: project.tonality,
          globalSummary: bookPlan.globalSummary,
          styleRules: bookPlan.styleRules,
          conceptList: (typeof bookPlan.conceptList === "string" ? JSON.parse(bookPlan.conceptList) : bookPlan.conceptList) as string[],
          noGoList: (typeof bookPlan.noGoList === "string" ? JSON.parse(bookPlan.noGoList) : bookPlan.noGoList) as string[],
          seriesContext: project.seriesContext ?? undefined,
          outline,
          chapterOrder: chapter.order,
          chapterTitle: chapter.title,
          chapterGoal: chapter.goal,
          targetWordCount: chapter.targetWordCount,
          prevChapterSummary: prevChapter?.summary ?? undefined,
          nextChapterSummary: nextChapter
            ? `${nextChapter.title}: ${nextChapter.goal}`
            : undefined,
        });

        const modelSetting = await prisma.appSetting.findUnique({
          where: { key: "ai_model" },
        });
        const model = modelSetting?.value ?? "gpt-4o";

        const client = await getOpenAIClient();
        const aiStream = await client.chat.completions.create({
          model,
          temperature: 0.75,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        let fullText = "";
        for await (const chunk of aiStream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            fullText += text;
            ctrl.enqueue(sse({ type: "chunk", text }));
          }
        }

        // Parse content and summary
        const MARKER = "---SUMMARY---";
        const markerIdx = fullText.lastIndexOf(MARKER);
        let content: string, summary: string;

        if (markerIdx !== -1) {
          content = fullText.slice(0, markerIdx).trim();
          summary = fullText.slice(markerIdx + MARKER.length).trim();
        } else {
          const paragraphs = fullText.trim().split(/\n\n+/);
          summary = paragraphs[paragraphs.length - 1]?.trim() ?? "";
          content = fullText.trim();
        }

        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

        // Persist to DB
        const latest = await prisma.chapterVersion.findFirst({
          where: { chapterId },
          orderBy: { version: "desc" },
          select: { version: true },
        });
        const nextVersion = (latest?.version ?? 0) + 1;

        await prisma.$transaction([
          prisma.chapterVersion.create({
            data: { chapterId, version: nextVersion, content, wordCount, summary },
          }),
          prisma.chapter.update({
            where: { id: chapterId },
            data: { currentContent: content, summary, actualWordCount: wordCount, status: "DRAFT" },
          }),
        ]);

        const agg = await prisma.chapter.aggregate({
          where: { projectId },
          _sum: { actualWordCount: true },
        });
        await prisma.project.update({
          where: { id: projectId },
          data: { actualWordCount: agg._sum.actualWordCount ?? 0 },
        });

        ctrl.enqueue(sse({ type: "done", wordCount }));
        ctrl.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Generierung fehlgeschlagen";
        console.error("[stream chapter]", err);
        try {
          ctrl.enqueue(sse({ type: "error", message }));
          ctrl.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
