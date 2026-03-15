"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, BookMarked, Loader2, Library, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { WORDS_PER_PAGE } from "@/agents/prompt-builder";

type Mode = "single" | "series";

interface FormData {
  title: string; topic: string; bookType: string; targetAudience: string;
  language: string; targetPageCount: string; targetWordCount: string;
  chapterCount: string; tonality: string; seriesContext: string;
}

const initialForm: FormData = {
  title: "", topic: "", bookType: "Non-Fiction", targetAudience: "",
  language: "German", targetPageCount: "200", targetWordCount: "50000",
  chapterCount: "10", tonality: "Professional", seriesContext: "",
};

const tonalities = [
  { value: "Professional",   desc: "Professionell — formell, autoritär" },
  { value: "Conversational", desc: "Gesprächig — freundlich, direkt" },
  { value: "Academic",       desc: "Akademisch — wissenschaftlich, referenzreich" },
  { value: "Motivational",   desc: "Motivierend — inspirierend, handlungsfördernd" },
  { value: "Storytelling",   desc: "Erzählend — narrativ, anekdotenreich" },
  { value: "Technical",      desc: "Technisch — präzise, terminologiefokussiert" },
];

const bookTypes = [
  { value: "Non-Fiction", label: "Sachbuch" },
  { value: "Self-Help",   label: "Ratgeber" },
  { value: "How-To",      label: "Anleitungsbuch" },
  { value: "Business",    label: "Wirtschaft" },
  { value: "Fiction",     label: "Belletristik" },
];

// ─── Mode Selector ─────────────────────────────────────────────────────────────

