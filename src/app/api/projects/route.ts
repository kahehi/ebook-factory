import { NextRequest, NextResponse } from "next/server";
import { projectService } from "@/services/project-service";
import { eventService } from "@/services/event-service";
import { CreateProjectSchema } from "@/types";
import type { ApiResponse, ProjectResponse } from "@/types";

// GET /api/projects
export async function GET(): Promise<NextResponse<ApiResponse<ProjectResponse[]>>> {
  try {
    const projects = await projectService.getProjects();
    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error("[GET /api/projects]", error);
    return NextResponse.json(
      { success: false, data: [], error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<ProjectResponse>>> {
  try {
    const body: unknown = await req.json();
    const parsed = CreateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: null as unknown as ProjectResponse,
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const project = await projectService.createProject(parsed.data);

    // Emit event (non-blocking)
    await eventService.emitProjectCreated(project.id, project.title);

    return NextResponse.json(
      { success: true, data: project, event: "project.created" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/projects]", error);
    return NextResponse.json(
      {
        success: false,
        data: null as unknown as ProjectResponse,
        error: "Failed to create project",
      },
      { status: 500 }
    );
  }
}
