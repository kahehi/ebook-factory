import type { EventType } from "@/types";

// ─── EventService ─────────────────────────────────────────────────────────────

export class EventService {
  async emit<T>(eventType: EventType, projectId: string, payload: T): Promise<void> {
    console.log(`[EventService] ${eventType}`, { projectId, payload });
  }

  async emitProjectCreated(projectId: string, projectTitle: string): Promise<void> {
    await this.emit("project.created", projectId, { projectId, projectTitle });
  }

  async emitPlanGenerated(
    projectId: string,
    chapterCount: number,
    totalTargetWords: number
  ): Promise<void> {
    await this.emit("plan.generated", projectId, { projectId, chapterCount, totalTargetWords });
  }

  async emitChapterGenerated(
    projectId: string,
    chapterId: string,
    chapterOrder: number,
    wordCount: number
  ): Promise<void> {
    await this.emit("chapter.generated", projectId, { projectId, chapterId, chapterOrder, wordCount });
  }

  async emitQaCompleted(
    projectId: string,
    qaRunId: string,
    overallScore: number,
    findingCount: number
  ): Promise<void> {
    await this.emit("qa.completed", projectId, { projectId, qaRunId, overallScore, findingCount });
  }

  async emitManuscriptReady(
    projectId: string,
    version: number,
    wordCount: number
  ): Promise<void> {
    await this.emit("manuscript.ready", projectId, { projectId, version, wordCount });
  }
}

// Singleton instance
export const eventService = new EventService();
