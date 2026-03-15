import type { LengthCheckResult, LengthIssue } from "@/types";

// LengthSupervisorAgent runs purely locally (no AI call needed — it's arithmetic).
// It validates word counts against targets and flags chapters that are off.

export class LengthSupervisorAgent {
  check(
    chapters: Array<{
      id: string;
      title: string;
      wordCount: number;
      targetWordCount: number;
    }>,
    targetTotal: number
  ): LengthCheckResult {
    const issues: LengthIssue[] = [];
    const projectedTotal = chapters.reduce((s, c) => s + c.wordCount, 0);

    for (const ch of chapters) {
      if (ch.targetWordCount === 0) continue;
      const ratio = ch.wordCount / ch.targetWordCount;

      if (ch.wordCount === 0) {
        issues.push({
          chapterId: ch.id,
          chapterTitle: ch.title,
          currentWordCount: 0,
          targetWordCount: ch.targetWordCount,
          issue: "Chapter has no content yet.",
          recommendation: "Generate content for this chapter.",
          adjustmentWords: ch.targetWordCount,
        });
      } else if (ratio < 0.7) {
        issues.push({
          chapterId: ch.id,
          chapterTitle: ch.title,
          currentWordCount: ch.wordCount,
          targetWordCount: ch.targetWordCount,
          issue: `Severely under target: ${ch.wordCount} of ${ch.targetWordCount} words (${Math.round(ratio * 100)}%).`,
          recommendation: `Add approximately ${ch.targetWordCount - ch.wordCount} words.`,
          adjustmentWords: ch.targetWordCount - ch.wordCount,
        });
      } else if (ratio < 0.85) {
        issues.push({
          chapterId: ch.id,
          chapterTitle: ch.title,
          currentWordCount: ch.wordCount,
          targetWordCount: ch.targetWordCount,
          issue: `Under target: ${ch.wordCount} of ${ch.targetWordCount} words (${Math.round(ratio * 100)}%).`,
          recommendation: `Expand by about ${ch.targetWordCount - ch.wordCount} words.`,
          adjustmentWords: ch.targetWordCount - ch.wordCount,
        });
      } else if (ratio > 1.4) {
        issues.push({
          chapterId: ch.id,
          chapterTitle: ch.title,
          currentWordCount: ch.wordCount,
          targetWordCount: ch.targetWordCount,
          issue: `Significantly over target: ${ch.wordCount} of ${ch.targetWordCount} words (${Math.round(ratio * 100)}%).`,
          recommendation: `Consider trimming about ${ch.wordCount - ch.targetWordCount} words.`,
          adjustmentWords: -(ch.wordCount - ch.targetWordCount),
        });
      }
    }

    const totalRatio = targetTotal > 0 ? projectedTotal / targetTotal : 1;
    let status: "OK" | "WARNING" | "CRITICAL";
    if (totalRatio < 0.6 || issues.some((i) => i.adjustmentWords > 3000)) {
      status = "CRITICAL";
    } else if (totalRatio < 0.85 || issues.length > 0) {
      status = "WARNING";
    } else {
      status = "OK";
    }

    return {
      status,
      projectedTotal,
      targetTotal,
      issues,
      summary: buildSummary(status, projectedTotal, targetTotal, issues.length),
    };
  }
}

function buildSummary(
  status: string,
  current: number,
  target: number,
  issueCount: number
): string {
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  if (status === "OK") return `Manuscript is on track at ${current.toLocaleString()} of ${target.toLocaleString()} words (${pct}%).`;
  if (status === "WARNING") return `Manuscript is at ${pct}% of target (${current.toLocaleString()}/${target.toLocaleString()} words) with ${issueCount} chapter issue(s) to address.`;
  return `CRITICAL: Manuscript is only at ${pct}% of target. ${issueCount} chapter(s) need immediate attention.`;
}
