import { NextRequest, NextResponse } from "next/server";
import { qaService } from "@/services/qa-service";
import { ApplyQaFixesSchema } from "@/types";
import type { ApiResponse } from "@/types";

interface RouteParams {
  params: { id: string };
}

interface FixResult {
  fixedCount: number;
}

// POST /api/projects/:id/apply-qa-fixes
export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<FixResult>>> {
  try {
    const body: unknown = await req.json().catch(() => ({}));
    const parsed = ApplyQaFixesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: { fixedCount: 0 },
          error: "Validation failed",
        },
        { status: 400 }
      );
    }

    const result = await qaService.applyQaFixes(params.id, parsed.data.findingIds);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error(`[POST /api/projects/${params.id}/apply-qa-fixes]`, error);
    const message = error instanceof Error ? error.message : "Failed to apply QA fixes";
    return NextResponse.json(
      { success: false, data: { fixedCount: 0 }, error: message },
      { status: 500 }
    );
  }
}
