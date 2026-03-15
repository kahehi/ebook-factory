export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { projectService } from "@/services/project-service";
import type { ApiResponse, ProjectResponse } from "@/types";

interface RouteParams {
  params: { id: string };
}

// GET /api/projects/:id
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ProjectResponse | null>>> {
  try {
    const project = await projectService.getProjectById(params.id);

    if (!project) {
      return NextResponse.json(
        { success: false, data: null, error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error(`[GET /api/projects/${params.id}]`, error);
    return NextResponse.json(
      { success: false, data: null, error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id
export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    await projectService.deleteProject(params.id);
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error(`[DELETE /api/projects/${params.id}]`, error);
    return NextResponse.json(
      { success: false, data: null, error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
