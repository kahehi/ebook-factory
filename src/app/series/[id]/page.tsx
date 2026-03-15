"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, BookOpen, Sparkles, ArrowRight, RefreshCw, CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { SeriesResponse, SeriesPlanSuggestion, SeriesBookSuggestion, SeriesStatus } from "@/types";

// ─── Badges ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SeriesStatus }) {
  const map: Record<SeriesStatus, { label: string; variant: string }> = {
    PLANNING:  { label: "Planung",       variant: "planning" },
    ACTIVE:    { label: "Aktiv",         variant: "generating" },
    COMPLETED: { label: "Abgeschlossen", variant: "completed" },
    ARCHIVED:  { label: "Archiviert",    variant: "archived" },
  };
  const { label, variant } = map[status] ?? map.PLANNING;
  return <Badge variant={variant as Parameters<typeof Badge>[0]["variant"]}>{label}</Badge>;
}

function RoleBadge({ role }: { role: string }) {
  const colorMap: Record<string, string> = {
    Einführung: "bg-sky-900/40 text-sky-400 border-sky-800",
    Aufbau:     "bg-violet-900/40 text-violet-400 border-violet-800",
    Vertiefung: "bg-orange-900/40 text-orange-400 border-orange-800",
    Praxis:     "bg-emerald-900/40 text-emerald-400 border-emerald-800",
    Abschluss:  "bg-rose-900/40 text-rose-400 border-rose-800",
  };
  const cls = colorMap[role] ?? "bg-zinc-800/60 text-zinc-400 border-zinc-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {role}
    </span>
  );
}

