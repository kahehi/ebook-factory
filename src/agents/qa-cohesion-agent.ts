import type { QaAgentInput, QaAgentOutput, QaFindingData } from "@/types";
import { buildQaPrompt } from "./prompt-builder";
import { chatCompleteJSON } from "@/lib/ai-client";

export class QaCohesionAgent {
  async analyze(input: QaAgentInput): Promise<QaAgentOutput> {
    const systemPrompt = `You are a professional book editor and quality assurance specialist.
Analyze the manuscript and return ONLY a JSON object with this structure:
{
  "findings": [
    {
      "chapterId": "string or null",
      "findingType": "RED_THREAD|TRANSITION|CONSISTENCY|REPETITION|WORD_COUNT|COMPLETENESS|TONALITY",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "description": "specific description of the issue",
      "suggestion": "concrete suggestion to fix it"
    }
  ],
  "overallScore": 85,
  "summary": "2-3 sentence overall assessment"
}
Be specific and actionable. Only report real issues, not imagined ones.`;

    const result = await chatCompleteJSON<QaAgentOutput>(systemPrompt, buildQaPrompt(input), undefined, 0.3);

    // Ensure findingType and severity values are valid
    const validTypes = new Set(["RED_THREAD","TRANSITION","CONSISTENCY","REPETITION","WORD_COUNT","COMPLETENESS","TONALITY"]);
    const validSeverity = new Set(["LOW","MEDIUM","HIGH","CRITICAL"]);

    result.findings = (result.findings ?? []).filter(
      (f: QaFindingData) => validTypes.has(f.findingType) && validSeverity.has(f.severity)
    );
    result.overallScore = Math.max(0, Math.min(100, result.overallScore ?? 50));

    return result;
  }
}
