export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: { id: string; chapterId: string };
}

// PATCH /api/projects/:id/chapters/:chapterId
// Body: { status } OR { content }
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const body = await req.json();

    // ── Save manually edited content ──────────────────────────────
    if ("content" in body) {
      const content: string = body.content;
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

      // Create a new version entry
      const latest = await prisma.chapterVersion.findFirst({
        where: { chapterId: params.chapterId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const nextVersion = (latest?.version ?? 0) + 1;

      const [, chapter] = await prisma.$transaction([
        prisma.chapterVersion.create({
          data: { chapterId: params.chapterId, version: nextVersion, content, wordCount, summary: "" },
        }),
        prisma.chapter.update({
          where: { id: params.chapterId, projectId: params.id },
          data: { currentContent: content, actualWordCount: wordCount, status: "DRAFT" },
        }),
      ]);

      // Update project word count
      const agg = await prisma.chapter.aggregate({
        where: { projectId: params.id },
        _sum: { actualWordCount: true },
      });
      await prisma.project.update({
        where: { id: params.id },
        data: { actualWordCount: agg._sum.actualWordCount ?? 0 },
      });

      return NextResponse.json({ success: true, data: chapter });
    }

    // ── Update status ─────────────────────────────────────────────
    if ("status" in body) {
      const validStatuses = ["PENDING", "GENERATING", "DRAFT", "REVIEWING", "APPROVED", "NEEDS_REVISION"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ success: false, data: null, error: "Invalid status" }, { status: 400 });
      }
      const chapter = await prisma.chapter.update({
        where: { id: params.chapterId, projectId: params.id },
        data: { status: body.status },
      });
      return NextResponse.json({ success: true, data: chapter });
    }

    return NextResponse.json({ success: false, data: null, error: "Invalid body" }, { status: 400 });
  } catch (error) {
    console.error(`[PATCH /api/projects/${params.id}/chapters/${params.chapterId}]`, error);
    return NextResponse.json({ success: false, data: null, error: "Failed to update chapter" }, { status: 500 });
  }
}
