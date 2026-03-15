export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { qaService } from "@/services/qa-service";
import { eventService } from "@/services/event-service";
import type { ApiResponse, QaRunResponse } from "@/types";

interface RouteParams {
  params: { id: string };
}

// POST /api/projects/:id/run-qa
export async function POST(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<QaRunResponse>>> {
  try {
    const qaRun = await qaService.runQa(params.id);

    await eventService.emitQaCompleted(
      params.id,
      qaRun.id,
      qaRun.overallScore ?? 0,
      qaRun.findings.length
    );

    return NextResponse.json(
      { success: true, data: qaRun, event: "qa.completed" },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[POST /api/projects/${params.id}/run-qa]`, error);
    const message = error instanceof Error ? error.message : "Failed to run QA";
    return NextResponse.json(
      {
        success: false,
        data: null as unknown as QaRunResponse,
        error: message,
      },
      { status: 500 }
    );
  }
}

// GET /api/projects/:id/run-qa
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<QaRunResponse | null>>> {
  try {
    const qaRun = await qaService.getLatestQaRun(params.id);
    return NextResponse.json({ success: true, data: qaRun });
  } catch (error) {
    console.error(`[GET /api/projects/${params.id}/run-qa]`, error);
    return NextResponse.json(
      { success: false, data: null, error: "Failed to fetch QA run" },
      { status: 500 }
    );
  }
}
