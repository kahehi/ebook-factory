export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

interface RouteParams {
  params: { id: string };
}

interface GenerateChaptersResponse {
  projectId: string;
  chapterIds: string[];
  totalChapters: number;
  message: string;
}

// POST /api/projects/:id/generate-chapters
// This sets up the structure and returns chapter IDs for parallel n8n processing.
// In n8n, call POST /api/projects/:id/chapters/:chapterId/generate for each chapter in parallel.
export async function POST(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<GenerateChaptersResponse>>> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          data: null as unknown as GenerateChaptersResponse,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    const bookPlan = await prisma.bookPlan.findUnique({
      where: { projectId: params.id },
    });

    if (!bookPlan) {
      return NextResponse.json(
        {
          success: false,
          data: null as unknown as GenerateChaptersResponse,
          error: "Book plan not found. Generate a plan first.",
        },
        { status: 400 }
      );
    }

    // Get pending chapters
    const chapters = await prisma.chapter.findMany({
      where: { projectId: params.id },
      orderBy: { order: "asc" },
      select: { id: true, order: true, status: true },
    });

    if (chapters.length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null as unknown as GenerateChaptersResponse,
          error: "No chapters found. The book plan may not have been generated correctly.",
        },
        { status: 400 }
      );
    }

    // Reset pending chapters to PENDING status
    await prisma.chapter.updateMany({
      where: {
        projectId: params.id,
        status: { in: ["PENDING", "NEEDS_REVISION"] },
      },
      data: { status: "PENDING" },
    });

    // Update project status
    await prisma.project.update({
      where: { id: params.id },
      data: { status: "GENERATING" },
    });

    const chapterIds = chapters.map((ch) => ch.id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    return NextResponse.json({
      success: true,
      data: {
        projectId: params.id,
        chapterIds,
        totalChapters: chapters.length,
        message: `Ready to generate ${chapters.length} chapters. Call POST /api/projects/${params.id}/chapters/{chapterId}/generate for each chapter. For n8n: use a SplitInBatches node with the chapterIds array.`,
      },
      event: "chapters.queued",
    });
  } catch (error) {
    console.error(`[POST /api/projects/${params.id}/generate-chapters]`, error);
    return NextResponse.json(
      {
        success: false,
        data: null as unknown as GenerateChaptersResponse,
        error: "Failed to initialize chapter generation",
      },
      { status: 500 }
    );
  }
}
