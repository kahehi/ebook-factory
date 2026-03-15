export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { chapterService } from "@/services/chapter-service";
import { eventService } from "@/services/event-service";
import type { ApiResponse, ChapterResponse } from "@/types";

interface RouteParams {
  params: { id: string; chapterId: string };
}

// POST /api/projects/:id/chapters/:chapterId/generate
export async function POST(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ChapterResponse>>> {
  try {
    const chapter = await chapterService.generateChapter(params.id, params.chapterId);

    await eventService.emitChapterGenerated(
      params.id,
      params.chapterId,
      chapter.order,
      chapter.actualWordCount
    );

    return NextResponse.json(
      { success: true, data: chapter, event: "chapter.generated" },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      `[POST /api/projects/${params.id}/chapters/${params.chapterId}/generate]`,
      error
    );
    const message = error instanceof Error ? error.message : "Failed to generate chapter";
    return NextResponse.json(
      {
        success: false,
        data: null as unknown as ChapterResponse,
        error: message,
      },
      { status: 500 }
    );
  }
}
