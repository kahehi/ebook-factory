export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { bookPlanService } from "@/services/book-plan-service";
import { eventService } from "@/services/event-service";
import { prisma } from "@/lib/prisma";
import type { ApiResponse, BookPlanResponse } from "@/types";

interface RouteParams {
  params: { id: string };
}

// POST /api/projects/:id/plan
export async function POST(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<BookPlanResponse>>> {
  try {
    const bookPlan = await bookPlanService.generatePlan(params.id);

    const outline = (typeof bookPlan.outline === "string" ? JSON.parse(bookPlan.outline) : bookPlan.outline) as Array<{ targetWordCount: number }>;
    const totalTargetWords = outline.reduce(
      (sum, ch) => sum + (ch.targetWordCount ?? 0),
      0
    );

    await eventService.emitPlanGenerated(
      params.id,
      outline.length,
      totalTargetWords
    );

    return NextResponse.json(
      { success: true, data: bookPlan, event: "plan.generated" },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[POST /api/projects/${params.id}/plan]`, error);
    const message = error instanceof Error ? error.message : "Failed to generate plan";
    return NextResponse.json(
      {
        success: false,
        data: null as unknown as BookPlanResponse,
        error: message,
      },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/:id/plan — update editable plan fields
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<BookPlanResponse>>> {
  try {
    const body = await req.json();
    const { styleRules, conceptList, noGoList } = body as {
      styleRules?: string;
      conceptList?: string[];
      noGoList?: string[];
    };

    const updated = await prisma.bookPlan.update({
      where: { projectId: params.id },
      data: {
        ...(styleRules !== undefined && { styleRules }),
        ...(conceptList !== undefined && { conceptList: JSON.stringify(conceptList) }),
        ...(noGoList !== undefined && { noGoList: JSON.stringify(noGoList) }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error(`[PATCH /api/projects/${params.id}/plan]`, error);
    return NextResponse.json(
      { success: false, data: null as unknown as BookPlanResponse, error: "Fehler beim Speichern" },
      { status: 500 }
    );
  }
}

// GET /api/projects/:id/plan
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<BookPlanResponse | null>>> {
  try {
    const plan = await bookPlanService.getPlan(params.id);

    if (!plan) {
      return NextResponse.json(
        { success: false, data: null, error: "Plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error(`[GET /api/projects/${params.id}/plan]`, error);
    return NextResponse.json(
      { success: false, data: null, error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
