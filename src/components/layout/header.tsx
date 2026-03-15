"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBreadcrumb } from "@/lib/breadcrumb-store";

function getBreadcrumbs(
  pathname: string,
  projectTitle: string | null
): Array<{ label: string; href: string }> {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Array<{ label: string; href: string }> = [
    { label: "Übersicht", href: "/" },
  ];

  let path = "";
  for (const segment of segments) {
    path += `/${segment}`;
    if (segment === "projects")      crumbs.push({ label: "Projekte", href: path });
    else if (segment === "series")   crumbs.push({ label: "Serien", href: path });
    else if (segment === "new")      crumbs.push({ label: "Neu", href: path });
    else if (segment === "settings") crumbs.push({ label: "Einstellungen", href: path });
    else if (segment === "chapters") crumbs.push({ label: "Kapitel", href: path });
    else if (segment.length > 10 && /^[a-z0-9]+$/i.test(segment)) {
      // This is an ID segment — use project title if available and we're in /projects/[id]
      const label =
        projectTitle && path.startsWith("/projects/") && !path.includes("/chapters/")
          ? projectTitle
          : segment.slice(0, 8) + "…";
      crumbs.push({ label, href: path });
    } else {
      crumbs.push({ label: segment.charAt(0).toUpperCase() + segment.slice(1), href: path });
    }
  }

  return crumbs;
}

export function Header() {
  const pathname = usePathname();
  const { projectTitle } = useBreadcrumb();
  const breadcrumbs = getBreadcrumbs(pathname, projectTitle);
  const showNewProjectButton = pathname === "/" || pathname === "/projects";

  return (
    <header
      className="flex items-center justify-between px-6 header-bg"
      style={{ height: "52px" }}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3 w-3" style={{ color: "var(--fg-5)" }} />
            )}
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium text-white">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="transition-colors"
                style={{ color: "var(--fg-3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg-accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-3)")}
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {showNewProjectButton && (
          <Button
            asChild
            size="sm"
            className="btn-glow gap-2 text-xs font-medium"
            style={{
              background: "linear-gradient(135deg,#7c5cfc,#a78bfa)",
              border: "none",
              color: "white",
            }}
          >
            <Link href="/projects/new">
              <PlusCircle className="h-3.5 w-3.5" />
              Neues Projekt
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
