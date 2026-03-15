"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Wand2,
  AlertTriangle,
  Download,
  Clock,
  Sparkles,
  Pencil,
  Save,
  X,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { calculateProgress, formatDate, formatWordCount } from "@/lib/utils";
import type { ProjectResponse } from "@/types";
import type { ProjectStatus, ChapterStatus, QaFindingType, Severity } from "@/types";
import { useBreadcrumb } from "@/lib/breadcrumb-store";

type Tab = "overview" | "plan" | "chapters" | "qa" | "export";

interface GenerationState {
  active: boolean;
  total: number;
  current: number; // 1-based index of chapter currently being generated
  phase: "plan" | "chapters" | "qa" | "manuscript" | null;
}

interface LiveStream {
  chapterId: string;
  text: string;
  wordCount: number;
}

// ─── Status Badges ─────────────────────────────────────────────────────────────

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

function ChapterStatusBadge({ status }: { status: ChapterStatus }) {
  const map: Record<ChapterStatus, { label: string; color: string }> = {
    PENDING:        { label: "Ausstehend",         color: "text-zinc-500 bg-zinc-800/60" },
    GENERATING:     { label: "Wird generiert…",    color: "text-violet-300 bg-violet-900/30" },
    DRAFT:          { label: "Entwurf",             color: "text-amber-300 bg-amber-900/30" },
    REVIEWING:      { label: "In Prüfung",         color: "text-blue-300 bg-blue-900/30" },
    APPROVED:       { label: "Genehmigt",          color: "text-emerald-300 bg-emerald-900/30" },
    NEEDS_REVISION: { label: "Überarbeitung nötig",color: "text-red-300 bg-red-900/30" },
  };
  const { label, color } = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, string> = {
    LOW: "low", MEDIUM: "medium", HIGH: "high", CRITICAL: "critical",
  };
  const labels: Record<Severity, string> = {
    LOW: "Niedrig", MEDIUM: "Mittel", HIGH: "Hoch", CRITICAL: "Kritisch",
  };
  return (
    <Badge variant={map[severity] as Parameters<typeof Badge>[0]["variant"]}>
      {labels[severity]}
    </Badge>
  );
}

function FindingTypeBadge({ type }: { type: QaFindingType }) {
  const labels: Record<string, string> = {
    RED_THREAD:   "Roter Faden",
    TRANSITION:   "Übergang",
    CONSISTENCY:  "Konsistenz",
    REPETITION:   "Wiederholung",
    WORD_COUNT:   "Wortanzahl",
    COMPLETENESS: "Vollständigkeit",
    TONALITY:     "Tonalität",
    SPELLING:     "Rechtschreibung",
    GRAMMAR:      "Grammatik",
    FORMATTING:   "Formatierung",
    CITATION:     "Zitierung",
  };
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-zinc-800/80 text-zinc-300">
      {labels[type]}
    </span>
  );
}

// ─── Live Generation Progress Panel ───────────────────────────────────────────

