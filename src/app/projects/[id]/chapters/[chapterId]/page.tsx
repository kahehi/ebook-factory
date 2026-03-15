"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit3,
  Eye,
  Loader2,
  RefreshCw,
  Save,
  X,
  Clock,
  Hash,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDateTime, formatWordCount } from "@/lib/utils";
import type { ChapterResponse } from "@/types";
import type { ChapterStatus } from "@/types";

function ChapterStatusBadge({ status }: { status: ChapterStatus }) {
  const map: Record<ChapterStatus, { label: string; color: string }> = {
    PENDING:        { label: "Ausstehend",          color: "text-zinc-500 bg-zinc-800/60" },
    GENERATING:     { label: "Wird generiert…",     color: "text-violet-300 bg-violet-900/30" },
    DRAFT:          { label: "Entwurf",              color: "text-amber-300 bg-amber-900/30" },
    REVIEWING:      { label: "In Prüfung",          color: "text-blue-300 bg-blue-900/30" },
    APPROVED:       { label: "Genehmigt",           color: "text-emerald-300 bg-emerald-900/30" },
    NEEDS_REVISION: { label: "Überarbeitung nötig", color: "text-red-300 bg-red-900/30" },
  };
  const { label, color } = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export default function ChapterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const chapterId = params.chapterId as string;

  const [chapter, setChapter] = useState<ChapterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rewriteInstructions, setRewriteInstructions] = useState("");
  const [showRewriteForm, setShowRewriteForm] = useState(false);

  async function loadChapter() {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.success) {
        const ch = data.data.chapters?.find((c: ChapterResponse) => c.id === chapterId);
        if (ch) {
          setChapter(ch);
          setEditContent(ch.currentContent ?? "");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadChapter(); }, [chapterId]);

  async function handleSave() {
    if (!chapter) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters/${chapterId}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) { setChapter(data.data); setMode("view"); }
    } finally { setSaving(false); }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters/${chapterId}/generate`, { method: "POST" });
      const data = await res.json();
      if (data.success) await loadChapter();
    } finally { setGenerating(false); }
  }

  async function handleRewrite() {
    setRewriting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters/${chapterId}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: rewriteInstructions || undefined }),
      });
      const data = await res.json();
      if (data.success) { await loadChapter(); setShowRewriteForm(false); setRewriteInstructions(""); }
    } finally { setRewriting(false); }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--fg-4)" }} />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p style={{ color: "var(--fg-3)" }}>Kapitel nicht gefunden</p>
        <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
          Zurück zum Projekt
        </Button>
      </div>
    );
  }

  const wordCountColor =
    chapter.actualWordCount === 0
      ? "var(--fg-5)"
      : chapter.actualWordCount / chapter.targetWordCount < 0.85
      ? "rgb(245,158,11)"
      : chapter.actualWordCount / chapter.targetWordCount > 1.2
      ? "rgb(251,146,60)"
      : "rgb(52,211,153)";

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost" size="icon"
            onClick={() => router.push(`/projects/${projectId}`)}
            className="mt-0.5"
            style={{ color: "var(--fg-4)" }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-800 text-white" style={{ fontWeight: 800 }}>
                Kap. {chapter.order}: {chapter.title}
              </h1>
              <ChapterStatusBadge status={chapter.status} />
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--fg-4)" }}>{chapter.goal}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {mode === "view" ? (
            <>
              {chapter.status === "PENDING" ? (
                <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Generieren
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowRewriteForm(!showRewriteForm)}>
                    <RefreshCw className="h-4 w-4" />
                    Neu schreiben
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => { setMode("edit"); setEditContent(chapter.currentContent ?? ""); }}>
                    <Edit3 className="h-4 w-4" />
                    Bearbeiten
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="gap-2" style={{ color: "var(--fg-4)" }} onClick={() => setMode("view")}>
                <X className="h-4 w-4" />
                Abbrechen
              </Button>
              <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Speichern
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div
        className="flex items-center gap-6 rounded-xl px-5 py-3"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-xs)" }}
      >
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4" style={{ color: "var(--fg-5)" }} />
          <span className="text-sm font-medium" style={{ color: wordCountColor }}>
            {formatWordCount(chapter.actualWordCount)}
          </span>
          <span className="text-sm" style={{ color: "var(--fg-5)" }}>
            / {formatWordCount(chapter.targetWordCount)} Wörter
          </span>
        </div>

        <Separator orientation="vertical" className="h-4" style={{ background: "var(--border-sm)" }} />

        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" style={{ color: "var(--fg-5)" }} />
          <span className="text-sm" style={{ color: "var(--fg-4)" }}>
            {chapter.versions?.length ?? 0} Version{(chapter.versions?.length ?? 0) !== 1 ? "en" : ""}
          </span>
        </div>

        <Separator orientation="vertical" className="h-4" style={{ background: "var(--border-sm)" }} />

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" style={{ color: "var(--fg-5)" }} />
          <span className="text-sm" style={{ color: "var(--fg-4)" }}>
            Aktualisiert {formatDate(chapter.updatedAt)}
          </span>
        </div>
      </div>

      {/* Rewrite form */}
      {showRewriteForm && (
        <Card style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.03)" }}>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <Label style={{ color: "var(--fg-2)" }}>
                Überarbeitungsanweisungen{" "}
                <span style={{ color: "var(--fg-5)" }}>(optional)</span>
              </Label>
              <Textarea
                placeholder="z.B. Mache dieses Kapitel ansprechender und füge mehr praktische Beispiele hinzu. Konzentriere dich auf…"
                value={rewriteInstructions}
                onChange={(e) => setRewriteInstructions(e.target.value)}
                rows={3}
                style={{ background: "var(--bg-input)", borderColor: "var(--border-md)" }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowRewriteForm(false); setRewriteInstructions(""); }}>
                  Abbrechen
                </Button>
                <Button size="sm" onClick={handleRewrite} disabled={rewriting} className="gap-2">
                  {rewriting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Kapitel neu schreiben
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base text-white">Kapitelinhalt</CardTitle>
              {mode === "edit" && (
                <Badge variant="outline" style={{ borderColor: "rgba(245,158,11,0.4)", color: "rgb(245,158,11)" }}>
                  Bearbeitung
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {mode === "view" ? (
                chapter.currentContent ? (
                  <div className="prose-dark max-w-none">
                    {chapter.currentContent.split("\n").map((line, i) => {
                      if (line.startsWith("## "))  return <h2 key={i} className="text-lg font-bold text-white mt-6 mb-3">{line.slice(3)}</h2>;
                      if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold mt-4 mb-2" style={{ color: "var(--fg-1)" }}>{line.slice(4)}</h3>;
                      if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-white my-2">{line.slice(2, -2)}</p>;
                      if (line.trim() === "") return <div key={i} className="h-3" />;
                      return <p key={i} className="text-sm leading-7" style={{ color: "var(--fg-2)" }}>{line}</p>;
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm" style={{ color: "var(--fg-4)" }}>
                      Noch kein Inhalt. Generiere dieses Kapitel, um zu beginnen.
                    </p>
                    <Button onClick={handleGenerate} disabled={generating} className="mt-4 gap-2">
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Kapitel generieren
                    </Button>
                  </div>
                )
              ) : (
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={30}
                  className="font-mono text-sm"
                  style={{ background: "var(--bg-tint)", borderColor: "var(--border-sm)" }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {chapter.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium" style={{ color: "var(--fg-3)" }}>
                  Kapitelzusammenfassung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed" style={{ color: "var(--fg-2)" }}>{chapter.summary}</p>
              </CardContent>
            </Card>
          )}

          {chapter.versions && chapter.versions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium" style={{ color: "var(--fg-3)" }}>
                  Versionsverlauf
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {chapter.versions.map((version) => (
                    <div key={version.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ border: "1px solid var(--border-xs)", background: "var(--bg-tint)" }}>
                      <div>
                        <p className="text-xs font-medium text-white">Version {version.version}</p>
                        <p className="text-xs" style={{ color: "var(--fg-5)" }}>{formatWordCount(version.wordCount)} Wörter</p>
                      </div>
                      <p className="text-xs" style={{ color: "var(--fg-5)" }}>{formatDateTime(version.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(chapter.prevChapterSummary || chapter.nextChapterSummary) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium" style={{ color: "var(--fg-3)" }}>
                  Narrativer Kontext
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {chapter.prevChapterSummary && (
                  <div>
                    <p className="mb-1 text-xs font-medium" style={{ color: "var(--fg-5)" }}>Vorheriges Kapitel</p>
                    <p className="text-xs" style={{ color: "var(--fg-3)" }}>{chapter.prevChapterSummary}</p>
                  </div>
                )}
                {chapter.prevChapterSummary && chapter.nextChapterSummary && (
                  <Separator style={{ background: "var(--border-xs)" }} />
                )}
                {chapter.nextChapterSummary && (
                  <div>
                    <p className="mb-1 text-xs font-medium" style={{ color: "var(--fg-5)" }}>Nächstes Kapitel</p>
                    <p className="text-xs" style={{ color: "var(--fg-3)" }}>{chapter.nextChapterSummary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
