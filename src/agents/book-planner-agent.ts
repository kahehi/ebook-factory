import type { BookPlannerInput, BookPlanResult } from "@/types";
import { buildBookPlanPrompt, distributeWordBudget, WORDS_PER_PAGE } from "./prompt-builder";
import { chatCompleteJSON } from "@/lib/ai-client";

export { WORDS_PER_PAGE };

export class BookPlannerAgent {
  async plan(projectData: BookPlannerInput): Promise<BookPlanResult> {
    const systemPrompt = `You are an expert book planner and ghostwriter.
Respond ONLY with a valid JSON object matching this exact structure — no markdown, no extra text:
{
  "outline": [{ "order": 1, "title": "...", "goal": "...", "keyPoints": ["..."], "targetWordCount": 5000 }],
  "globalSummary": "...",
  "styleRules": "...",
  "conceptList": ["..."],
  "noGoList": ["..."]
}
Rules:
- outline must contain exactly ${projectData.chapterCount} chapters
- word counts in outline must sum to approximately ${projectData.targetWordCount}
- write ALL text content in ${projectData.language}`;

    const userPrompt = buildBookPlanPrompt(projectData);
    const result = await chatCompleteJSON<BookPlanResult>(systemPrompt, userPrompt);

    // Ensure word budgets are sane even if the model drifted
    const budgets = distributeWordBudget(projectData.targetWordCount, projectData.chapterCount);
    result.outline = result.outline.slice(0, projectData.chapterCount).map((ch, i) => ({
      ...ch,
      order: i + 1,
      targetWordCount: ch.targetWordCount || budgets[i],
    }));

    return result;
  }
}
