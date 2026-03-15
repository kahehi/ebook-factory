import type { ChapterAgentInput, ChapterAgentOutput } from "@/types";
import { buildChapterPrompt } from "./prompt-builder";
import { chatComplete } from "@/lib/ai-client";

export class ChapterAgent {
  async generate(input: ChapterAgentInput): Promise<ChapterAgentOutput> {
    const systemPrompt = `You are an expert author writing a ${input.bookType} book in ${input.language}.
Write ONE complete chapter — never stop mid-chapter.
The chapter must have a clear opening, developed main body with H2/H3 headings, and a closing paragraph that bridges to the next chapter.
Target length: ${input.targetWordCount} words (±10%). Do NOT cut off early.
After the chapter text write exactly this on its own line: ---SUMMARY---
Then write a 2-3 sentence summary of the chapter for narrative continuity.`;

    const raw = await chatComplete(systemPrompt, buildChapterPrompt(input), undefined, 0.75);
    return parseChapterResponse(raw);
  }
}

function parseChapterResponse(raw: string): ChapterAgentOutput {
  const marker = "---SUMMARY---";
  const idx = raw.lastIndexOf(marker);

  let content: string;
  let summary: string;

  if (idx !== -1) {
    content = raw.slice(0, idx).trim();
    summary = raw.slice(idx + marker.length).trim();
  } else {
    const paragraphs = raw.trim().split(/\n\n+/);
    summary = paragraphs[paragraphs.length - 1]?.trim() ?? "";
    content = raw.trim();
  }

  return { content, summary, wordCount: countWords(content) };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
