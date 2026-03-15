import type {
  BookPlannerInput,
  ChapterAgentInput,
  QaAgentInput,
  ChapterOutlineItem,
} from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

export const WORDS_PER_PAGE = 250;

// ─── Book Planner Prompt ──────────────────────────────────────────────────────

export function buildBookPlanPrompt(projectData: BookPlannerInput): string {
  return `You are an expert book planner and ghostwriter. Your task is to create a comprehensive book plan.

## Book Details
- **Title**: ${projectData.title}
- **Topic**: ${projectData.topic}
- **Book Type**: ${projectData.bookType}
- **Target Audience**: ${projectData.targetAudience}
- **Language**: ${projectData.language}
- **Total Target Words**: ${projectData.targetWordCount.toLocaleString()}
- **Number of Chapters**: ${projectData.chapterCount}
- **Writing Tonality**: ${projectData.tonality}
${projectData.seriesContext ? `- **Series Context**: ${projectData.seriesContext}` : ""}

## Your Task
Create a detailed book plan with the following components:

### 1. Chapter Outline
For each of the ${projectData.chapterCount} chapters, provide:
- Chapter title (compelling and descriptive)
- Chapter goal (what the reader will learn/experience)
- 3-5 key points to cover
- Target word count (total must sum to ~${projectData.targetWordCount})

### 2. Global Summary
A 2-3 paragraph summary of the entire book's arc, main arguments, and value proposition.

### 3. Style Rules
Specific writing guidelines for this book:
- Tone and voice instructions
- Sentence structure preferences
- Examples and analogy usage
- Any special formatting conventions

### 4. Concept List
List of 10-20 key concepts, terms, and ideas that must be consistently defined and used throughout the book.

### 5. No-Go List
List of 5-10 topics, phrases, clichés, or approaches to explicitly avoid in this book.

Return your response as a structured JSON object matching the BookPlanResult interface.`;
}

// ─── Chapter Agent Prompt ─────────────────────────────────────────────────────

