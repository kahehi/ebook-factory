import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  BookOpen,
  Zap,
  CheckCircle2,
  BarChart3,
  PlusCircle,
  ArrowRight,
  Clock,
  Library,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { calculateProgress, formatDate, formatWordCount } from "@/lib/utils";
import type { ProjectStatus, SeriesStatus } from "@/types";

async function getDashboardStats() {
  try {
    const [totalProjects, activeProjects, chapters, qaRuns, totalSeries] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: { in: ["PLANNING", "GENERATING", "QA_REVIEW", "QA_FIXING"] } } }),
      prisma.chapter.count({ where: { status: { not: "PENDING" } } }),
      prisma.qaRun.aggregate({ where: { status: "COMPLETED", overallScore: { not: null } }, _avg: { overallScore: true } }),
      prisma.bookSeries.count(),
    ]);
    return { totalProjects, activeProjects, chaptersGenerated: chapters, avgQaScore: qaRuns._avg.overallScore, totalSeries, dbConnected: true };
  } catch {
    return { totalProjects: 0, activeProjects: 0, chaptersGenerated: 0, avgQaScore: null, totalSeries: 0, dbConnected: false };
  }
}

async function getRecentProjects() {
  try {
    return await prisma.project.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: { qaRuns: { orderBy: { createdAt: "desc" }, take: 1, select: { overallScore: true, status: true } } },
    });
  } catch { return []; }
}

async function getRecentSeries() {
  try {
    return await prisma.bookSeries.findMany({
      take: 3,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { projects: true } } },
    });
  } catch { return []; }
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const map: Record<ProjectStatus, { label: string; variant: string }> = {
    DRAFT:      { label: "Draft",       variant: "draft" },
    PLANNING:   { label: "Planning",    variant: "planning" },
    GENERATING: { label: "Generating",  variant: "generating" },
    QA_REVIEW:  { label: "QA Review",   variant: "qa_review" },
    QA_FIXING:  { label: "QA Fixing",   variant: "qa_fixing" },
    COMPLETED:  { label: "Completed",   variant: "completed" },
    ARCHIVED:   { label: "Archived",    variant: "archived" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant as Parameters<typeof Badge>[0]["variant"]}>{label}</Badge>;
}

function SeriesStatusBadge({ status }: { status: SeriesStatus }) {
  const map: Record<SeriesStatus, string> = {
    PLANNING:  "planning",
    ACTIVE:    "generating",
    COMPLETED: "completed",
    ARCHIVED:  "archived",
  };
  const variantKey = map[status] ?? "secondary";
  return <Badge variant={variantKey as Parameters<typeof Badge>[0]["variant"]}>{status}</Badge>;
}

const statCards = [
  { key: "totalProjects",      label: "Projekte gesamt",    icon: BookOpen,     iconColor: "var(--fg-3)",    sub: "Alle" },
  { key: "activeProjects",     label: "Aktiv",              icon: Zap,          iconColor: "rgba(245,158,11,0.7)",   sub: "In Bearbeitung" },
  { key: "totalSeries",        label: "Serien",             icon: Library,      iconColor: "var(--accent)",  sub: "Mehrbändig" },
  { key: "chaptersGenerated",  label: "Kapitel",            icon: BarChart3,    iconColor: "rgba(52,211,153,0.7)",   sub: "Generiert" },
];