function ModeSelector({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {([
        { id: "single", icon: BookOpen, title: "Einzelbuch", desc: "Ein Buch mit KI-Agenten erstellen" },
        { id: "series", icon: BookMarked, title: "Buchserie", desc: "Eine mehrbändige Serie planen" },
      ] as const).map(({ id, icon: Icon, title, desc }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200",
            mode === id
              ? "ring-1"
              : "hover:bg-white/2"
          )}
          style={mode === id
            ? { borderColor: "var(--border-md)", background: "var(--bg-tint-md)" }
            : { borderColor: "var(--border-sm)", background: "var(--bg-elevated)" }
          }
        >
          <Icon className="mb-2 h-6 w-6" style={{ color: mode === id ? "var(--fg-accent)" : "var(--fg-4)" }} />
          <p className="text-sm font-semibold" style={{ color: mode === id ? "white" : "var(--fg-3)" }}>
            {title}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--fg-5)" }}>{desc}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Single Book Form ──────────────────────────────────────────────────────────

function SingleBookForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "targetPageCount") {
        const pages = parseInt(value, 10);
        if (!isNaN(pages)) updated.targetWordCount = String(pages * WORDS_PER_PAGE);
      }
      return updated;
    });
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 3)           e.title = "Titel muss mindestens 3 Zeichen haben";
    if (form.topic.trim().length < 10)           e.topic = "Thema muss mindestens 10 Zeichen haben";
    if (!form.bookType)                          e.bookType = "Bitte einen Buchtyp wählen";
    if (form.targetAudience.trim().length < 5)   e.targetAudience = "Bitte die Zielgruppe beschreiben";
    if (parseInt(form.targetPageCount, 10) < 10) e.targetPageCount = "Mindestens 10 Seiten";
    if (parseInt(form.chapterCount, 10) < 3)     e.chapterCount = "Mindestens 3 Kapitel";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(), topic: form.topic.trim(), bookType: form.bookType,
          targetAudience: form.targetAudience.trim(), language: form.language,
          targetPageCount: parseInt(form.targetPageCount, 10), targetWordCount: parseInt(form.targetWordCount, 10),
          chapterCount: parseInt(form.chapterCount, 10), tonality: form.tonality,
          seriesContext: form.seriesContext.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) router.push(`/projects/${result.data.id}`);
      else setErrors({ form: result.error ?? "Fehler beim Erstellen des Projekts" });
    } catch {
      setErrors({ form: "Netzwerkfehler. Bitte erneut versuchen." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle = { background: "var(--bg-input)", borderColor: "var(--border-md)", color: "var(--fg-1)" };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Grundangaben */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <BookOpen className="h-4 w-4" style={{ color: "var(--fg-accent)" }} />
            Grundangaben
          </CardTitle>
          <CardDescription style={{ color: "var(--fg-4)" }}>Die wesentlichen Details deines Buchprojekts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" style={{ color: "var(--fg-3)" }}>Buchtitel *</Label>
            <Input id="title" placeholder='z.B. "Produktivität im digitalen Zeitalter"' value={form.title} onChange={(e) => handleChange("title", e.target.value)} style={inputStyle} />
            {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic" style={{ color: "var(--fg-3)" }}>Thema / Kurzbeschreibung *</Label>
            <Textarea id="topic" placeholder="Beschreibe das Kernthema, die Hauptthese und welche Probleme dieses Buch löst…" rows={3} value={form.topic} onChange={(e) => handleChange("topic", e.target.value)} style={inputStyle} />
            {errors.topic && <p className="text-xs text-red-400">{errors.topic}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bookType" style={{ color: "var(--fg-3)" }}>Buchtyp *</Label>
              <Select value={form.bookType} onValueChange={(v) => handleChange("bookType", v)}>
                <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                <SelectContent style={{ background: "var(--bg-elevated)", borderColor: "var(--border-md)" }}>
                  {bookTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.bookType && <p className="text-xs text-red-400">{errors.bookType}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" style={{ color: "var(--fg-3)" }}>Sprache *</Label>
              <Select value={form.language} onValueChange={(v) => handleChange("language", v)}>
                <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                <SelectContent style={{ background: "var(--bg-elevated)", borderColor: "var(--border-md)" }}>
                  <SelectItem value="German">Deutsch</SelectItem>
                  <SelectItem value="English">Englisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience" style={{ color: "var(--fg-3)" }}>Zielgruppe *</Label>
            <Input id="targetAudience" placeholder='z.B. "Unternehmer und Freelancer im digitalen Bereich, 30–50 Jahre"' value={form.targetAudience} onChange={(e) => handleChange("targetAudience", e.target.value)} style={inputStyle} />
            {errors.targetAudience && <p className="text-xs text-red-400">{errors.targetAudience}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Umfang & Struktur */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-white">Umfang & Struktur</CardTitle>
          <CardDescription style={{ color: "var(--fg-4)" }}>
            Definiere Größe und Aufbau. Wortanzahl wird automatisch aus den Seiten berechnet (1 Seite = {WORDS_PER_PAGE} Wörter).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="targetPageCount" style={{ color: "var(--fg-3)" }}>Zielseiten *</Label>
              <Input id="targetPageCount" type="number" min={10} max={1000} value={form.targetPageCount} onChange={(e) => handleChange("targetPageCount", e.target.value)} style={inputStyle} />
              {errors.targetPageCount && <p className="text-xs text-red-400">{errors.targetPageCount}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetWordCount" style={{ color: "var(--fg-3)" }}>Zielwörter</Label>
              <Input id="targetWordCount" type="number" min={2500} value={form.targetWordCount} onChange={(e) => handleChange("targetWordCount", e.target.value)} style={inputStyle} />
              <p className="text-xs" style={{ color: "var(--fg-5)" }}>Automatisch berechnet, editierbar</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapterCount" style={{ color: "var(--fg-3)" }}>Kapitelanzahl *</Label>
              <Input id="chapterCount" type="number" min={3} max={50} value={form.chapterCount} onChange={(e) => handleChange("chapterCount", e.target.value)} style={inputStyle} />
              {errors.chapterCount && <p className="text-xs text-red-400">{errors.chapterCount}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schreibstil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-white">Schreibstil</CardTitle>
          <CardDescription style={{ color: "var(--fg-4)" }}>
            Definiert den Ton und die Stimme, die die KI-Agenten im gesamten Buch verwenden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tonality" style={{ color: "var(--fg-3)" }}>Tonalität *</Label>
            <Select value={form.tonality} onValueChange={(v) => handleChange("tonality", v)}>
              <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
              <SelectContent style={{ background: "var(--bg-elevated)", borderColor: "var(--border-md)" }}>
                {tonalities.map((t) => <SelectItem key={t.value} value={t.value}>{t.desc}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seriesContext" style={{ color: "var(--fg-3)" }}>
              Serienkontext <span style={{ color: "var(--fg-5)" }}>(optional)</span>
            </Label>
            <Textarea
              id="seriesContext"
              placeholder="Falls dies Teil einer Serie ist, beschreibe die vorherigen Bücher und wie dieses Buch dazu passt…"
              rows={3}
              value={form.seriesContext}
              onChange={(e) => handleChange("seriesContext", e.target.value)}
              style={inputStyle}
            />
          </div>
        </CardContent>
      </Card>

      {errors.form && (
        <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(251,113,133,0.3)", background: "rgba(251,113,133,0.06)", color: "rgb(251,113,133)" }}>
          {errors.form}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-36 gap-2">
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Wird erstellt…</> : "Projekt erstellen"}
        </Button>
      </div>
    </form>
  );
}

// ─── Series Redirect ───────────────────────────────────────────────────────────

function SeriesRedirectPanel() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--bg-tint)", border: "1px solid var(--border-sm)" }}>
          <Library className="h-6 w-6" style={{ color: "var(--fg-4)" }} />
        </div>
        <h3 className="text-base font-semibold text-white">Buchserien werden über den Serien-Bereich geplant</h3>
        <p className="mt-2 max-w-sm text-sm" style={{ color: "var(--fg-4)" }}>
          Der Serien-Planer lässt dich dein Konzept definieren und nutzt KI, um die optimale Anzahl der Bücher, ihre Themen und Struktur vorzuschlagen — alles an einem Ort.
        </p>
        <Button asChild className="mt-6 gap-2">
          <Link href="/series/new">
            <Library className="h-4 w-4" />
            Zum Serien-Planer
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function NewProjectPage() {
  const [mode, setMode] = useState<Mode>("single");

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-4)" }}>
          Erstellen
        </p>
        <h1 className="text-3xl font-800 text-white" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
          Neues Projekt
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--fg-4)" }}>
          Wähle, ob du ein einzelnes Buch erstellen oder eine mehrbändige Serie planen möchtest.
        </p>
      </div>

      <ModeSelector mode={mode} onChange={setMode} />

      {mode === "single" ? <SingleBookForm /> : <SeriesRedirectPanel />}
    </div>
  );
}
