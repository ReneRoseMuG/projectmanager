import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  type LucideIcon,
} from "lucide-react";
import {
  forwardRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

// Dunkles, kollabierbares Seiten-Panel im Stil des Admin-Rails (MS-75 DMS-Layout).
// Wird für die linke Verwaltungsspalte und das rechte Detail-Panel genutzt, damit
// Collapse-Logik und Optik nur an EINER Stelle leben. Der Collapse-Zustand ist pro
// `storageKey` in localStorage persistent. Ab `lg` klebt das Panel am Rand (sticky) und
// scrollt bei Bedarf in sich selbst; darunter läuft es normal im Fluss mit und stapelt.
//
// Beide Panels können eine dynamische Breite bekommen: `widthPx` setzt die Breite (ab `lg`).
// Rechts stammt der Wert aus dem Zieh-Griff (`onResizeStart`), links wird er inhaltsgesteuert
// berechnet, damit lange Sammlungs- und Kategorienamen ausgeschrieben bleiben. Ohne `widthPx`
// gilt die feste responsive Breite als Fallback.

interface DocumentSidePanelProps {
  side: "left" | "right";
  title: string;
  storageKey: string;
  railIcon: LucideIcon;
  headerActions?: ReactNode;
  children: ReactNode;
  widthPx?: number;
  onResizeStart?: (event: ReactMouseEvent) => void;
}

export const DocumentSidePanel = forwardRef<HTMLElement, DocumentSidePanelProps>(
  function DocumentSidePanel(
    {
      side,
      title,
      storageKey,
      railIcon: RailIcon,
      headerActions,
      children,
      widthPx,
      onResizeStart,
    },
    ref,
  ) {
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

    const useStyleWidth = !collapsed && widthPx != null;
    const widthClass = collapsed
      ? "w-14"
      : useStyleWidth
        ? "max-lg:!w-full"
        : side === "left"
          ? "w-full lg:w-[280px]"
          : "w-full lg:w-[440px] xl:w-[560px] 2xl:w-[680px]";

    return (
      <aside
        ref={ref}
        style={useStyleWidth ? { width: widthPx } : undefined}
        className={`relative flex shrink-0 flex-col overflow-hidden rounded-lg bg-gradient-to-b from-steel-800 to-steel-900 text-white shadow-panel lg:sticky lg:top-0 lg:max-h-full lg:self-start ${useStyleWidth && side === "right" ? "" : "transition-[width] duration-200"} ${widthClass}`}
      >
        {side === "right" && !collapsed && onResizeStart ? (
          <div
            onMouseDown={onResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label="Panelbreite ziehen"
            title="Breite ziehen"
            className="absolute inset-y-0 left-0 z-10 hidden w-2 cursor-col-resize transition-colors hover:bg-white/25 lg:block"
          />
        ) : null}
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
  },
);
