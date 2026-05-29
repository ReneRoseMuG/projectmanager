import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FormSidebarProps {
  children: ReactNode;
  defaultWidth?: number;
  storageKey?: string;
  className?: string;
}

const MIN_WIDTH = 160;
const MAX_WIDTH = 340;
const COLLAPSED_WIDTH = 32;
const DEFAULT_WIDTH = 240;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clampWidth(value: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
}

function readStoredNumber(key: string, fallback: number): number {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? Number(stored) : NaN;
    return Number.isFinite(parsed) ? clampWidth(parsed) : fallback;
  } catch {
    return fallback;
  }
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === "true") {
      return true;
    }
    if (stored === "false") {
      return false;
    }
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
  defaultWidth = DEFAULT_WIDTH,
  storageKey = "form-sidebar",
  className = "",
}: FormSidebarProps) {
  const widthKey = `${storageKey}-width`;
  const collapsedKey = `${storageKey}-collapsed`;
  const initialWidth = useMemo(() => clampWidth(defaultWidth), [defaultWidth]);
  const [width, setWidth] = useState(() => readStoredNumber(widthKey, initialWidth));
  const [collapsed, setCollapsed] = useState(() => readStoredBoolean(collapsedKey, isNarrowViewport()));
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(widthKey, String(width));
      } catch {
        // localStorage may be unavailable in privacy mode.
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [width, widthKey]);

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

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const dragStart = dragStartRef.current;
      if (!dragStart) {
        return;
      }
      const delta = dragStart.startX - event.clientX;
      setWidth(clampWidth(dragStart.startWidth + delta));
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (dragStartRef.current) {
        document.body.style.userSelect = "";
      }
    };
  }, []);

  return (
    <aside
      className={cn(
        "relative flex min-h-0 shrink-0 flex-col border-l border-line bg-shell transition-[width] duration-150",
        className
      )}
      style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
      data-testid="form-sidebar"
    >
      {!collapsed ? (
        <button
          type="button"
          aria-label="Sidebar-Breite ändern"
          title="Sidebar-Breite ändern"
          className="absolute -left-0.5 top-0 z-10 h-full w-1 cursor-col-resize bg-transparent hover:bg-steel-300/60"
          onMouseDown={(event) => {
            dragStartRef.current = { startX: event.clientX, startWidth: width };
            document.body.style.userSelect = "none";
          }}
        />
      ) : null}
      <button
        type="button"
        aria-label={collapsed ? "Stammdaten öffnen" : "Stammdaten schließen"}
        title={collapsed ? "Stammdaten öffnen" : "Stammdaten schließen"}
        className="absolute -left-4 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-steel-600 shadow-sm transition hover:border-steel-400 hover:text-ink focus:outline-none focus:ring-2 focus:ring-steel-700/10"
        onClick={() => setCollapsed((current) => !current)}
      >
        {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
      {collapsed ? (
        <div className="flex h-full min-h-0 items-center justify-center overflow-hidden">
          <span className="-rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-steel-500">
            Stammdaten
          </span>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-4">{children}</div>
        </div>
      )}
    </aside>
  );
}
