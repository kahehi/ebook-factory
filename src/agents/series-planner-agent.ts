import type { SeriesPlannerInput, SeriesPlanSuggestion } from "@/types";
import { chatCompleteJSON } from "@/lib/ai-client";

export class SeriesPlannerAgent {
  async generatePlan(input: SeriesPlannerInput): Promise<SeriesPlanSuggestion> {
    const systemPrompt = `You are an expert book series strategist and publisher.
Analyze the given series concept and recommend a multi-book structure.
Respond ONLY with a valid JSON object matching this exact structure:
{
  "recommendedBookCount": 5,
  "reasoning": "Why this number of books makes sense for this topic and audience",
  "books": [
    {
      "index": 1,
      "title": "Book Title",
      "subtitle": "Descriptive subtitle",
      "topic": "What this specific book covers",
      "description": "2-3 sentence description of this book's content and value",
      "targetWordCount": 40000,
      "targetPageCount": 160,
      "keyThemes": ["theme1", "theme2", "theme3"],
      "seriesRole": "Einführung"
    }
  ]
}
Rules:
- Recommend 3-7 books based on topic depth and audience
- Each book must stand alone AND contribute to the series arc
- seriesRole must be one of: Einführung, Aufbau, Vertiefung, Praxis, Abschluss
- targetWordCount should be 25000-60000 per book (250 words/page)
- Write titles, subtitles, topics, descriptions, and themes in ${input.language}`;

    const userPrompt = `Create a book series plan for:

**Series Title**: ${input.title}
**Overall Topic/Concept**: ${input.topic}
**Target Audience**: ${input.targetAudience}
**Language**: ${input.language}
**Writing Tone**: ${input.tonality}

Recommend how many books this series should have, what each book covers, and how they build on each other.`;

    const result = await chatCompleteJSON<SeriesPlanSuggestion>(systemPrompt, userPrompt, "gpt-4o", 0.5);

    // Validate and normalize
    result.recommendedBookCount = result.books?.length ?? result.recommendedBookCount ?? 3;
    result.books = (result.books ?? []).map((b, i) => ({ ...b, index: i + 1 }));

    return result;
  }
}