export function buildChapterPrompt(input: ChapterAgentInput): string {
  const chapterPosition = getChapterPosition(input.chapterOrder, input.outline.length);

  return `You are an expert author writing a ${input.bookType} book. Write Chapter ${input.chapterOrder}: "${input.chapterTitle}".

## Book Context
- **Book Title**: ${input.bookTitle}
- **Topic**: ${input.bookTopic}
- **Target Audience**: ${input.targetAudience}
- **Language**: ${input.language}
- **Tonality**: ${input.tonality}
${input.seriesContext ? `- **Series Context**: ${input.seriesContext}` : ""}

## Book Summary
${input.globalSummary}

## Style Rules
${input.styleRules}

## Key Concepts to Use
${input.conceptList.join(", ")}

## Topics/Phrases to Avoid
${input.noGoList.join(", ")}

## Chapter Structure (Full Outline)
${input.outline.map((ch) => `Chapter ${ch.order}: ${ch.title} (${ch.targetWordCount} words)`).join("\n")}

## This Chapter
- **Position**: ${chapterPosition}
- **Title**: ${input.chapterTitle}
- **Goal**: ${input.chapterGoal}
- **Target Word Count**: ${input.targetWordCount} words (IMPORTANT: stay within ±10%)
${input.prevChapterSummary ? `\n## Previous Chapter Summary\n${input.prevChapterSummary}` : ""}
${input.nextChapterSummary ? `\n## Next Chapter Preview\n${input.nextChapterSummary}` : ""}
${input.rewriteInstructions ? `\n## Rewrite Instructions\n${input.rewriteInstructions}` : ""}

## Output Requirements
1. Write the full chapter content in ${input.language}
2. Include proper headings (H2/H3) where appropriate
3. The chapter should flow naturally from the previous and into the next
4. End with a brief transition or summary that leads into the next chapter
5. After the chapter, provide a 2-3 sentence summary for context continuity

Write the complete chapter now:`;
}

// ─── QA Prompt ────────────────────────────────────────────────────────────────

export function buildQaPrompt(qaInput: QaAgentInput): string {
  const chaptersOverview = qaInput.chapters
    .map(
      (ch) =>
        `- Chapter ${ch.order}: "${ch.title}" — ${ch.wordCount}/${ch.targetWordCount} words`
    )
    .join("\n");

  const totalWords = qaInput.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  return `You are a professional book editor and quality assurance specialist. Analyze this book manuscript for quality, cohesion, and completeness.

## Book Information
- **Title**: ${qaInput.bookTitle}
- **Topic**: ${qaInput.bookTopic}
- **Target Audience**: ${qaInput.targetAudience}
- **Language**: ${qaInput.language}
- **Tonality**: ${qaInput.tonality}
- **Target Word Count**: ${qaInput.targetWordCount.toLocaleString()} words
- **Actual Word Count**: ${totalWords.toLocaleString()} words

## Book Summary
${qaInput.globalSummary}

## Style Rules
${qaInput.styleRules}

## Key Concepts
${qaInput.conceptList.join(", ")}

## Topics to Avoid
${qaInput.noGoList.join(", ")}

## Chapters Overview
${chaptersOverview}

## Full Manuscript
${qaInput.chapters.map((ch) => `\n### Chapter ${ch.order}: ${ch.title}\n\n${ch.content}`).join("\n\n---\n")}

## Your QA Analysis Tasks

Analyze the manuscript for the following issues:

1. **RED_THREAD**: Does the book have a coherent narrative thread? Are arguments built upon each other?
2. **TRANSITION**: Are chapter transitions smooth? Does each chapter lead naturally to the next?
3. **CONSISTENCY**: Are key concepts, character names, facts, and terminology consistent throughout?
4. **REPETITION**: Are there unnecessary repetitions of content, phrases, or ideas?
5. **WORD_COUNT**: Are individual chapters significantly over or under their targets?
6. **COMPLETENESS**: Does each chapter fulfill its stated goal? Is the book complete?
7. **TONALITY**: Is the writing tone consistent with the specified tonality throughout?

## Output Format
Return a JSON object with:
- findings: Array of issues found (findingType, severity LOW/MEDIUM/HIGH/CRITICAL, description, suggestion, chapterId if specific to a chapter)
- overallScore: Float 0-100 representing overall manuscript quality
- summary: 2-3 sentence overall assessment`;
}

// ─── Length Check Prompt ──────────────────────────────────────────────────────

export function buildLengthCheckPrompt(
  chapters: Array<{
    id: string;
    title: string;
    wordCount: number;
    targetWordCount: number;
  }>
): string {
  return `Analyze word count distribution for these chapters and identify issues:

${chapters
  .map((ch) => {
    const ratio = ch.wordCount / ch.targetWordCount;
    const status =
      ratio < 0.7 ? "SEVERELY_SHORT" : ratio < 0.9 ? "SHORT" : ratio > 1.3 ? "LONG" : "OK";
    return `- "${ch.title}": ${ch.wordCount}/${ch.targetWordCount} words (${Math.round(ratio * 100)}%) — ${status}`;
  })
  .join("\n")}

For each chapter that is significantly off-target (>10% deviation), provide:
1. A clear description of the issue
2. A specific recommendation for adjustment
3. The number of words to add or remove`;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getChapterPosition(order: number, total: number): string {
  if (order === 1) return "Opening chapter — establish context and hook the reader";
  if (order === total) return "Final chapter — conclude, summarize, and inspire action";
  if (order === 2) return "Early chapter — build foundation after the introduction";
  if (order === total - 1)
    return "Near-final chapter — build toward conclusion, resolve main tensions";
  const percentage = Math.round((order / total) * 100);
  return `Middle chapter (${percentage}% through the book) — develop and deepen the main topic`;
}

export function distributeWordBudget(
  totalWords: number,
  chapterCount: number
): number[] {
  // Give slightly more words to early and late chapters (hook + conclusion)
  const baseWords = Math.floor(totalWords / chapterCount);
  const budgets: number[] = [];

  for (let i = 0; i < chapterCount; i++) {
    let weight = 1.0;
    if (i === 0 || i === chapterCount - 1) weight = 1.15; // First and last get 15% more
    else if (i === 1 || i === chapterCount - 2) weight = 1.05; // Second and second-to-last get 5% more
    budgets.push(Math.round(baseWords * weight));
  }

  // Adjust to hit exact total
  const currentTotal = budgets.reduce((a, b) => a + b, 0);
  const diff = totalWords - currentTotal;
  budgets[Math.floor(chapterCount / 2)] += diff; // Add remainder to middle chapter

  return budgets;
}
