"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Library,
  PlusCircle,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/",             label: "Übersicht",        icon: LayoutDashboard },
  { href: "/series",       label: "Serien",            icon: Library },
  { href: "/projects",     label: "Projekte",          icon: BookOpen },
  { href: "/projects/new", label: "Neues Projekt",     icon: PlusCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col sidebar-bg">
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: "1px solid var(--border-xs)" }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "linear-gradient(135deg,#7c5cfc,#a78bfa)" }}
        >
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-700 text-white" style={{ fontWeight: 700 }}>
            E-Book Factory
          </p>
          <p className="truncate text-xs" style={{ color: "var(--fg-3)" }}>
            KI-Agenten
          </p>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-5 pt-6 pb-2">
        <span
          className="text-xs font-600 uppercase tracking-widest"
          style={{ color: "var(--fg-4)", fontWeight: 600 }}
        >
          Menü
        </span>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "nav-active"
                    : "text-zinc-500 hover:bg-white/4 hover:text-zinc-200"
                )}
                style={
                  isActive
                    ? {}
                    : undefined
                }
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  style={isActive ? { color: "var(--fg-accent)" } : undefined}
                />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Settings group */}
        <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border-xs)" }}>
          <div className="px-2 pb-2">
            <span
              className="text-xs font-600 uppercase tracking-widest"
              style={{ color: "var(--fg-4)", fontWeight: 600 }}
            >
              System
            </span>
          </div>
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
              pathname === "/settings"
                ? "nav-active"
                : "text-zinc-500 hover:bg-white/4 hover:text-zinc-200"
            )}
          >
            <Settings
              className="h-4 w-4 shrink-0"
              style={pathname === "/settings" ? { color: "var(--fg-accent)" } : undefined}
            />
            Einstellungen
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid var(--border-xs)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "rgb(52 211 153)" }}
          />
          <p className="text-xs" style={{ color: "var(--fg-4)" }}>
            Bereit
          </p>
        </div>
      </div>
    </aside>
  );
}
