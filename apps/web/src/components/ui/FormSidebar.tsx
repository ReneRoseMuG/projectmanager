import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface FormSidebarProps {
  children: ReactNode;
  storageKey?: string;
  className?: string;
}

const FIXED_WIDTH = 260;
const COLLAPSED_WIDTH = 12;

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
        "flex min-h-0 shrink-0 flex-row border-l border-line bg-steel-100 transition-[width] duration-150",
        className,
      )}
      style={{ width: collapsed ? COLLAPSED_WIDTH : FIXED_WIDTH }}
      data-testid="form-sidebar"
    >
      <button
        type="button"
        aria-label={collapsed ? "Stammdaten öffnen" : "Stammdaten schließen"}
        title={collapsed ? "Stammdaten öffnen" : "Stammdaten schließen"}
        className="flex w-3 shrink-0 cursor-col-resize flex-col items-center justify-center gap-[3px] transition-colors hover:bg-steel-200 focus:outline-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        {collapsed ? (
          <span
            className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-steel-500"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Stammdaten
          </span>
        ) : (
          <>
            <span className="h-[3px] w-[3px] rounded-full bg-steel-400" />
            <span className="h-[3px] w-[3px] rounded-full bg-steel-400" />
            <span className="h-[3px] w-[3px] rounded-full bg-steel-400" />
          </>
        )}
      </button>
      <div
        className="min-h-0 flex-1 overflow-y-auto p-3 transition-opacity duration-150"
        style={{
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? "none" : "auto",
        }}
      >
        <div className="grid gap-2.5">{children}</div>
      </div>
    </aside>
  );
}
