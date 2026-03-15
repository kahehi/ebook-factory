import { NextRequest, NextResponse } from "next/server";
import { seriesService } from "@/services/series-service";
import { CreateSeriesSchema } from "@/types";
import type { ApiResponse, SeriesResponse } from "@/types";

// GET /api/series
export async function GET(): Promise<NextResponse<ApiResponse<SeriesResponse[]>>> {
  try {
    const allSeries = await seriesService.getSeries();
    return NextResponse.json({ success: true, data: allSeries });
  } catch (error) {
    console.error("[GET /api/series]", error);
    return NextResponse.json(
      { success: false, data: [], error: "Failed to fetch series" },
      { status: 500 }
    );
  }
}

// POST /api/series
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<SeriesResponse>>> {
  try {
    const body: unknown = await req.json();
    const parsed = CreateSeriesSchema.safeParse(body);

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

    const series = await seriesService.createSeries(parsed.data);

    return NextResponse.json(
      { success: true, data: series, event: "series.created" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/series]", error);
    return NextResponse.json(
      {
        success: false,
        data: null as unknown as SeriesResponse,
        error: "Failed to create series",
      },
      { status: 500 }
    );
  }
}
