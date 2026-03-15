export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { seriesService } from "@/services/series-service";
import type { ApiResponse, SeriesResponse } from "@/types";

// GET /api/series/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<SeriesResponse>>> {
  try {
    const { id } = await params;
    const series = await seriesService.getSeriesById(id);

    if (!series) {
      return NextResponse.json(
        {
          success: false,
          data: null as unknown as SeriesResponse,
          error: "Series not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: series });
  } catch (error) {
    console.error("[GET /api/series/[id]]", error);
    return NextResponse.json(
      {
        success: false,
        data: null as unknown as SeriesResponse,
        error: "Failed to fetch series",
      },
      { status: 500 }
    );
  }
}
