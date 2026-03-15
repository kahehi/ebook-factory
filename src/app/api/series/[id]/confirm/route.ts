export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { seriesService } from "@/services/series-service";
import { ConfirmSeriesPlanSchema } from "@/types";
import type { ApiResponse, SeriesResponse } from "@/types";

// POST /api/series/[id]/confirm
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<SeriesResponse>>> {
  try {
    const { id } = await params;
    const body: unknown = await req.json();
    const parsed = ConfirmSeriesPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: null as unknown as SeriesResponse,
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const series = await seriesService.confirmPlan(id, parsed.data);

    return NextResponse.json(
      { success: true, data: series, event: "series.confirmed" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/series/[id]/confirm]", error);
    const message =
      error instanceof Error ? error.message : "Failed to confirm plan";
    return NextResponse.json(
      {
        success: false,
        data: null as unknown as SeriesResponse,
        error: message,
      },
      { status: 500 }
    );
  }
}
