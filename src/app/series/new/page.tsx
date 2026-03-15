"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Library, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FormData {
  title: string; topic: string; targetAudience: string; language: string; tonality: string;
}

const initialForm: FormData = { title: "", topic: "", targetAudience: "", language: "German", tonality: "Professional" };

const tonalities = [
  { value: "Professional",   desc: "Professionell — formell, autoritär" },
  { value: "Conversational", desc: "Gesprächig — freundlich, direkt" },
  { value: "Academic",       desc: "Akademisch — wissenschaftlich, referenzreich" },
  { value: "Motivational",   desc: "Motivierend — inspirierend, handlungsfördernd" },
  { value: "Storytelling",   desc: "Erzählend — narrativ, anekdotenreich" },
  { value: "Technical",      desc: "Technisch — präzise, terminologiefokussiert" },
];

export default function NewSeriesPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 3)         e.title = "Titel muss mindestens 3 Zeichen haben";
    if (form.topic.trim().length < 10)         e.topic = "Konzept muss mindestens 10 Zeichen haben";
    if (form.targetAudience.trim().length < 5) e.targetAudience = "Bitte die Zielgruppe beschreiben";
    if (!form.tonality)                        e.tonality = "Bitte eine Tonalität wählen";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim(), topic: form.topic.trim(), targetAudience: form.targetAudience.trim(), language: form.language, tonality: form.tonality }),
      });
      const result = await res.json();
      if (result.success) router.push(`/series/${result.data.id}`);
      else setErrors({ form: result.error ?? "Fehler beim Erstellen der Serie" });
    } catch {
      setErrors({ form: "Netzwerkfehler. Bitte erneut versuchen." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle = { background: "var(--bg-input)", borderColor: "var(--border-md)", color: "var(--fg-1)" };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-4)" }}>
          Erstellen
        </p>
        <h1 className="text-3xl font-800 text-white" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
          Neue Buchserie
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--fg-4)" }}>
          Definiere dein Serienkonzept und lass die KI vorschlagen, wie viele Bücher entstehen sollen und was jedes davon behandelt.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Serienidentität */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Library className="h-4 w-4" style={{ color: "var(--fg-accent)" }} />
              Serienidentität
            </CardTitle>
            <CardDescription style={{ color: "var(--fg-4)" }}>
              Das Kernkonzept und die Zielgruppe deiner Buchserie.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" style={{ color: "var(--fg-3)" }}>Serientitel *</Label>
              <Input id="title" placeholder='z.B. "Die Produktivitäts-Trilogie" oder "Python meistern"' value={form.title} onChange={(e) => handleChange("title", e.target.value)} style={inputStyle} />
              {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic" style={{ color: "var(--fg-3)" }}>Gesamtkonzept *</Label>
              <Textarea
                id="topic"
                placeholder="Beschreibe das übergeordnete Thema, die Hauptthese und was die komplette Serie vermitteln oder erforschen soll. Je mehr Details du angibst, desto besser kann die KI einzelne Bücher planen…"
                rows={5}
                value={form.topic}
                onChange={(e) => handleChange("topic", e.target.value)}
                style={inputStyle}
              />
              {errors.topic && <p className="text-xs text-red-400">{errors.topic}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience" style={{ color: "var(--fg-3)" }}>Zielgruppe *</Label>
              <Input id="targetAudience" placeholder='z.B. "Unternehmer und Führungskräfte im digitalen Bereich, 30–55 Jahre"' value={form.targetAudience} onChange={(e) => handleChange("targetAudience", e.target.value)} style={inputStyle} />
              {errors.targetAudience && <p className="text-xs text-red-400">{errors.targetAudience}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Sprache & Stil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-white">Sprache & Stil</CardTitle>
            <CardDescription style={{ color: "var(--fg-4)" }}>
              Diese Einstellungen werden auf jedes Buch der Serie angewendet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="tonality" style={{ color: "var(--fg-3)" }}>Tonalität *</Label>
                <Select value={form.tonality} onValueChange={(v) => handleChange("tonality", v)}>
                  <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: "var(--bg-elevated)", borderColor: "var(--border-md)" }}>
                    {tonalities.map((t) => <SelectItem key={t.value} value={t.value}>{t.desc}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.tonality && <p className="text-xs text-red-400">{errors.tonality}</p>}
              </div>
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
          <Button type="submit" disabled={isSubmitting} className="min-w-44 gap-2">
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Serie wird erstellt…</> : "Serie erstellen"}
          </Button>
        </div>
      </form>
    </div>
  );
}
