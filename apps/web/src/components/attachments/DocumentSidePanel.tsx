import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

// Dunkles, kollabierbares Seiten-Panel im Stil des Admin-Rails (MS-75 DMS-Layout).
// Wird sowohl für die linke Verwaltungsspalte (Sammlungen/Kategorien/Upload) als auch
// für das rechte Detail-Panel genutzt, damit Collapse-Logik und Optik nur an EINER
// Stelle leben. Der Collapse-Zustand ist pro `storageKey` in localStorage persistent.
// Ab `lg` klebt das Panel am Rand (sticky) und scrollt bei Bedarf in sich selbst;
// darunter läuft es normal im Fluss mit und die Spalten stapeln.

interface DocumentSidePanelProps {
  side: "left" | "right";
  title: string;
  storageKey: string;
  railIcon: LucideIcon;
  headerActions?: ReactNode;
  children: ReactNode;
}

export function DocumentSidePanel({
  side,
  title,
  storageKey,
  railIcon: RailIcon,
  headerActions,
  children,
}: DocumentSidePanelProps) {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(storageKey) === "true",
  );

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  }

  const toggleLabel = collapsed ? `${title} aufklappen` : `${title} einklappen`;
  const ToggleIcon = collapsed
    ? side === "left"
      ? PanelLeftOpen
      : PanelRightOpen
    : side === "left"
      ? PanelLeftClose
      : PanelRightClose;

  const width = collapsed
    ? "w-14"
    : side === "left"
      ? "w-full lg:w-[280px]"
      : "w-full lg:w-[380px]";

  return (
    <aside
      className={`flex shrink-0 flex-col overflow-hidden rounded-lg bg-gradient-to-b from-steel-800 to-steel-900 text-white shadow-panel transition-[width] duration-200 lg:sticky lg:top-0 lg:max-h-[calc(100vh-3rem)] lg:self-start ${width}`}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-3 px-2 py-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={toggleLabel}
            title={toggleLabel}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <ToggleIcon size={17} />
          </button>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/[0.08] text-white/80"
            title={title}
          >
            <RailIcon size={16} />
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/[0.08] text-white/85">
              <RailIcon size={15} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
              {title}
            </span>
            {headerActions}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={toggleLabel}
              title={toggleLabel}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <ToggleIcon size={16} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
            {children}
          </div>
        </>
      )}
    </aside>
  );
}
