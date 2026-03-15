"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, CheckCircle2, Trash2, Eye, EyeOff, ExternalLink, Moon, Sun, Cpu } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/lib/theme-provider";

interface SettingState {
  key: string;
  maskedValue: string;
  isSet: boolean;
}

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const [settings, setSettings] = useState<SettingState[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiModel, setAiModel] = useState<string>("gpt-5.4");
  const [modelSaving, setModelSaving] = useState(false);

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) setSettings(data.data);

      // Load current model from DB directly
      const modelRes = await fetch("/api/settings/model");
      const modelData = await modelRes.json();
      if (modelData.value) setAiModel(modelData.value);
    } finally {
      setLoading(false);
    }
  }

  async function saveModel(model: string) {
    setAiModel(model);
    setModelSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "ai_model", value: model }),
      });
    } finally {
      setModelSaving(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function handleSave() {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "openai_api_key", value: apiKeyInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setApiKeyInput("");
        setShowKey(false);
        await loadSettings();
        showFeedback("success", "API-Schlüssel gespeichert.");
      } else {
        showFeedback("error", data.error ?? "Fehler beim Speichern.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "openai_api_key" }),
      });
      const data = await res.json();
      if (data.success) {
        await loadSettings();
        showFeedback("success", "API-Schlüssel entfernt.");
      } else {
        showFeedback("error", data.error ?? "Fehler beim Entfernen.");
      }
    } finally {
      setDeleting(false);
    }
  }

  const openAiSetting = settings.find((s) => s.key === "openai_api_key");
  const isDark = theme === "dark";

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-4)" }}>
          Konfiguration
        </p>
        <h1 className="text-3xl font-800 text-white" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
          Einstellungen
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--fg-3)" }}>
          API-Schlüssel, Darstellung und Integrationen konfigurieren.
        </p>
      </div>

      {feedback && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={
            feedback.type === "success"
              ? { borderColor: "rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.07)", color: "rgb(52,211,153)" }
              : { borderColor: "rgba(251,113,133,0.3)", background: "rgba(251,113,133,0.07)", color: "rgb(251,113,133)" }
          }
        >
          {feedback.message}
        </div>
      )}

      {/* Dark Mode Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "var(--bg-tint)", border: "1px solid var(--border-md)" }}
            >
              {isDark ? (
                <Moon className="h-4 w-4" style={{ color: "var(--fg-accent)" }} />
              ) : (
                <Sun className="h-4 w-4" style={{ color: "rgb(245,158,11)" }} />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-base text-white">Darstellung</CardTitle>
              <CardDescription style={{ color: "var(--fg-3)" }}>
                Zwischen Dunkel- und Hellmodus wechseln.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-sm)" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <Moon className="h-4 w-4" style={{ color: isDark ? "var(--fg-accent)" : "var(--fg-5)" }} />
                <Sun className="h-4 w-4" style={{ color: !isDark ? "rgb(245,158,11)" : "var(--fg-5)" }} />
              </div>
              <span className="text-sm text-white">
                {isDark ? "Dunkelmodus aktiv" : "Hellmodus aktiv"}
              </span>
            </div>
            <button
              onClick={toggle}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
              style={{
                background: isDark ? "rgba(124,92,252,0.5)" : "rgba(245,158,11,0.5)",
              }}
              aria-label="Modus wechseln"
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200"
                style={{ transform: isDark ? "translateX(6px)" : "translateX(22px)" }}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* AI Model Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "var(--bg-tint)", border: "1px solid var(--border-md)" }}
            >
              <Cpu className="h-4 w-4" style={{ color: "var(--fg-accent)" }} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base text-white">KI-Modell</CardTitle>
              <CardDescription style={{ color: "var(--fg-3)" }}>
                Modell für alle KI-Agenten (Plan, Kapitel, QA).
              </CardDescription>
            </div>
            {modelSaving && <Loader2 className="h-4 w-4 animate-spin ml-auto" style={{ color: "var(--fg-4)" }} />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                id: "gpt-5.4",
                name: "GPT-5.4",
                badge: "Beste Qualität",
                badgeColor: "rgba(52,211,153,0.15)",
                badgeText: "rgb(52,211,153)",
                desc: "Neuestes Flaggschiff-Modell — stärkste Schreibqualität, ~45s/Kap.",
              },
              {
                id: "gpt-5-mini",
                name: "GPT-5 mini",
                badge: "5× schneller",
                badgeColor: "rgba(245,158,11,0.15)",
                badgeText: "rgb(245,158,11)",
                desc: "Sehr gute Qualität, deutlich schneller — ca. 8–12s pro Kapitel",
              },
            ].map((m) => {
              const isSelected = aiModel === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => saveModel(m.id)}
                  className="text-left rounded-xl px-4 py-3 transition-all duration-150"
                  style={{
                    background: isSelected ? "var(--bg-tint-md)" : "var(--bg-tint)",
                    border: `1px solid ${isSelected ? "var(--border-md)" : "var(--border-xs)"}`,
                    outline: "none",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-white">{m.name}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: m.badgeColor, color: m.badgeText }}
                    >
                      {m.badge}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="ml-auto h-3.5 w-3.5" style={{ color: "var(--fg-accent)" }} />
                    )}
                  </div>
                  <p className="text-xs leading-snug" style={{ color: "var(--fg-4)" }}>{m.desc}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* OpenAI API Key */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "var(--bg-tint)", border: "1px solid var(--border-md)" }}
            >
              <KeyRound className="h-4 w-4" style={{ color: "var(--fg-accent)" }} />
            </div>
            <div>
              <CardTitle className="text-base text-white">OpenAI API-Schlüssel</CardTitle>
              <CardDescription style={{ color: "var(--fg-3)" }}>
                Wird von den KI-Agenten zur Inhaltsgenerierung via GPT-4o verwendet.
              </CardDescription>
            </div>
            {!loading && openAiSetting?.isSet && (
              <CheckCircle2 className="ml-auto h-5 w-5 shrink-0" style={{ color: "rgb(52,211,153)" }} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--fg-3)" }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Lädt…
            </div>
          ) : (
            <>
              {openAiSetting?.isSet && (
                <div
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "var(--bg-tint)", border: "1px solid var(--border-sm)" }}
                >
                  <div>
                    <p className="mb-0.5 text-xs" style={{ color: "var(--fg-4)" }}>Aktueller Schlüssel</p>
                    <p className="font-mono text-sm" style={{ color: "var(--fg-accent)" }}>
                      {openAiSetting.maskedValue}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="gap-1.5 text-xs"
                    style={{ color: "rgb(251,113,133)" }}
                  >
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Entfernen
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="apiKey" style={{ color: "var(--fg-3)" }}>
                  {openAiSetting?.isSet ? "Mit neuem Schlüssel ersetzen" : "API-Schlüssel eingeben"}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="apiKey"
                      type={showKey ? "text" : "password"}
                      placeholder="sk-proj-..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      className="pr-10 font-mono text-sm"
                      style={{
                        background: "var(--bg-input)",
                        borderColor: "var(--border-md)",
                        color: "var(--fg-1)",
                      }}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: "var(--fg-4)" }}
                      tabIndex={-1}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button onClick={handleSave} disabled={saving || !apiKeyInput.trim()} className="shrink-0 gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Speichern
                  </Button>
                </div>
                <p className="text-xs" style={{ color: "var(--fg-5)" }}>
                  Lokal in SQLite gespeichert — wird ausschließlich an OpenAI übertragen.
                </p>
              </div>

              <div>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: "var(--fg-4)" }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  API-Schlüssel bei platform.openai.com erstellen
                </a>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
