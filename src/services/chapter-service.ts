import { prisma } from "@/lib/prisma";
import { ChapterAgent } from "@/agents/chapter-agent";
import { LengthSupervisorAgent } from "@/agents/length-supervisor-agent";
import type { ChapterResponse } from "@/types";
import type { ChapterOutlineItem } from "@/types";

// ─── ChapterService ───────────────────────────────────────────────────────────

export class ChapterService {
  private chapterAgent = new ChapterAgent();
  private lengthAgent = new LengthSupervisorAgent();

  async getChapters(projectId: string): Promise<ChapterResponse[]> {
    return prisma.chapter.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 5,
        },
      },
    });
  }

  async getChapter(chapterId: string): Promise<ChapterResponse | null> {
    return prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        versions: {
          orderBy: { version: "desc" },
        },
        qaFindings: true,
      },
    });
  }

  async generateChapter(
    projectId: string,
    chapterId: string
  ): Promise<ChapterResponse> {
    // Load chapter with project and plan context
    const chapter = await prisma.chapter.findUniqueOrThrow({
      where: { id: chapterId, projectId },
    });

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });

    const bookPlan = await prisma.bookPlan.findUnique({
      where: { projectId },
    });

    if (!bookPlan) {
      throw new Error("Book plan not found. Please generate a book plan first.");
    }

    // Mark chapter as generating
    await prisma.chapter.update({
      where: { id: chapterId },
      data: { status: "GENERATING" },
    });

    // Get adjacent chapter summaries for context
    const [prevChapter, nextChapter] = await Promise.all([
      chapter.order > 1
        ? prisma.chapter.findFirst({
            where: { projectId, order: chapter.order - 1 },
            select: { summary: true },
          })
        : null,
      prisma.chapter.findFirst({
        where: { projectId, order: chapter.order + 1 },
        select: { goal: true, title: true },
      }),
    ]);

    // Build agent input
    const outline = bookPlan.outline as unknown as ChapterOutlineItem[];

    const agentInput = {
      bookTitle: project.title,
      bookTopic: project.topic,
      bookType: project.bookType,
      targetAudience: project.targetAudience,
      language: project.language,
      tonality: project.tonality,
      globalSummary: bookPlan.globalSummary,
      styleRules: bookPlan.styleRules,
      conceptList: bookPlan.conceptList as string[],
      noGoList: bookPlan.noGoList as string[],
      seriesContext: project.seriesContext ?? undefined,
      outline,
      chapterOrder: chapter.order,
      chapterTitle: chapter.title,
      chapterGoal: chapter.goal,
      targetWordCount: chapter.targetWordCount,
      prevChapterSummary: prevChapter?.summary ?? undefined,
      nextChapterSummary: nextChapter
        ? `${nextChapter.title}: ${nextChapter.goal}`
        : undefined,
    };

    // Generate content
    const output = await this.chapterAgent.generate(agentInput);

    // Determine next version number
    const latestVersion = await prisma.chapterVersion.findFirst({
      where: { chapterId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    // Save version + update chapter
    await prisma.$transaction([
      prisma.chapterVersion.create({
        data: {
          chapterId,
          version: nextVersion,
          content: output.content,
          wordCount: output.wordCount,
          summary: output.summary,
        },
      }),
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          currentContent: output.content,
          summary: output.summary,
          actualWordCount: output.wordCount,
          status: "DRAFT",
        },
      }),
    ]);

    // Update project total word count
    const wordCountResult = await prisma.chapter.aggregate({
      where: { projectId },
      _sum: { actualWordCount: true },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { actualWordCount: wordCountResult._sum.actualWordCount ?? 0 },
    });

    return prisma.chapter.findUniqueOrThrow({
      where: { id: chapterId },
      include: { versions: { orderBy: { version: "desc" }, take: 5 } },
    });
  }

  async rewriteChapter(
    projectId: string,
    chapterId: string,
    instructions?: string
  ): Promise<ChapterResponse> {
    const chapter = await prisma.chapter.findUniqueOrThrow({
      where: { id: chapterId, projectId },
    });

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });

    const bookPlan = await prisma.bookPlan.findUnique({
      where: { projectId },
    });

    if (!bookPlan) {
      throw new Error("Book plan not found.");
    }

    await prisma.chapter.update({
      where: { id: chapterId },
      data: { status: "GENERATING" },
    });

    const [prevChapter, nextChapter] = await Promise.all([
      chapter.order > 1
        ? prisma.chapter.findFirst({
            where: { projectId, order: chapter.order - 1 },
            select: { summary: true },
          })
        : null,
      prisma.chapter.findFirst({
        where: { projectId, order: chapter.order + 1 },
        select: { goal: true, title: true },
      }),
    ]);

    const outline = bookPlan.outline as unknown as ChapterOutlineItem[];

    const agentInput = {
      bookTitle: project.title,
      bookTopic: project.topic,
      bookType: project.bookType,
      targetAudience: project.targetAudience,
      language: project.language,
      tonality: project.tonality,
      globalSummary: bookPlan.globalSummary,
      styleRules: bookPlan.styleRules,
      conceptList: bookPlan.conceptList as string[],
      noGoList: bookPlan.noGoList as string[],
      seriesContext: project.seriesContext ?? undefined,
      outline,
      chapterOrder: chapter.order,
      chapterTitle: chapter.title,
      chapterGoal: chapter.goal,
      targetWordCount: chapter.targetWordCount,
      prevChapterSummary: prevChapter?.summary ?? undefined,
      nextChapterSummary: nextChapter
        ? `${nextChapter.title}: ${nextChapter.goal}`
        : undefined,
      rewriteInstructions: instructions,
    };

    const output = await this.chapterAgent.generate(agentInput);

    const latestVersion = await prisma.chapterVersion.findFirst({
      where: { chapterId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    await prisma.$transaction([
      prisma.chapterVersion.create({
        data: {
          chapterId,
          version: nextVersion,
          content: output.content,
          wordCount: output.wordCount,
          summary: output.summary,
        },
      }),
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          currentContent: output.content,
          summary: output.summary,
          actualWordCount: output.wordCount,
          status: "DRAFT",
        },
      }),
    ]);

    const wordCountResult = await prisma.chapter.aggregate({
      where: { projectId },
      _sum: { actualWordCount: true },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { actualWordCount: wordCountResult._sum.actualWordCount ?? 0 },
    });

    return prisma.chapter.findUniqueOrThrow({
      where: { id: chapterId },
      include: { versions: { orderBy: { version: "desc" }, take: 5 } },
    });
  }

  async updateChapterContent(
    chapterId: string,
    content: string
  ): Promise<ChapterResponse> {
    const wordCount = content
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    const chapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        currentContent: content,
        actualWordCount: wordCount,
        status: "DRAFT",
      },
      include: {
        versions: { orderBy: { version: "desc" }, take: 5 },
      },
    });

    // Update project total
    const projectId = chapter.projectId;
    const wordCountResult = await prisma.chapter.aggregate({
      where: { projectId },
      _sum: { actualWordCount: true },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { actualWordCount: wordCountResult._sum.actualWordCount ?? 0 },
    });

    return chapter;
  }

  async checkLengths(projectId: string) {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });
    const chapters = await prisma.chapter.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        actualWordCount: true,
        targetWordCount: true,
      },
    });

    return this.lengthAgent.check(
      chapters.map((ch) => ({
        id: ch.id,
        title: ch.title,
        wordCount: ch.actualWordCount,
        targetWordCount: ch.targetWordCount,
      })),
      project.targetWordCount
    );
  }
}

export const chapterService = new ChapterService();
