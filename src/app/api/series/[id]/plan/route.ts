import { NextRequest, NextResponse } from "next/server";
import { seriesService } from "@/services/series-service";
import type { ApiResponse, SeriesPlanSuggestion } from "@/types";

// POST /api/series/[id]/plan
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<SeriesPlanSuggestion>>> {
  try {
    const { id } = await params;
    const suggestion = await seriesService.generatePlan(id);

    return NextResponse.json({ success: true, data: suggestion });
  } catch (error) {
    console.error("[POST /api/series/[id]/plan]", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate plan";
    return NextResponse.json(
      {
        success: false,
        data: null as unknown as SeriesPlanSuggestion,
        error: message,
      },
      { status: 500 }
    );
  }
}
