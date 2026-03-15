import { prisma } from "@/lib/prisma";
import type { CreateProjectInput, ProjectResponse, BookPlan } from "@/types";
import type { ProjectStatus } from "@/types";
import { WORDS_PER_PAGE } from "@/agents/prompt-builder";

// SQLite stores JSON as strings — parse them back to objects on read
function parseBookPlan(bp: BookPlan | null | undefined) {
  if (!bp) return bp;
  return {
    ...bp,
    outline: typeof bp.outline === "string" ? JSON.parse(bp.outline) : bp.outline,
    conceptList: typeof bp.conceptList === "string" ? JSON.parse(bp.conceptList) : bp.conceptList,
    noGoList: typeof bp.noGoList === "string" ? JSON.parse(bp.noGoList) : bp.noGoList,
  };
}

// ─── ProjectService ───────────────────────────────────────────────────────────

export class ProjectService {
  async createProject(data: CreateProjectInput): Promise<ProjectResponse> {
    // Auto-calculate targetWordCount from pages if not provided
    const targetWordCount =
      data.targetWordCount ?? data.targetPageCount * WORDS_PER_PAGE;

    const project = await prisma.project.create({
      data: {
        title: data.title,
        topic: data.topic,
        bookType: data.bookType,
        targetAudience: data.targetAudience,
        language: data.language ?? "German",
        targetPageCount: data.targetPageCount,
        targetWordCount,
        chapterCount: data.chapterCount,
        tonality: data.tonality,
        seriesContext: data.seriesContext ?? null,
        status: "DRAFT",
      },
      include: {
        _count: {
          select: { chapters: true, qaRuns: true },
        },
      },
    });

    return project;
  }

  async getProjects(): Promise<ProjectResponse[]> {
    return prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        bookPlan: true,
        _count: {
          select: { chapters: true, qaRuns: true },
        },
        qaRuns: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            overallScore: true,
            completedAt: true,
            createdAt: true,
          },
        },
      },
    }) as Promise<ProjectResponse[]>;
  }

  async getProjectById(id: string): Promise<ProjectResponse | null> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        bookPlan: true,
        chapters: {
          orderBy: { order: "asc" },
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        },
        qaRuns: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            findings: true,
          },
        },
        _count: {
          select: { chapters: true, qaRuns: true },
        },
      },
    });
    if (!project) return null;
    return {
      ...project,
      bookPlan: parseBookPlan(project.bookPlan as BookPlan | null) as BookPlan | null,
    } as ProjectResponse;
  }

  async updateProjectStatus(id: string, status: ProjectStatus): Promise<ProjectResponse> {
    return prisma.project.update({
      where: { id },
      data: { status },
    }) as Promise<ProjectResponse>;
  }

  async updateActualWordCount(id: string): Promise<void> {
    const result = await prisma.chapter.aggregate({
      where: { projectId: id },
      _sum: { actualWordCount: true },
    });

    await prisma.project.update({
      where: { id },
      data: { actualWordCount: result._sum.actualWordCount ?? 0 },
    });
  }

  async deleteProject(id: string): Promise<void> {
    await prisma.project.delete({ where: { id } });
  }
}

export const projectService = new ProjectService();