function GenerationProgressPanel({
  gen,
  project,
  liveStream,
}: {
  gen: GenerationState;
  project: ProjectResponse;
  liveStream: LiveStream | null;
}) {
  const phaseLabels: Record<NonNullable<GenerationState["phase"]>, string> = {
    plan:      "Buchplan wird erstellt…",
    chapters:  "Kapitel werden generiert…",
    qa:        "QA-Analyse läuft…",
    manuscript:"Manuskript wird zusammengefügt…",
  };

  const phaseIcons: Record<NonNullable<GenerationState["phase"]>, React.ReactNode> = {
    plan:      <Wand2 className="h-4 w-4" />,
    chapters:  <Sparkles className="h-4 w-4" />,
    qa:        <ShieldCheck className="h-4 w-4" />,
    manuscript:<Download className="h-4 w-4" />,
  };

  if (!gen.phase) return null;

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        background: "var(--bg-tint)",
        border: "1px solid var(--border-md)",
      }}
    >
      {/* Phase header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "var(--bg-tint-md)", color: "var(--fg-accent)" }}
        >
          {phaseIcons[gen.phase]}
        </div>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-sm font-semibold text-white">{phaseLabels[gen.phase]}</span>
          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--fg-3)" }} />
        </div>
        {gen.phase === "chapters" && gen.total > 0 && (
          <span className="text-xs font-mono" style={{ color: "var(--fg-4)" }}>
            {gen.current} / {gen.total}
          </span>
        )}
      </div>

      {/* Chapter-level progress */}
      {gen.phase === "chapters" && gen.total > 0 && (
        <>
          {/* Overall bar */}
          <div>
            <Progress value={Math.round((gen.current / gen.total) * 100)} className="h-1.5" />
          </div>

          {/* Per-chapter list */}
          <div className="space-y-1.5">
            {project.chapters?.map((ch, idx) => {
              const isActive = idx + 1 === gen.current;
              const isDone = ch.status !== "PENDING" && ch.status !== "GENERATING";
              const isGenerating = ch.status === "GENERATING" || isActive;

              return (
                <div
                  key={ch.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2"
                  style={{
                    background: isActive
                      ? "var(--bg-tint-md)"
                      : isDone
                      ? "rgba(52,211,153,0.05)"
                      : "rgba(255,255,255,0.02)",
                  }}
                >
                  {/* Status icon */}
                  <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4" style={{ color: "rgb(52,211,153)" }} />
                    ) : isGenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--fg-accent)" }} />
                    ) : (
                      <Clock className="h-3.5 w-3.5" style={{ color: "var(--fg-5)" }} />
                    )}
                  </div>

                  {/* Chapter info */}
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-xs font-medium truncate block"
                      style={{
                        color: isDone
                          ? "var(--fg-2)"
                          : isGenerating
                          ? "var(--fg-1)"
                          : "var(--fg-5)",
                      }}
                    >
                      Kap. {ch.order}: {ch.title}
                    </span>
                  </div>

                  {/* Word count or status */}
                  <div className="shrink-0 text-xs font-mono" style={{ color: "var(--fg-4)" }}>
                    {isDone && ch.actualWordCount > 0
                      ? `${ch.actualWordCount.toLocaleString("de-DE")} W`
                      : isGenerating && liveStream?.chapterId === ch.id && liveStream.wordCount > 0
                      ? <span style={{ color: "var(--fg-accent)" }}>{liveStream.wordCount.toLocaleString("de-DE")} W…</span>
                      : isGenerating
                      ? <span style={{ color: "var(--fg-accent)" }}>läuft…</span>
                      : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

// ─── Plan Editing State ────────────────────────────────────────────────────────

interface PlanDraft {
  styleRules: string;
  conceptList: string[];
  noGoList: string[];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { setProjectTitle } = useBreadcrumb();

  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [gen, setGen] = useState<GenerationState>({ active: false, total: 0, current: 0, phase: null });
  const [liveStream, setLiveStream] = useState<LiveStream | null>(null);

  // Plan editing state
  const [planEditMode, setPlanEditMode] = useState(false);
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null);
  const [planSaving, setPlanSaving] = useState(false);
  const [newConceptInput, setNewConceptInput] = useState("");
  const [newNoGoInput, setNewNoGoInput] = useState("");

  async function loadProject() {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.data);
        setProjectTitle(data.data.title);
      }
    } catch (err) {
      console.error("Fehler beim Laden des Projekts", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProject();
    return () => setProjectTitle(null);
  }, [projectId]);

  async function handleGeneratePlan() {
    setActionLoading("plan");
    setGen({ active: true, total: 0, current: 0, phase: "plan" });
    try {
      const res = await fetch(`/api/projects/${projectId}/plan`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await loadProject();
        setActiveTab("plan");
      }
    } finally {
      setActionLoading(null);
      setGen({ active: false, total: 0, current: 0, phase: null });
    }
  }

  async function streamChapter(chapId: string): Promise<void> {
    return new Promise((resolve) => {
      setLiveStream({ chapterId: chapId, text: "", wordCount: 0 });

      fetch(`/api/projects/${projectId}/chapters/${chapId}/stream`)
        .then((res) => {
          if (!res.body) { resolve(); return; }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          function pump(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) { resolve(); return; }
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                try {
                  const event = JSON.parse(line.slice(6)) as { type: string; text?: string; wordCount?: number };
                  if (event.type === "chunk" && event.text) {
                    setLiveStream((prev) => {
                      if (!prev) return prev;
                      const newText = prev.text + event.text!;
                      const wc = newText.trim().split(/\s+/).filter(Boolean).length;
                      return { ...prev, text: newText, wordCount: wc };
                    });
                  } else if (event.type === "done" || event.type === "error") {
                    resolve();
                    return;
                  }
                } catch {}
              }
              return pump();
            });
          }

          pump().catch(() => resolve());
        })
        .catch(() => resolve());
    });
  }

  async function handleGenerateChapters() {
    setActionLoading("chapters");
    setGen({ active: true, total: 0, current: 0, phase: "chapters" });
    try {
      const setupRes = await fetch(`/api/projects/${projectId}/generate-chapters`, { method: "POST" });
      const setupData = await setupRes.json();
      if (!setupData.success) return;

      const { chapterIds } = setupData.data as { chapterIds: string[] };
      setGen({ active: true, total: chapterIds.length, current: 0, phase: "chapters" });
      setActiveTab("chapters");

      for (let i = 0; i < chapterIds.length; i++) {
        setGen(prev => ({ ...prev, current: i + 1 }));
        await streamChapter(chapterIds[i]);
        setLiveStream(null);
        await loadProject();
      }
    } finally {
      setActionLoading(null);
      setGen({ active: false, total: 0, current: 0, phase: null });
      setLiveStream(null);
    }
  }

  async function handleRunQa() {
    setActionLoading("qa");
    setGen({ active: true, total: 0, current: 0, phase: "qa" });
    try {
      const res = await fetch(`/api/projects/${projectId}/run-qa`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await loadProject();
        setActiveTab("qa");
      }
    } finally {
      setActionLoading(null);
      setGen({ active: false, total: 0, current: 0, phase: null });
    }
  }

  async function handleGenerateChapter(chapterId: string) {
    setActionLoading(`chapter-${chapterId}`);
    try {
      await streamChapter(chapterId);
      setLiveStream(null);
      await loadProject();
    } finally {
      setActionLoading(null);
    }
  }

  function enterPlanEditMode() {
    if (!project?.bookPlan) return;
    setPlanDraft({
      styleRules: project.bookPlan.styleRules ?? "",
      conceptList: (project.bookPlan.conceptList as unknown as string[]) ?? [],
      noGoList: (project.bookPlan.noGoList as unknown as string[]) ?? [],
    });
    setPlanEditMode(true);
  }

  function cancelPlanEdit() {
    setPlanEditMode(false);
    setPlanDraft(null);
    setNewConceptInput("");
    setNewNoGoInput("");
  }

  async function savePlan() {
    if (!planDraft) return;
    setPlanSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleRules: planDraft.styleRules,
          conceptList: planDraft.conceptList,
          noGoList: planDraft.noGoList,
        }),
      });
      await loadProject();
      setPlanEditMode(false);
      setPlanDraft(null);
    } finally {
      setPlanSaving(false);
    }
  }

  async function handleAssembleManuscript() {
    setActionLoading("manuscript");
    setGen({ active: true, total: 0, current: 0, phase: "manuscript" });
    try {
      await fetch(`/api/projects/${projectId}/manuscript`, { method: "POST" });
      await loadProject();
      setActiveTab("export");
    } finally {
      setActionLoading(null);
      setGen({ active: false, total: 0, current: 0, phase: null });
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--fg-4)" }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p style={{ color: "var(--fg-3)" }}>Projekt nicht gefunden</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  const progress = calculateProgress(project.actualWordCount, project.targetWordCount);
  const latestQaRun = project.qaRuns?.[0];
  const outline = project.bookPlan?.outline as unknown as Array<{
    order: number; title: string; goal: string; keyPoints: string[]; targetWordCount: number;
  }> | undefined;

  const tabs: Array<{ id: Tab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: "overview",  label: "Übersicht", icon: BookOpen },
    { id: "plan",      label: "Plan",      icon: FileText },
    { id: "chapters",  label: "Kapitel",   icon: ChevronRight },
    { id: "qa",        label: "QA",        icon: ShieldCheck },
    { id: "export",    label: "Export",    icon: Download },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="mt-0.5"
            style={{ color: "var(--fg-4)" }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-800 text-white" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
                {project.title}
              </h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--fg-4)" }}>
              {project.bookType} · {project.language} · {project.chapterCount} Kapitel ·{" "}
              {formatWordCount(project.targetWordCount)} Zielwörter
            </p>
          </div>
        </div>

        {/* Primary action */}
        <div className="flex shrink-0 gap-2">
          {project.status === "DRAFT" && (
            <Button onClick={handleGeneratePlan} disabled={actionLoading !== null} className="gap-2">
              {actionLoading === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Plan erstellen
            </Button>
          )}
          {(project.status === "GENERATING" || project.status === "PLANNING") && project.bookPlan && (
            <Button onClick={handleGenerateChapters} disabled={actionLoading !== null} className="gap-2">
              {actionLoading === "chapters" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Alle Kapitel generieren
            </Button>
          )}
          {project.status === "GENERATING" && (project.chapters?.length ?? 0) > 0 && (
            <Button onClick={handleRunQa} disabled={actionLoading !== null} variant="outline" className="gap-2">
              {actionLoading === "qa" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              QA starten
            </Button>
          )}
          {(project.status === "QA_REVIEW" || project.status === "QA_FIXING" || project.status === "COMPLETED") && (
            <Button onClick={handleAssembleManuscript} disabled={actionLoading !== null} variant="outline" className="gap-2">
              {actionLoading === "manuscript" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Manuskript zusammenfügen
            </Button>
          )}
        </div>
      </div>

      {/* Live generation status */}
      {gen.active && <GenerationProgressPanel gen={gen} project={project} liveStream={liveStream} />}

      {/* Overall progress */}
      <div
        className="rounded-xl px-5 py-4"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-xs)" }}
      >
        <div className="mb-2 flex items-center justify-between text-sm">
          <span style={{ color: "var(--fg-3)" }}>
            {formatWordCount(project.actualWordCount)} Wörter verfasst
          </span>
          <span style={{ color: "var(--fg-5)" }}>
            Ziel: {formatWordCount(project.targetWordCount)} Wörter ({progress}%)
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid var(--border-xs)" }}>
        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
                style={{
                  borderColor: activeTab === tab.id ? "var(--accent)" : "transparent",
                  color: activeTab === tab.id ? "var(--fg-accent)" : "var(--fg-5)",
                }}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Übersicht ────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-white">Buchdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Thema",           value: project.topic },
                { label: "Zielgruppe",      value: project.targetAudience },
                { label: "Buchtyp",         value: project.bookType },
                { label: "Sprache",         value: project.language },
                { label: "Tonalität",       value: project.tonality },
                { label: "Seiten (Ziel)",   value: `${project.targetPageCount} Seiten` },
                { label: "Kapitel",         value: `${project.chapterCount} Kapitel` },
                { label: "Erstellt",        value: formatDate(project.createdAt) },
              ].map((item) => (
                <div key={item.label} className="flex justify-between gap-4">
                  <span className="text-sm shrink-0" style={{ color: "var(--fg-4)" }}>{item.label}</span>
                  <span className="text-sm text-right" style={{ color: "var(--fg-2)" }}>{item.value}</span>
                </div>
              ))}
              {project.seriesContext && (
                <>
                  <Separator style={{ background: "var(--border-xs)" }} />
                  <div>
                    <p className="mb-1 text-sm" style={{ color: "var(--fg-4)" }}>Serienkontext</p>
                    <p className="text-sm" style={{ color: "var(--fg-2)" }}>{project.seriesContext}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-white">Produktionspipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { step: "1. Buchplan",           done: !!project.bookPlan, active: project.status === "DRAFT" || project.status === "PLANNING" },
                    { step: "2. Kapitelgenerierung",  done: (project.chapters?.filter(c => c.status !== "PENDING").length ?? 0) > 0, active: project.status === "GENERATING" },
                    { step: "3. Qualitätsprüfung",   done: project.status === "QA_FIXING" || project.status === "COMPLETED", active: project.status === "QA_REVIEW" },
                    { step: "4. Abschlussmanuskript", done: project.status === "COMPLETED", active: project.status === "QA_FIXING" },
                  ].map((s) => (
                    <div key={s.step} className="flex items-center gap-3">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full border text-xs"
                        style={{
                          borderColor: s.done ? "rgb(52,211,153)" : s.active ? "var(--accent)" : "var(--border-sm)",
                          background: s.done ? "rgba(52,211,153,0.1)" : s.active ? "var(--bg-tint)" : "transparent",
                          color: s.done ? "rgb(52,211,153)" : s.active ? "var(--fg-accent)" : "var(--fg-5)",
                        }}
                      >
                        {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                      </div>
                      <span className="text-sm" style={{ color: s.done ? "var(--fg-2)" : s.active ? "var(--fg-accent)" : "var(--fg-5)" }}>
                        {s.step}
                      </span>
                      {s.active && <span className="ml-auto text-xs" style={{ color: "var(--accent)" }}>Aktiv</span>}
                      {s.done  && <span className="ml-auto text-xs" style={{ color: "rgb(52,211,153)" }}>Erledigt</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {latestQaRun && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-white">Letzter QA-Lauf</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p
                        className="text-3xl font-bold"
                        style={{ color: (latestQaRun.overallScore ?? 0) >= 80 ? "rgb(52,211,153)" : (latestQaRun.overallScore ?? 0) >= 60 ? "rgb(245,158,11)" : "rgb(251,113,133)" }}
                      >
                        {latestQaRun.overallScore != null ? Math.round(latestQaRun.overallScore) : "—"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--fg-5)" }}>/ 100</p>
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: "var(--fg-2)" }}>
                        {latestQaRun.findings?.length ?? 0} Befunde
                      </p>
                      <p className="text-xs" style={{ color: "var(--fg-5)" }}>
                        {latestQaRun.completedAt ? formatDate(latestQaRun.completedAt) : "Läuft…"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Plan ─────────────────────────────────────────────────────── */}
      {activeTab === "plan" && (
        <div className="space-y-4">
          {!project.bookPlan ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--bg-tint)", border: "1px solid var(--border-sm)" }}>
                  <FileText className="h-6 w-6" style={{ color: "var(--fg-4)" }} />
                </div>
                <h3 className="text-base font-600 text-white" style={{ fontWeight: 600 }}>Noch kein Plan</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--fg-4)" }}>
                  Erstelle einen Buchplan, um Kapitel, Wortbudgets und Stilregeln festzulegen.
                </p>
                <Button onClick={handleGeneratePlan} disabled={actionLoading !== null} className="mt-6 gap-2">
                  {actionLoading === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Plan erstellen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base text-white">Zusammenfassung</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--fg-2)" }}>
                    {project.bookPlan.globalSummary}
                  </p>
                </CardContent>
              </Card>

              {outline && (
                <div>
                  <h3 className="mb-3 text-base font-semibold text-white">Kapitelübersicht</h3>
                  <div className="space-y-3">
                    {outline.map((ch) => (
                      <Card key={ch.order}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                style={{ background: "var(--bg-tint-md)", color: "var(--fg-accent)" }}
                              >
                                {ch.order}
                              </span>
                              <div>
                                <p className="font-medium text-white">{ch.title}</p>
                                <p className="mt-1 text-sm" style={{ color: "var(--fg-4)" }}>{ch.goal}</p>
                                {ch.keyPoints && ch.keyPoints.length > 0 && (
                                  <ul className="mt-2 space-y-0.5">
                                    {ch.keyPoints.map((kp, i) => (
                                      <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--fg-4)" }}>
                                        <span className="h-1 w-1 rounded-full bg-violet-600" />
                                        {kp}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-medium" style={{ color: "var(--fg-3)" }}>
                                {formatWordCount(ch.targetWordCount)} Wörter
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit / Save toolbar */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-4)" }}>
                  Stilregeln & Konzepte
                </p>
                {!planEditMode ? (
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={enterPlanEditMode}>
                    <Pencil className="h-3 w-3" />
                    Bearbeiten
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={cancelPlanEdit} disabled={planSaving}>
                      <X className="h-3 w-3" />
                      Abbrechen
                    </Button>
                    <Button size="sm" className="gap-1.5 text-xs" onClick={savePlan} disabled={planSaving}>
                      {planSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Speichern
                    </Button>
                  </div>
                )}
              </div>

              {/* Stilregeln */}
              <Card>
                <CardHeader><CardTitle className="text-base text-white">Stilregeln</CardTitle></CardHeader>
                <CardContent>
                  {planEditMode && planDraft ? (
                    <textarea
                      className="w-full rounded-lg px-3 py-2 text-sm leading-relaxed resize-none focus:outline-none"
                      rows={8}
                      value={planDraft.styleRules}
                      onChange={(e) => setPlanDraft((d) => d ? { ...d, styleRules: e.target.value } : d)}
                      style={{
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-md)",
                        color: "var(--fg-1)",
                      }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--fg-2)" }}>
                      {project.bookPlan.styleRules}
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Schlüsselkonzepte */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-white">Schlüsselkonzepte</CardTitle>
                    <CardDescription style={{ color: "var(--fg-5)" }}>Konsequent zu verwenden</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(planEditMode && planDraft ? planDraft.conceptList : (project.bookPlan.conceptList as unknown as string[])).map((c) => (
                        <span
                          key={c}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                          style={{ background: "var(--bg-tint-md)", color: "var(--fg-accent)" }}
                        >
                          {c}
                          {planEditMode && planDraft && (
                            <button
                              onClick={() => setPlanDraft((d) => d ? { ...d, conceptList: d.conceptList.filter((x) => x !== c) } : d)}
                              className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {planEditMode && planDraft && (
                      <div className="flex gap-2">
                        <input
                          className="flex-1 rounded-md px-2 py-1 text-xs focus:outline-none"
                          placeholder="Neues Konzept…"
                          value={newConceptInput}
                          onChange={(e) => setNewConceptInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newConceptInput.trim()) {
                              setPlanDraft((d) => d ? { ...d, conceptList: [...d.conceptList, newConceptInput.trim()] } : d);
                              setNewConceptInput("");
                            }
                          }}
                          style={{
                            background: "var(--bg-input)",
                            border: "1px solid var(--border-md)",
                            color: "var(--fg-1)",
                          }}
                        />
                        <button
                          onClick={() => {
                            if (newConceptInput.trim()) {
                              setPlanDraft((d) => d ? { ...d, conceptList: [...d.conceptList, newConceptInput.trim()] } : d);
                              setNewConceptInput("");
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                          style={{ background: "var(--bg-tint-md)", color: "var(--fg-accent)" }}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Verbotsliste */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-white">Verbotsliste</CardTitle>
                    <CardDescription style={{ color: "var(--fg-5)" }}>Im gesamten Buch vermeiden</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1">
                      {(planEditMode && planDraft ? planDraft.noGoList : (project.bookPlan.noGoList as unknown as string[])).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--fg-4)" }}>
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-500" />
                          <span className="flex-1">{item}</span>
                          {planEditMode && planDraft && (
                            <button
                              onClick={() => setPlanDraft((d) => d ? { ...d, noGoList: d.noGoList.filter((_, idx) => idx !== i) } : d)}
                              className="opacity-40 hover:opacity-100 transition-opacity shrink-0"
                            >
                              <X className="h-3 w-3" style={{ color: "rgb(251,113,133)" }} />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {planEditMode && planDraft && (
                      <div className="flex gap-2">
                        <input
                          className="flex-1 rounded-md px-2 py-1 text-xs focus:outline-none"
                          placeholder="Neuer Eintrag…"
                          value={newNoGoInput}
                          onChange={(e) => setNewNoGoInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newNoGoInput.trim()) {
                              setPlanDraft((d) => d ? { ...d, noGoList: [...d.noGoList, newNoGoInput.trim()] } : d);
                              setNewNoGoInput("");
                            }
                          }}
                          style={{
                            background: "var(--bg-input)",
                            border: "1px solid var(--border-md)",
                            color: "var(--fg-1)",
                          }}
                        />
                        <button
                          onClick={() => {
                            if (newNoGoInput.trim()) {
                              setPlanDraft((d) => d ? { ...d, noGoList: [...d.noGoList, newNoGoInput.trim()] } : d);
                              setNewNoGoInput("");
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                          style={{ background: "rgba(251,113,133,0.1)", color: "rgb(251,113,133)" }}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Kapitel ──────────────────────────────────────────────────── */}
      {activeTab === "chapters" && (
        <div className="space-y-3">
          {!project.chapters || project.chapters.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="mb-4 h-12 w-12" style={{ color: "var(--fg-5)" }} />
                <h3 className="text-base font-medium text-white">Noch keine Kapitel</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--fg-4)" }}>
                  Erstelle zuerst einen Buchplan, dann können die Kapitel generiert werden.
                </p>
              </CardContent>
            </Card>
          ) : (
            project.chapters.map((chapter) => {
              const chapterProgress = calculateProgress(chapter.actualWordCount, chapter.targetWordCount);
              const isCurrentlyGenerating = actionLoading === `chapter-${chapter.id}`;
              return (
                <Card key={chapter.id} className={`transition-all duration-300 ${chapter.status === "GENERATING" ? "ring-1 ring-violet-500/30" : ""}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{ background: "var(--bg-tint)", color: "var(--fg-3)" }}
                        >
                          {chapter.order}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/projects/${projectId}/chapters/${chapter.id}`}
                              className="font-medium text-white transition-colors hover:text-violet-300"
                            >
                              {chapter.title}
                            </Link>
                            <ChapterStatusBadge status={chapter.status} />
                            {chapter.status === "GENERATING" && (
                              <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--fg-accent)" }} />
                            )}
                          </div>
                          <p className="mt-1 text-sm truncate" style={{ color: "var(--fg-4)" }}>{chapter.goal}</p>
                          {chapter.actualWordCount > 0 && (
                            <div className="mt-2">
                              <div className="mb-1 flex items-center justify-between text-xs" style={{ color: "var(--fg-5)" }}>
                                <span>{formatWordCount(chapter.actualWordCount)} / {formatWordCount(chapter.targetWordCount)} Wörter</span>
                                <span>{chapterProgress}%</span>
                              </div>
                              <Progress value={chapterProgress} className="h-1" />
                            </div>
                          )}
                          {/* Live streaming preview */}
                          {liveStream?.chapterId === chapter.id && liveStream.text.length > 0 && (
                            <div
                              className="mt-3 rounded-lg px-3 py-2.5 text-xs leading-relaxed overflow-hidden"
                              style={{
                                background: "var(--bg-tint)",
                                border: "1px solid var(--border-xs)",
                                color: "var(--fg-2)",
                                maxHeight: "130px",
                                fontFamily: "'JetBrains Mono', monospace",
                                maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
                                WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
                              }}
                            >
                              {liveStream.text.slice(-500)}
                              <span
                                className="inline-block w-0.5 h-3 ml-0.5 align-middle animate-pulse"
                                style={{ background: "var(--fg-accent)", borderRadius: "1px" }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {(chapter.status === "PENDING" || chapter.status === "NEEDS_REVISION") ? (
                          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleGenerateChapter(chapter.id)} disabled={actionLoading !== null}>
                            {isCurrentlyGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                            Generieren
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="gap-1 text-xs" style={{ color: "var(--fg-4)" }} onClick={() => handleGenerateChapter(chapter.id)} disabled={actionLoading !== null}>
                            <RefreshCw className="h-3 w-3" />
                            Neu
                          </Button>
                        )}
                        {(chapter.status === "DRAFT" || chapter.status === "REVIEWING") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-xs"
                            style={{ color: "rgb(52,211,153)" }}
                            disabled={actionLoading !== null}
                            onClick={async () => {
                              await fetch(`/api/projects/${projectId}/chapters/${chapter.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "APPROVED" }),
                              });
                              await loadProject();
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Abgenommen
                          </Button>
                        )}
                        {chapter.status === "APPROVED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-xs"
                            style={{ color: "var(--fg-5)" }}
                            disabled={actionLoading !== null}
                            onClick={async () => {
                              await fetch(`/api/projects/${projectId}/chapters/${chapter.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "DRAFT" }),
                              });
                              await loadProject();
                            }}
                          >
                            Rückgängig
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-xs" asChild>
                          <Link href={`/projects/${projectId}/chapters/${chapter.id}`}>Ansehen</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── QA ───────────────────────────────────────────────────────── */}
      {activeTab === "qa" && (
        <div className="space-y-4">
          {!latestQaRun ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)" }}>
                  <ShieldCheck className="h-6 w-6" style={{ color: "rgba(52,211,153,0.5)" }} />
                </div>
                <h3 className="text-base font-600 text-white" style={{ fontWeight: 600 }}>Noch kein QA-Lauf</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--fg-4)" }}>
                  Starte die QA-Analyse, sobald du Kapitel generiert hast.
                </p>
                <Button onClick={handleRunQa} disabled={actionLoading !== null || !project.chapters?.length} className="mt-6 gap-2">
                  {actionLoading === "qa" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  QA-Analyse starten
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span
                    className="text-5xl font-bold"
                    style={{ color: (latestQaRun.overallScore ?? 0) >= 80 ? "rgb(52,211,153)" : (latestQaRun.overallScore ?? 0) >= 60 ? "rgb(245,158,11)" : "rgb(251,113,133)" }}
                  >
                    {latestQaRun.overallScore != null ? Math.round(latestQaRun.overallScore) : "—"}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Gesamt-QA-Bewertung</p>
                    <p className="text-xs" style={{ color: "var(--fg-4)" }}>
                      {latestQaRun.findings?.length ?? 0} Befunde · Lauf {latestQaRun.completedAt ? formatDate(latestQaRun.completedAt) : "läuft…"}
                    </p>
                  </div>
                </div>
                <Button onClick={handleRunQa} disabled={actionLoading !== null} variant="outline" size="sm" className="gap-2">
                  {actionLoading === "qa" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  QA wiederholen
                </Button>
              </div>

              {latestQaRun.findings && latestQaRun.findings.length > 0 ? (
                <div className="space-y-3">
                  {latestQaRun.findings.map((finding) => (
                    <Card key={finding.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            className="mt-0.5 h-4 w-4 shrink-0"
                            style={{ color: finding.severity === "CRITICAL" ? "rgb(251,113,133)" : finding.severity === "HIGH" ? "rgb(251,146,60)" : finding.severity === "MEDIUM" ? "rgb(245,158,11)" : "rgb(125,211,252)" }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <SeverityBadge severity={finding.severity} />
                              <FindingTypeBadge type={finding.findingType} />
                            </div>
                            <p className="text-sm" style={{ color: "var(--fg-1)" }}>{finding.description}</p>
                            <p className="mt-1 text-xs" style={{ color: "var(--fg-4)" }}>
                              Empfehlung: {finding.suggestion}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex items-center gap-3 py-6">
                    <CheckCircle2 className="h-5 w-5" style={{ color: "rgb(52,211,153)" }} />
                    <p className="text-sm" style={{ color: "var(--fg-2)" }}>
                      Keine Probleme gefunden — das Manuskript ist ausgezeichnet!
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Export ───────────────────────────────────────────────────── */}
      {activeTab === "export" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-white">Manuskript-Export</CardTitle>
              <CardDescription style={{ color: "var(--fg-4)" }}>
                Alle Kapitel zu einem finalen Manuskript zusammenfügen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleAssembleManuscript} disabled={actionLoading !== null} className="gap-2">
                {actionLoading === "manuscript" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Manuskript zusammenfügen & exportieren
              </Button>
              <p className="text-xs" style={{ color: "var(--fg-5)" }}>
                Alle genehmigten Kapitel werden in einem einzigen Markdown-Dokument mit Titelseite und Inhaltsverzeichnis zusammengefasst.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
