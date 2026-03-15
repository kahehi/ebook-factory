export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: { id: string; chapterId: string };
}

// PATCH /api/projects/:id/chapters/:chapterId — update chapter status
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { status } = await req.json();
    const validStatuses = ["PENDING", "GENERATING", "DRAFT", "REVIEWING", "APPROVED", "NEEDS_REVISION"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, data: null, error: "Invalid status" }, { status: 400 });
    }

    const chapter = await prisma.chapter.update({
      where: { id: params.chapterId, projectId: params.id },
      data: { status },
    });

    return NextResponse.json({ success: true, data: chapter });
  } catch (error) {
    console.error(`[PATCH /api/projects/${params.id}/chapters/${params.chapterId}]`, error);
    return NextResponse.json({ success: false, data: null, error: "Failed to update chapter" }, { status: 500 });
  }
}
