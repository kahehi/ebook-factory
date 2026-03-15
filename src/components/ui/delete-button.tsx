"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteButtonProps {
  id: string;
  type: "project" | "series";
  name: string;
}

export function DeleteButton({ id, type, name }: DeleteButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const url = type === "project" ? `/api/projects/${id}` : `/api/series/${id}`;
    try {
      await fetch(url, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs" style={{ color: "var(--fg-4)" }}>Löschen?</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ja"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          Nein
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 hover:bg-red-500/10"
      onClick={(e) => { e.preventDefault(); setConfirming(true); }}
      title={`${name} löschen`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
