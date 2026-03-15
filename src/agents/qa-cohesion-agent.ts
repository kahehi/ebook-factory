import type { QaAgentInput, QaAgentOutput, QaFindingData } from "@/types";
import { buildQaPrompt } from "./prompt-builder";
import { chatCompleteJSON } from "@/lib/ai-client";

export class QaCohesionAgent {
  async analyze(input: QaAgentInput): Promise<QaAgentOutput> {
    const systemPrompt = `You are a professional book editor and quality assurance specialist.
Analyze the manuscript thoroughly and return ONLY a JSON object with this structure:
{
  "findings": [
    {
      "chapterId": "string or null",
      "findingType": "RED_THREAD|TRANSITION|CONSISTENCY|REPETITION|WORD_COUNT|COMPLETENESS|TONALITY|SPELLING|GRAMMAR|FORMATTING|CITATION",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "description": "specific description of the issue, quote the problematic text if possible",
      "suggestion": "concrete suggestion to fix it"
    }
  ],
  "overallScore": 85,
  "summary": "2-3 sentence overall assessment"
}

Check for ALL of the following:
- RED_THREAD: missing logical flow or narrative thread across chapters
- TRANSITION: abrupt or missing transitions between chapters
- CONSISTENCY: inconsistent facts, character names, terminology
- REPETITION: repeated phrases, ideas, or sentence structures
- WORD_COUNT: chapters significantly over or under their target word count
- COMPLETENESS: incomplete arguments, missing conclusions, unresolved topics
- TONALITY: inconsistent tone or style between chapters
- SPELLING: spelling errors, typos, wrong words (e.g. "their" vs "there")
- GRAMMAR: grammatical errors, wrong tense, subject-verb disagreement, broken sentences
- FORMATTING: inconsistent heading levels, broken markdown, mixed list styles, missing paragraph breaks, inconsistent use of bold/italic
- CITATION: incorrect, unverifiable, or missing citations; fabricated quotes or statistics; sources that should be referenced but aren't

For SPELLING, GRAMMAR, CITATION: quote the exact problematic text and provide the corrected version in the suggestion.
For CITATION: flag any specific claim, statistic, or quote that appears invented or unverified.
Be specific and actionable. Only report real issues, not imagined ones.`;

    const result = await chatCompleteJSON<QaAgentOutput>(systemPrompt, buildQaPrompt(input), undefined, 0.3);

    const validTypes = new Set(["RED_THREAD","TRANSITION","CONSISTENCY","REPETITION","WORD_COUNT","COMPLETENESS","TONALITY","SPELLING","GRAMMAR","FORMATTING","CITATION"]);
    const validSeverity = new Set(["LOW","MEDIUM","HIGH","CRITICAL"]);

    result.findings = (result.findings ?? []).filter(
      (f: QaFindingData) => validTypes.has(f.findingType) && validSeverity.has(f.severity)
    );
    result.overallScore = Math.max(0, Math.min(100, result.overallScore ?? 50));

    return result;
  }
}
