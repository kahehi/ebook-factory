import { prisma } from "@/lib/prisma";
import { QaCohesionAgent } from "@/agents/qa-cohesion-agent";
import type { QaRunResponse } from "@/types";
import type { ChapterOutlineItem } from "@/types";

// ─── QaService ────────────────────────────────────────────────────────────────

export class QaService {
  private agent = new QaCohesionAgent();

  async runQa(projectId: string): Promise<QaRunResponse> {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });

    const bookPlan = await prisma.bookPlan.findUnique({
      where: { projectId },
    });

    if (!bookPlan) {
      throw new Error("Book plan required to run QA. Generate a plan first.");
    }

    const chapters = await prisma.chapter.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    if (chapters.length === 0) {
      throw new Error("No chapters found. Generate chapters before running QA.");
    }

    // Create QA run record
    const qaRun = await prisma.qaRun.create({
      data: {
        projectId,
        status: "RUNNING",
      },
      include: { findings: true },
    });

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "QA_REVIEW" },
    });

    try {
      // Run agent analysis
      const result = await this.agent.analyze({
        projectId,
        bookTitle: project.title,
        bookTopic: project.topic,
        targetAudience: project.targetAudience,
        language: project.language,
        tonality: project.tonality,
        globalSummary: bookPlan.globalSummary,
        styleRules: bookPlan.styleRules,
        conceptList: bookPlan.conceptList as string[],
        noGoList: bookPlan.noGoList as string[],
        targetWordCount: project.targetWordCount,
        chapters: chapters.map((ch) => ({
          id: ch.id,
          order: ch.order,
          title: ch.title,
          goal: ch.goal,
          content: ch.currentContent ?? "",
          wordCount: ch.actualWordCount,
          targetWordCount: ch.targetWordCount,
        })),
      });

      // Save findings
      if (result.findings.length > 0) {
        await prisma.qaFinding.createMany({
          data: result.findings.map((f) => ({
            qaRunId: qaRun.id,
            chapterId: f.chapterId ?? null,
            findingType: f.findingType,
            severity: f.severity,
            description: f.description,
            suggestion: f.suggestion,
            status: "OPEN" as const,
          })),
        });
      }

      // Mark run as completed
      const completedRun = await prisma.qaRun.update({
        where: { id: qaRun.id },
        data: {
          status: "COMPLETED",
          overallScore: result.overallScore,
          completedAt: new Date(),
        },
        include: { findings: true },
      });

      return completedRun;
    } catch (error) {
      // Mark run as failed
      await prisma.qaRun.update({
        where: { id: qaRun.id },
        data: { status: "FAILED" },
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { status: "GENERATING" },
      });

      throw error;
    }
  }

  async getLatestQaRun(projectId: string): Promise<QaRunResponse | null> {
    return prisma.qaRun.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        findings: {
          orderBy: [{ severity: "desc" }, { findingType: "asc" }],
        },
      },
    });
  }

  async getAllQaRuns(projectId: string): Promise<QaRunResponse[]> {
    return prisma.qaRun.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        findings: {
          orderBy: [{ severity: "desc" }, { findingType: "asc" }],
        },
      },
    });
  }

  async applyQaFixes(
    projectId: string,
    findingIds?: string[]
  ): Promise<{ fixedCount: number }> {
    // Mark findings as ACKNOWLEDGED (in a real system, this would trigger rewrites)
    const whereClause = findingIds
      ? { id: { in: findingIds } }
      : {
          qaRun: { projectId },
          status: "OPEN" as const,
        };

    const result = await prisma.qaFinding.updateMany({
      where: whereClause,
      data: { status: "ACKNOWLEDGED" },
    });

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "QA_FIXING" },
    });

    return { fixedCount: result.count };
  }

  async acknowledgeFinding(findingId: string): Promise<void> {
    await prisma.qaFinding.update({
      where: { id: findingId },
      data: { status: "ACKNOWLEDGED" },
    });
  }

  async ignoreFinding(findingId: string): Promise<void> {
    await prisma.qaFinding.update({
      where: { id: findingId },
      data: { status: "IGNORED" },
    });
  }
}

export const qaService = new QaService();
