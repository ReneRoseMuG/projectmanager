import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Divider } from "./Divider";
import { SectionHeader } from "./SectionHeader";

interface SectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  fill?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** localStorage-Schlüssel für persistenten Collapse-Zustand */
  storageKey?: string;
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

/** Shared panel section for form and detail content. */
export function Section({
  title,
  description,
  actions,
  children,
  className = "",
  fill = false,
  collapsible = false,
  defaultCollapsed = false,
  storageKey,
}: SectionProps) {
  const [collapsed, setCollapsed] = useState(() =>
    storageKey ? readStoredBoolean(storageKey, defaultCollapsed) : defaultCollapsed
  );

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      if (storageKey) {
        try { window.localStorage.setItem(storageKey, String(next)); } catch { /* ignore */ }
      }
      return next;
    });
  };

  const sectionClass = fill
    ? `flex h-full min-h-0 flex-1 flex-col ${className}`
    : `rounded-lg border border-line bg-white p-2.5 shadow-panel ${className}`;

  return (
    <section className={sectionClass}>
      {title ? (
        <div
          className={
            fill ? "flex h-full min-h-0 flex-1 flex-col gap-4" : "grid gap-4"
          }
        >
          {collapsible ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="flex min-w-0 items-center gap-1.5 text-left"
                onClick={toggle}
              >
                <span className="text-sm font-semibold text-ink">{title}</span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-steel-400 transition-transform duration-150 ${collapsed ? "-rotate-90" : ""}`}
                />
              </button>
              {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
          ) : (
            <SectionHeader
              title={title}
              description={description}
              actions={actions}
            />
          )}
          {!collapsed ? (
            <>
              <Divider />
              {children}
            </>
          ) : null}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
