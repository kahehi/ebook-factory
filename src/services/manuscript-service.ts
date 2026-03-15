import { prisma } from "@/lib/prisma";
import type { ManuscriptVersionResponse } from "@/types";

// ─── ManuscriptService ────────────────────────────────────────────────────────

export class ManuscriptService {
  async assembleManuscript(projectId: string): Promise<ManuscriptVersionResponse> {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });

    const chapters = await prisma.chapter.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    if (chapters.length === 0) {
      throw new Error("No chapters found to assemble.");
    }

    // Build manuscript content
    const parts: string[] = [];

    // Title page
    parts.push(`# ${project.title}\n`);
    parts.push(`*${project.bookType} | ${project.language} | ${project.targetAudience}*\n`);
    parts.push(`---\n`);

    // Table of contents
    parts.push(`## Table of Contents\n`);
    for (const chapter of chapters) {
      parts.push(`${chapter.order}. ${chapter.title}`);
    }
    parts.push(`\n---\n`);

    // Chapters
    for (const chapter of chapters) {
      parts.push(`\n# Chapter ${chapter.order}: ${chapter.title}\n`);
      if (chapter.currentContent) {
        parts.push(chapter.currentContent);
      } else {
        parts.push(`*[Chapter ${chapter.order} not yet generated]*`);
      }
      parts.push(`\n\n---\n`);
    }

    const content = parts.join("\n");
    const wordCount = content
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    // Determine next version number
    const latestVersion = await prisma.manuscriptVersion.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    // Save manuscript version
    const manuscript = await prisma.manuscriptVersion.create({
      data: {
        projectId,
        version: nextVersion,
        content,
        wordCount,
      },
      include: { project: true },
    });

    // Update project status if all chapters are approved
    const pendingChapters = chapters.filter(
      (ch) => ch.status === "PENDING" || ch.status === "GENERATING"
    );

    if (pendingChapters.length === 0) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          status: "COMPLETED",
          actualWordCount: wordCount,
        },
      });
    }

    return manuscript as ManuscriptVersionResponse;
  }

  async getManuscript(projectId: string): Promise<ManuscriptVersionResponse | null> {
    return prisma.manuscriptVersion.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
      include: { project: true },
    }) as Promise<ManuscriptVersionResponse | null>;
  }

  async getManuscriptHistory(projectId: string): Promise<ManuscriptVersionResponse[]> {
    return prisma.manuscriptVersion.findMany({
      where: { projectId },
      orderBy: { version: "desc" },
    }) as Promise<ManuscriptVersionResponse[]>;
  }
}

export const manuscriptService = new ManuscriptService();
