export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Library, PlusCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SeriesStatus } from "@/types";

async function getAllSeries() {
  try {
    return await prisma.bookSeries.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { projects: true } } },
    });
  } catch { return []; }
}

const statusMap: Record<SeriesStatus, { label: string; variant: string }> = {
  PLANNING:  { label: "Planung",        variant: "planning" },
  ACTIVE:    { label: "Aktiv",          variant: "generating" },
  COMPLETED: { label: "Abgeschlossen",  variant: "completed" },
  ARCHIVED:  { label: "Archiviert",     variant: "archived" },
};

function SeriesStatusBadge({ status }: { status: SeriesStatus }) {
  const { label, variant } = statusMap[status] ?? statusMap.PLANNING;
  return <Badge variant={variant as Parameters<typeof Badge>[0]["variant"]}>{label}</Badge>;
}

export default async function SeriesPage() {
  const seriesList = await getAllSeries();

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-4)" }}>
            Bibliothek
          </p>
          <h1 className="text-3xl font-800 text-white" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            Buchserien
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--fg-4)" }}>
            Mehrbändige Serien planen und mit KI verwalten.
          </p>
        </div>
        <Button asChild className="gap-2 btn-glow">
          <Link href="/series/new">
            <PlusCircle className="h-4 w-4" />
            Neue Serie
          </Link>
        </Button>
      </div>

      {seriesList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--bg-tint)", border: "1px solid var(--border-sm)" }}>
              <Library className="h-7 w-7" style={{ color: "var(--fg-4)" }} />
            </div>
            <h3 className="text-base font-600 text-white" style={{ fontWeight: 600 }}>Noch keine Serien</h3>
            <p className="mt-2 text-sm" style={{ color: "var(--fg-4)" }}>
              Erstelle deine erste Buchserie, um ein mehrbändiges Projekt mit KI zu planen.
            </p>
            <Button asChild className="mt-6 gap-2">
              <Link href="/series/new">
                <PlusCircle className="h-4 w-4" />
                Erste Serie erstellen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seriesList.map((series) => (
            <Card key={series.id} className="group hover:border-violet-500/20 transition-all duration-200">
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-base font-semibold text-white">
                    {series.title}
                  </h3>
                  <SeriesStatusBadge status={series.status as SeriesStatus} />
                </div>

                <p className="mb-4 line-clamp-3 text-sm" style={{ color: "var(--fg-3)" }}>
                  {series.topic}
                </p>

                <div className="mb-4 flex flex-wrap gap-2 text-xs" style={{ color: "var(--fg-4)" }}>
                  <span className="rounded-md px-2 py-1" style={{ background: "var(--bg-tint)" }}>
                    {series._count.projects === 1 ? "1 Buch" : `${series._count.projects} Bücher`}
                  </span>
                  <span className="rounded-md px-2 py-1" style={{ background: "var(--bg-tint)" }}>{series.language}</span>
                  <span className="rounded-md px-2 py-1" style={{ background: "var(--bg-tint)" }}>{series.tonality}</span>
                </div>

                <Button asChild variant="ghost" size="sm" className="w-full gap-1 text-xs">
                  <Link href={`/series/${series.id}`}>
                    Öffnen <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
