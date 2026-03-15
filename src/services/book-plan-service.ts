import { prisma } from "@/lib/prisma";
import { BookPlannerAgent } from "@/agents/book-planner-agent";
import { distributeWordBudget } from "@/agents/prompt-builder";
import type { BookPlanResponse } from "@/types";

// ─── BookPlanService ──────────────────────────────────────────────────────────

export class BookPlanService {
  private agent = new BookPlannerAgent();

  async generatePlan(projectId: string): Promise<BookPlanResponse> {
    // Load project
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "PLANNING" },
    });

    // Generate plan via agent
    const planResult = await this.agent.plan({
      title: project.title,
      topic: project.topic,
      bookType: project.bookType,
      targetAudience: project.targetAudience,
      language: project.language,
      targetWordCount: project.targetWordCount,
      chapterCount: project.chapterCount,
      tonality: project.tonality,
      seriesContext: project.seriesContext ?? undefined,
    });

    // Upsert the BookPlan record (JSON fields stored as strings in SQLite)
    const bookPlan = await prisma.bookPlan.upsert({
      where: { projectId },
      create: {
        projectId,
        outline: JSON.stringify(planResult.outline),
        globalSummary: planResult.globalSummary,
        styleRules: planResult.styleRules,
        conceptList: JSON.stringify(planResult.conceptList),
        noGoList: JSON.stringify(planResult.noGoList),
      },
      update: {
        outline: JSON.stringify(planResult.outline),
        globalSummary: planResult.globalSummary,
        styleRules: planResult.styleRules,
        conceptList: JSON.stringify(planResult.conceptList),
        noGoList: JSON.stringify(planResult.noGoList),
        generatedAt: new Date(),
      },
    });

    // Create/update chapters from outline
    await this.syncChaptersFromOutline(projectId, planResult.outline);

    // Update project status to GENERATING (ready for chapter gen)
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "GENERATING" },
    });

    return bookPlan;
  }

  async getPlan(projectId: string): Promise<BookPlanResponse | null> {
    return prisma.bookPlan.findUnique({
      where: { projectId },
      include: { project: true },
    });
  }

  calculateChapterBudgets(
    targetWordCount: number,
    chapterCount: number
  ): number[] {
    return distributeWordBudget(targetWordCount, chapterCount);
  }

  private async syncChaptersFromOutline(
    projectId: string,
    outline: Array<{
      order: number;
      title: string;
      goal: string;
      targetWordCount: number;
    }>
  ): Promise<void> {
    // Delete existing chapters (cascade deletes versions)
    await prisma.chapter.deleteMany({ where: { projectId } });

    // Create chapters from outline
    await prisma.chapter.createMany({
      data: outline.map((item) => ({
        projectId,
        order: item.order,
        title: item.title,
        goal: item.goal,
        targetWordCount: item.targetWordCount,
        status: "PENDING",
      })),
    });
  }
}

export const bookPlanService = new BookPlanService();
