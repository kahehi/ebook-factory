export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight, BookOpen, Clock, PlusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { calculateProgress, formatDate, formatWordCount } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

async function getAllProjects() {
  try {
    return prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { chapters: true } },
        qaRuns: { orderBy: { createdAt: "desc" }, take: 1, select: { overallScore: true, status: true } },
      },
    });
  } catch { return []; }
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const map: Record<ProjectStatus, { label: string; variant: string }> = {
    DRAFT:      { label: "Entwurf",       variant: "draft" },
    PLANNING:   { label: "Planung",        variant: "planning" },
    GENERATING: { label: "Generierung",   variant: "generating" },
    QA_REVIEW:  { label: "QA-Prüfung",    variant: "qa_review" },
    QA_FIXING:  { label: "QA-Korrektur",  variant: "qa_fixing" },
    COMPLETED:  { label: "Abgeschlossen", variant: "completed" },
    ARCHIVED:   { label: "Archiviert",    variant: "archived" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant as Parameters<typeof Badge>[0]["variant"]}>{label}</Badge>;
}

export default async function ProjectsPage() {
  const projects = await getAllProjects();

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-4)" }}>
            Bibliothek
          </p>
          <h1 className="text-3xl font-800 text-white" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            Projekte
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--fg-4)" }}>
            {projects.length} {projects.length !== 1 ? "Projekte" : "Projekt"} insgesamt
          </p>
        </div>
        <Button asChild className="gap-2 btn-glow">
          <Link href="/projects/new">
            <PlusCircle className="h-4 w-4" />
            Neues Projekt
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--bg-tint)", border: "1px solid var(--border-sm)" }}>
              <BookOpen className="h-7 w-7" style={{ color: "var(--fg-4)" }} />
            </div>
            <h2 className="text-base font-600 text-white" style={{ fontWeight: 600 }}>Noch keine Projekte</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--fg-4)" }}>
              Erstelle dein erstes E-Book-Projekt und lass die KI-Agenten die Arbeit erledigen.
            </p>
            <Button asChild className="mt-6 gap-2">
              <Link href="/projects/new">
                <PlusCircle className="h-4 w-4" />
                Erstes Projekt erstellen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const progress = calculateProgress(project.actualWordCount, project.targetWordCount);
            const qaRun = project.qaRuns[0];

            return (
              <Card key={project.id} className="group hover:border-violet-500/20 transition-all duration-200">
                <CardContent className="pt-5">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-semibold text-white hover:text-violet-300 transition-colors line-clamp-2"
                        >
                          {project.title}
                        </Link>
                        <p className="mt-1 text-xs line-clamp-2" style={{ color: "var(--fg-4)" }}>
                          {project.topic.slice(0, 100)}{project.topic.length > 100 ? "…" : ""}
                        </p>
                      </div>
                      <StatusBadge status={project.status} />
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--fg-5)" }}>
                      <span>{project.bookType}</span>
                      <span>{project.language}</span>
                      <span>{project._count.chapters} Kapitel</span>
                      <span>{project.tonality}</span>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span style={{ color: "var(--fg-3)" }}>
                          {formatWordCount(project.actualWordCount)} Wörter
                        </span>
                        <span style={{ color: "var(--fg-5)" }}>
                          {progress}% von {formatWordCount(project.targetWordCount)}
                        </span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {qaRun?.overallScore != null && (
                          <span
                            className="text-sm font-semibold"
                            style={{ color: qaRun.overallScore >= 80 ? "rgb(52,211,153)" : qaRun.overallScore >= 60 ? "rgb(245,158,11)" : "rgb(251,113,133)" }}
                          >
                            QA: {Math.round(qaRun.overallScore)}/100
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--fg-5)" }}>
                          <Clock className="h-3 w-3" />
                          {formatDate(project.updatedAt)}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
                        <Link href={`/projects/${project.id}`}>
                          Öffnen <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
