import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FormSidebarProps {
  children: ReactNode;
  storageKey?: string;
  className?: string;
}

const FIXED_WIDTH = 260;
const COLLAPSED_WIDTH = 32;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === "true") return true;
    if (stored === "false") return false;
    return fallback;
  } catch {
    return fallback;
  }
}

function isNarrowViewport(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches;
}

export function FormSidebar({
  children,
  storageKey = "form-sidebar",
  className = "",
}: FormSidebarProps) {
  const collapsedKey = `${storageKey}-collapsed`;
  const [collapsed, setCollapsed] = useState(() => readStoredBoolean(collapsedKey, isNarrowViewport()));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(collapsedKey, String(collapsed));
      } catch {
        // localStorage may be unavailable in privacy mode.
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [collapsed, collapsedKey]);

  return (
    <aside
      className={cn(
        "flex min-h-0 shrink-0 flex-col border-l border-line bg-steel-100 transition-[width] duration-150",
        className,
      )}
      style={{ width: collapsed ? COLLAPSED_WIDTH : FIXED_WIDTH }}
      data-testid="form-sidebar"
    >
      {collapsed ? (
        <button
          type="button"
          aria-label="Stammdaten öffnen"
          title="Stammdaten öffnen"
          className="flex h-8 w-full items-center justify-center text-steel-400 transition hover:bg-steel-100 hover:text-ink focus:outline-none"
          onClick={() => setCollapsed(false)}
        >
          <ChevronLeft size={16} />
        </button>
      ) : (
        <div className="flex items-center border-b border-line px-2 py-1.5">
          <button
            type="button"
            aria-label="Stammdaten schließen"
            title="Stammdaten schließen"
            className="flex h-7 w-7 items-center justify-center rounded-md text-steel-400 transition hover:bg-steel-100 hover:text-ink focus:outline-none"
            onClick={() => setCollapsed(true)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      {collapsed ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <span className="-rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-steel-500">
            Stammdaten
          </span>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3">
          <div className="grid min-w-0 gap-2.5">{children}</div>
        </div>
      )}
    </aside>
  );
}