function PipelineStep({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
        style={{
          background: done ? "rgba(52,211,153,0.15)" : active ? "var(--bg-tint-md)" : "var(--bg-tint)",
          border: `1px solid ${done ? "rgba(52,211,153,0.4)" : active ? "var(--border-md)" : "var(--border-sm)"}`,
          color: done ? "rgb(52,211,153)" : active ? "var(--fg-accent)" : "var(--fg-5)",
        }}
      >
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      </div>
      <span
        className="text-sm"
        style={{ color: done ? "var(--fg-2)" : active ? "var(--fg-accent)" : "var(--fg-5)" }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Editable Book Card ────────────────────────────────────────────────────────

function EditableBookCard({ book, onChange }: { book: SeriesBookSuggestion; onChange: (u: SeriesBookSuggestion) => void }) {
  function update(field: keyof SeriesBookSuggestion, value: unknown) { onChange({ ...book, [field]: value }); }

  const inputStyle = { background: "var(--bg-input)", borderColor: "var(--border-sm)", color: "var(--fg-1)" };
  const labelStyle = { color: "var(--fg-4)" };

  return (
    <div className="rounded-xl p-4 space-y-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-sm)" }}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: "var(--bg-tint-md)", color: "var(--fg-accent)" }}>
          {book.index}
        </div>
        <div className="flex-1 space-y-2">
          <RoleBadge role={book.seriesRole} />
          <div>
            <Label className="text-xs" style={labelStyle}>Titel</Label>
            <Input value={book.title} onChange={(e) => update("title", e.target.value)} className="mt-1 text-sm font-medium" style={inputStyle} />
          </div>
          <div>
            <Label className="text-xs" style={labelStyle}>Untertitel</Label>
            <Input value={book.subtitle} onChange={(e) => update("subtitle", e.target.value)} className="mt-1 text-sm" style={inputStyle} />
          </div>
        </div>
      </div>
      <div>
        <Label className="text-xs" style={labelStyle}>Thema</Label>
        <Textarea value={book.topic} onChange={(e) => update("topic", e.target.value)} rows={2} className="mt-1 text-sm" style={inputStyle} />
      </div>
      <div>
        <Label className="text-xs" style={labelStyle}>Beschreibung</Label>
        <Textarea value={book.description} onChange={(e) => update("description", e.target.value)} rows={3} className="mt-1 text-sm" style={inputStyle} />
      </div>
      <div>
        <Label className="text-xs" style={labelStyle}>Schlüsselthemen (kommagetrennt)</Label>
        <Input
          value={book.keyThemes.join(", ")}
          onChange={(e) => update("keyThemes", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
          className="mt-1 text-sm"
          style={inputStyle}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs" style={labelStyle}>Zielseiten</Label>
          <Input type="number" min={20} value={book.targetPageCount} onChange={(e) => update("targetPageCount", parseInt(e.target.value, 10) || 0)} className="mt-1 text-sm" style={inputStyle} />
        </div>
        <div>
          <Label className="text-xs" style={labelStyle}>Zielwörter</Label>
          <Input type="number" min={5000} value={book.targetWordCount} onChange={(e) => update("targetWordCount", parseInt(e.target.value, 10) || 0)} className="mt-1 text-sm" style={inputStyle} />
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Übersicht ────────────────────────────────────────────────────────────

function OverviewTab({ series }: { series: SeriesResponse }) {
  const status = series.status as SeriesStatus;
  const hasPlan = !!series.suggestedPlan;
  const isConfirmed = !!series.confirmedAt;
  const isCompleted = status === "COMPLETED";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base text-white">Seriendetails</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Thema / Konzept", value: series.topic },
            { label: "Zielgruppe",      value: series.targetAudience },
            { label: "Sprache",         value: series.language },
            { label: "Tonalität",       value: series.tonality },
          ].map((item) => (
            <div key={item.label}>
              <p className="mb-1 text-xs font-medium" style={{ color: "var(--fg-4)" }}>{item.label}</p>
              <p className="text-sm" style={{ color: "var(--fg-2)" }}>{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base text-white">Produktionspipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <PipelineStep label="Plan"           done={hasPlan}     active={!hasPlan} />
            <ChevronRight className="h-4 w-4" style={{ color: "var(--fg-5)" }} />
            <PipelineStep label="Bestätigen"     done={isConfirmed} active={hasPlan && !isConfirmed} />
            <ChevronRight className="h-4 w-4" style={{ color: "var(--fg-5)" }} />
            <PipelineStep label="Bücher aktiv"   done={isCompleted} active={isConfirmed && !isCompleted} />
            <ChevronRight className="h-4 w-4" style={{ color: "var(--fg-5)" }} />
            <PipelineStep label="Abgeschlossen"  done={isCompleted} active={false} />
          </div>
        </CardContent>
      </Card>

      {series.projects && series.projects.length > 0 && (
        <div>
          <h3 className="mb-3 text-base font-semibold text-white">Bücher in dieser Serie</h3>
          <div className="space-y-2">
            {series.projects.map((project) => (
              <Card key={project.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: "var(--bg-tint-md)", color: "var(--fg-accent)" }}>
                    {project.bookIndexInSeries ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-white">{project.title}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--fg-5)" }}>
                      {project.targetPageCount} Seiten · {project.targetWordCount.toLocaleString("de-DE")} Wörter
                    </p>
                  </div>
                  <Badge variant={project.status as Parameters<typeof Badge>[0]["variant"]}>
                    {project.status}
                  </Badge>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/projects/${project.id}`}>
                      Öffnen <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: KI-Plan ──────────────────────────────────────────────────────────────

function AiPlanTab({ series, onPlanConfirmed }: { series: SeriesResponse; onPlanConfirmed: () => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<SeriesPlanSuggestion | null>(() => {
    if (!series.suggestedPlan) return null;
    try { return JSON.parse(series.suggestedPlan) as SeriesPlanSuggestion; } catch { return null; }
  });
  const [editableBooks, setEditableBooks] = useState<SeriesBookSuggestion[]>(() => (plan ? [...plan.books] : []));

  async function handleGenerate() {
    setIsGenerating(true); setError(null);
    try {
      const res = await fetch(`/api/series/${series.id}/plan`, { method: "POST" });
      const result = await res.json();
      if (result.success) {
        setPlan(result.data as SeriesPlanSuggestion);
        setEditableBooks([...(result.data as SeriesPlanSuggestion).books]);
      } else { setError(result.error ?? "Fehler beim Generieren des Plans"); }
    } catch { setError("Netzwerkfehler. Bitte erneut versuchen."); }
    finally { setIsGenerating(false); }
  }

  async function handleConfirm() {
    if (!plan) return;
    setIsConfirming(true); setError(null);
    try {
      const res = await fetch(`/api/series/${series.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ books: editableBooks }),
      });
      const result = await res.json();
      if (result.success) onPlanConfirmed();
      else setError(result.error ?? "Fehler beim Bestätigen des Plans");
    } catch { setError("Netzwerkfehler. Bitte erneut versuchen."); }
    finally { setIsConfirming(false); }
  }

  function updateBook(index: number, updated: SeriesBookSuggestion) {
    setEditableBooks((prev) => { const next = [...prev]; next[index] = updated; return next; });
  }

  const isAlreadyConfirmed = !!series.confirmedAt;

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--bg-tint)", border: "1px solid var(--border-sm)" }}>
          <Sparkles className="h-7 w-7" style={{ color: "var(--fg-4)" }} />
        </div>
        <h3 className="text-base font-600 text-white" style={{ fontWeight: 600 }}>Noch kein KI-Plan</h3>
        <p className="mt-2 max-w-sm text-sm" style={{ color: "var(--fg-4)" }}>
          Klicke auf den Button, und die KI schlägt vor, wie viele Bücher deine Serie haben sollte und was jedes davon behandelt.
        </p>
        {error && <p className="mt-4 text-sm" style={{ color: "rgb(251,113,133)" }}>{error}</p>}
        <Button className="mt-6 gap-2" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Plan wird erstellt…</> : <><Sparkles className="h-4 w-4" />KI-Plan erstellen</>}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Empfehlung */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-tint)", border: "1px solid var(--border-md)" }}>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: "var(--fg-accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--fg-accent)" }}>KI-Empfehlung</span>
        </div>
        <p className="mb-3 text-sm" style={{ color: "var(--fg-2)" }}>{plan.reasoning}</p>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-white">{plan.recommendedBookCount}</span>
          <span className="text-sm" style={{ color: "var(--fg-4)" }}>Bücher empfohlen</span>
        </div>
      </div>

      {isAlreadyConfirmed && (
        <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.05)", color: "rgb(52,211,153)" }}>
          Dieser Plan wurde bereits bestätigt und die Buchprojekte wurden erstellt. Du kannst sie im Übersicht-Tab ansehen.
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm" style={{ color: "var(--fg-4)" }}>
          Du kannst alle Felder bearbeiten, bevor du bestätigst. Änderungen werden in den erstellten Buchprojekten übernommen.
        </p>
        {editableBooks.map((book, i) => (
          <EditableBookCard key={book.index} book={book} onChange={(updated) => updateBook(i, updated)} />
        ))}
      </div>

      {error && (
        <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(251,113,133,0.3)", background: "rgba(251,113,133,0.06)", color: "rgb(251,113,133)" }}>
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4" style={{ borderTop: "1px solid var(--border-xs)" }}>
        <Button variant="outline" className="gap-2" onClick={handleGenerate} disabled={isGenerating || isConfirming || isAlreadyConfirmed}>
          {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Wird neu erstellt…</> : <><RefreshCw className="h-4 w-4" />Vorschlag neu erstellen</>}
        </Button>

        {!isAlreadyConfirmed && (
          <Button className="gap-2" onClick={handleConfirm} disabled={isConfirming || isGenerating}>
            {isConfirming ? <><Loader2 className="h-4 w-4 animate-spin" />Bücher werden erstellt…</> : <><CheckCircle2 className="h-4 w-4" />Plan bestätigen & Bücher erstellen</>}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type TabId = "overview" | "plan";

export default function SeriesDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("plan");
  const [error, setError] = useState<string | null>(null);

  const fetchSeries = useCallback(async () => {
    try {
      const res = await fetch(`/api/series/${params.id}`);
      const result = await res.json();
      if (result.success) setSeries(result.data as SeriesResponse);
      else setError(result.error ?? "Serie nicht gefunden");
    } catch { setError("Fehler beim Laden der Serie"); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { void fetchSeries(); }, [fetchSeries]);

  function handlePlanConfirmed() { void fetchSeries(); setActiveTab("overview"); }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--fg-4)" }} />
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BookOpen className="mb-4 h-12 w-12" style={{ color: "var(--fg-5)" }} />
        <h2 className="text-lg font-semibold text-white">Serie nicht gefunden</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--fg-4)" }}>{error ?? "Die Serie konnte nicht geladen werden."}</p>
        <Button asChild variant="outline" className="mt-6" onClick={() => router.push("/series")}>
          <Link href="/series">Zurück zu Serien</Link>
        </Button>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Übersicht" },
    { id: "plan",     label: "KI-Plan" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs" style={{ color: "var(--fg-5)" }}>
            <Link href="/series" className="transition-colors hover:text-violet-300">Serien</Link>
            <ChevronRight className="h-3 w-3" />
            <span style={{ color: "var(--fg-3)" }}>{series.title}</span>
          </div>
          <h1 className="text-2xl font-800 text-white" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>{series.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={series.status as SeriesStatus} />
            <span className="text-xs" style={{ color: "var(--fg-5)" }}>
              {series.projects?.length ?? 0} {(series.projects?.length ?? 0) !== 1 ? "Bücher" : "Buch"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid var(--border-xs)" }}>
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="border-b-2 pb-3 text-sm font-medium transition-colors"
              style={{
                borderColor: activeTab === tab.id ? "var(--accent)" : "transparent",
                color: activeTab === tab.id ? "var(--fg-accent)" : "var(--fg-5)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview"
        ? <OverviewTab series={series} />
        : <AiPlanTab series={series} onPlanConfirmed={handlePlanConfirmed} />
      }
    </div>
  );
}