export default async function DashboardPage() {
  const [stats, recentProjects, recentSeries] = await Promise.all([
    getDashboardStats(),
    getRecentProjects(),
    getRecentSeries(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-up">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-4)" }}>
            Overview
          </p>
          <h1 className="text-3xl font-800 text-white" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            Übersicht
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--fg-3)" }}>
            KI-gestützte E-Book-Produktionspipeline
          </p>
        </div>
        <Button asChild className="gap-2 btn-glow">
          <Link href="/projects/new">
            <PlusCircle className="h-4 w-4" />
            Neues Projekt
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 animate-fade-up delay-1">
        {statCards.map(({ key, label, icon: Icon, iconColor, sub }) => {
          const value = stats[key as keyof typeof stats];
          return (
            <Card key={key} className="group">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-xs font-medium" style={{ color: "var(--fg-3)" }}>
                  {label}
                </CardTitle>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
                  style={{ background: "var(--bg-tint)" }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
                </div>
              </CardHeader>
              <CardContent className="pb-5">
                <p className="stat-value text-4xl font-800" style={{ fontWeight: 800 }}>
                  {value ?? "—"}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--fg-5)" }}>{sub}</p>
              </CardContent>
            </Card>
          );
        })}

        {/* QA Score card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-medium" style={{ color: "var(--fg-3)" }}>
              Ø QA-Bewertung
            </CardTitle>
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "rgba(52,211,153,0.1)" }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "rgba(52,211,153,0.8)" }} />
            </div>
          </CardHeader>
          <CardContent className="pb-5">
            <p className="stat-value text-4xl font-800" style={{ fontWeight: 800 }}>
              {stats.avgQaScore != null ? Math.round(stats.avgQaScore) : "—"}
              {stats.avgQaScore != null && (
                <span className="text-lg" style={{ color: "var(--fg-5)" }}>/100</span>
              )}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--fg-5)" }}>Abgeschlossene QA-Läufe</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Series */}
      {recentSeries.length > 0 && (
        <div className="animate-fade-up delay-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-700 text-white" style={{ fontWeight: 700 }}>Aktuelle Serien</h2>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
              <Link href="/series" style={{ color: "var(--fg-3)" }}>
                Alle ansehen <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentSeries.map((series) => (
              <Card key={series.id} className="group hover:border-violet-500/25 transition-all duration-200">
                <CardContent className="p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-600 text-white" style={{ fontWeight: 600 }}>
                      {series.title}
                    </h3>
                    <SeriesStatusBadge status={series.status as SeriesStatus} />
                  </div>
                  <p className="mb-4 line-clamp-2 text-xs" style={{ color: "var(--fg-3)" }}>
                    {series.topic}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--fg-5)" }}>
                      {series._count.projects === 1 ? "1 book" : `${series._count.projects} books`}
                    </span>
                    <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                      <Link href={`/series/${series.id}`}>
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Projects */}
      <div className="animate-fade-up delay-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-700 text-white" style={{ fontWeight: 700 }}>Aktuelle Projekte</h2>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
            <Link href="/projects" style={{ color: "var(--fg-3)" }}>
              Alle ansehen <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        {recentProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: "var(--bg-tint)", border: "1px solid var(--border-sm)" }}
              >
                <BookOpen className="h-7 w-7" style={{ color: "var(--fg-4)" }} />
              </div>
              <h3 className="text-base font-600 text-white" style={{ fontWeight: 600 }}>Noch keine Projekte</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--fg-3)" }}>
                Erstelle dein erstes E-Book, um loszulegen.
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
          <Card>
            <div className="overflow-hidden rounded-xl">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-xs)" }}>
                    {["Projekt", "Status", "Fortschritt", "QA", "Aktualisiert", ""].map((h, i) => (
                      <th
                        key={h + i}
                        className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-widest"
                        style={{ color: "var(--fg-5)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((project, idx) => {
                    const progress = calculateProgress(project.actualWordCount, project.targetWordCount);
                    const latestQaRun = project.qaRuns[0];

                    return (
                      <tr
                        key={project.id}
                        className="transition-colors hover:bg-white/2"
                        style={idx < recentProjects.length - 1 ? { borderBottom: "1px solid var(--border-xs)" } : undefined}
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">{project.title}</p>
                          <p className="mt-0.5 text-xs" style={{ color: "var(--fg-5)" }}>
                            {project.bookType} · {project.language} · {project.chapterCount} Kap.
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={project.status as ProjectStatus} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="min-w-[130px]">
                            <div className="mb-1.5 flex items-center justify-between text-xs">
                              <span style={{ color: "var(--fg-2)" }}>{formatWordCount(project.actualWordCount)}</span>
                              <span style={{ color: "var(--fg-5)" }}>/ {formatWordCount(project.targetWordCount)}</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {latestQaRun?.overallScore != null ? (
                            <span
                              className="text-sm font-semibold"
                              style={{
                                color: latestQaRun.overallScore >= 80
                                  ? "rgb(52,211,153)"
                                  : latestQaRun.overallScore >= 60
                                  ? "rgb(245,158,11)"
                                  : "rgb(251,113,133)",
                              }}
                            >
                              {Math.round(latestQaRun.overallScore)}<span style={{ color: "var(--fg-5)", fontWeight: 400 }}>/100</span>
                            </span>
                          ) : (
                            <span style={{ color: "var(--fg-5)" }}>—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--fg-5)" }}>
                            <Clock className="h-3 w-3" />
                            {formatDate(project.updatedAt)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button asChild variant="outline" size="sm" className="h-7 gap-1 text-xs">
                            <Link href={`/projects/${project.id}`}>
                              Open <ArrowRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
