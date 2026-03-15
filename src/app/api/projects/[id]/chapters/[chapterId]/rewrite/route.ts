export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { chapterService } from "@/services/chapter-service";
import { eventService } from "@/services/event-service";
import { GenerateChapterSchema } from "@/types";
import type { ApiResponse, ChapterResponse } from "@/types";

interface RouteParams {
  params: { id: string; chapterId: string };
}

// POST /api/projects/:id/chapters/:chapterId/rewrite
export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ChapterResponse>>> {
  try {
    const body: unknown = await req.json().catch(() => ({}));
    const parsed = GenerateChapterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: null as unknown as ChapterResponse,
          error: "Validation failed",
        },
        { status: 400 }
      );
    }

    const chapter = await chapterService.rewriteChapter(
      params.id,
      params.chapterId,
      parsed.data.instructions
    );

    await eventService.emitChapterGenerated(
      params.id,
      params.chapterId,
      chapter.order,
      chapter.actualWordCount
    );

    return NextResponse.json(
      { success: true, data: chapter, event: "chapter.rewritten" },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `[POST /api/projects/${params.id}/chapters/${params.chapterId}/rewrite]`,
      error
    );
    const message = error instanceof Error ? error.message : "Failed to rewrite chapter";
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
