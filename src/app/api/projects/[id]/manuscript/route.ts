export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { manuscriptService } from "@/services/manuscript-service";
import { eventService } from "@/services/event-service";
import type { ApiResponse, ManuscriptVersionResponse } from "@/types";

interface RouteParams {
  params: { id: string };
}

// GET /api/projects/:id/manuscript
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ManuscriptVersionResponse | null>>> {
  try {
    const manuscript = await manuscriptService.getManuscript(params.id);
    return NextResponse.json({ success: true, data: manuscript });
  } catch (error) {
    console.error(`[GET /api/projects/${params.id}/manuscript]`, error);
    return NextResponse.json(
      { success: false, data: null, error: "Failed to fetch manuscript" },
      { status: 500 }
    );
  }
}

// POST /api/projects/:id/manuscript (assemble new version)
export async function POST(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ManuscriptVersionResponse>>> {
  try {
    const manuscript = await manuscriptService.assembleManuscript(params.id);

    await eventService.emitManuscriptReady(
      params.id,
      manuscript.version,
      manuscript.wordCount
    );

    return NextResponse.json(
      { success: true, data: manuscript, event: "manuscript.ready" },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[POST /api/projects/${params.id}/manuscript]`, error);
    const message = error instanceof Error ? error.message : "Failed to assemble manuscript";
    return NextResponse.json(
      {
        success: false,
        data: null as unknown as ManuscriptVersionResponse,
        error: message,
      },
      { status: 500 }
    );
  }
}
