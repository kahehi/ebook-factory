import type { EventType, WebhookEvent } from "@/types";

// ─── EventService ─────────────────────────────────────────────────────────────

export class EventService {
  private webhookUrl: string | undefined;

  constructor() {
    this.webhookUrl = process.env.WEBHOOK_URL;
  }

  async emit<T>(eventType: EventType, projectId: string, payload: T): Promise<void> {
    const event: WebhookEvent<T> = {
      eventType,
      timestamp: new Date().toISOString(),
      projectId,
      payload,
    };

    // Always log the event
    console.log(`[EventService] Event emitted: ${eventType}`, {
      projectId,
      timestamp: event.timestamp,
    });

    // Send to n8n webhook if configured
    if (this.webhookUrl) {
      try {
        const response = await fetch(this.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Event-Type": eventType,
            "X-Project-Id": projectId,
          },
          body: JSON.stringify(event),
        });

        if (!response.ok) {
          console.error(
            `[EventService] Webhook delivery failed: ${response.status} ${response.statusText}`
          );
        } else {
          console.log(`[EventService] Webhook delivered successfully: ${eventType}`);
        }
      } catch (error) {
        // Non-fatal: log error but don't throw
        console.error("[EventService] Webhook delivery error:", error);
      }
    } else {
      console.log("[EventService] No WEBHOOK_URL configured — event logged only");
    }
  }

  async emitProjectCreated(projectId: string, projectTitle: string): Promise<void> {
    await this.emit("project.created", projectId, {
      projectId,
      projectTitle,
      apiUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/projects/${projectId}`,
      planUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/projects/${projectId}/plan`,
    });
  }

  async emitPlanGenerated(
    projectId: string,
    chapterCount: number,
    totalTargetWords: number
  ): Promise<void> {
    await this.emit("plan.generated", projectId, {
      projectId,
      chapterCount,
      totalTargetWords,
      generateChaptersUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/projects/${projectId}/generate-chapters`,
    });
  }

  async emitChapterGenerated(
    projectId: string,
    chapterId: string,
    chapterOrder: number,
    wordCount: number
  ): Promise<void> {
    await this.emit("chapter.generated", projectId, {
      projectId,
      chapterId,
      chapterOrder,
      wordCount,
      chapterUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/projects/${projectId}/chapters/${chapterId}/generate`,
    });
  }

  async emitQaCompleted(
    projectId: string,
    qaRunId: string,
    overallScore: number,
    findingCount: number
  ): Promise<void> {
    await this.emit("qa.completed", projectId, {
      projectId,
      qaRunId,
      overallScore,
      findingCount,
      applyFixesUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/projects/${projectId}/apply-qa-fixes`,
    });
  }

  async emitManuscriptReady(
    projectId: string,
    version: number,
    wordCount: number
  ): Promise<void> {
    await this.emit("manuscript.ready", projectId, {
      projectId,
      version,
      wordCount,
      manuscriptUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/projects/${projectId}/manuscript`,
    });
  }
}

// Singleton instance
export const eventService = new EventService();
