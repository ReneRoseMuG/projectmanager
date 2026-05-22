import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { TabBar, type Tab } from "./TabBar";

interface DetailModalProps<T extends string> {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  metaPills?: ReactNode;
  metaInfo?: ReactNode;
  breadcrumb?: string[];
  tabs: Array<Tab<T>>;
  activeTab: T;
  onTabChange: (tab: T) => void;
  footer?: ReactNode;
  variant?: "modal" | "page";
  children: ReactNode;
}

/** Shared detail template; renders either as modal chrome or as full page content. */
export function DetailModal<T extends string>({ open, onClose, title, subtitle, metaPills, metaInfo, breadcrumb = [], tabs, activeTab, onTabChange, footer, variant = "modal", children }: DetailModalProps<T>) {
  if (!open) {
    return null;
  }

  const isPage = variant === "page";

  const detail = (
    <div className={isPage ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-shell shadow-panel" : "flex max-h-[calc(100vh-64px)] flex-col bg-shell"}>
      <header className={`relative overflow-hidden border-b border-steel-700 bg-gradient-to-br from-steel-700 to-steel-600 px-5 py-5 text-white md:px-6 ${isPage ? "" : "shrink-0"}`}>
        <div className="pointer-events-none absolute -right-8 -top-32 h-80 w-80 rounded-full bg-white/12 blur-sm" />
        <div className="relative grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {breadcrumb.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-white/70">
                {breadcrumb.map((item, index) => (
                  <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
                    {index > 0 ? <span>/</span> : null}
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span />
            )}
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/12 hover:text-white" aria-label="Schließen" title="Schließen" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="max-w-[760px] text-2xl font-bold leading-tight tracking-normal text-white md:text-3xl">{title}</h2>
              {subtitle ? <span className="inline-flex min-h-6 items-center rounded-md border border-white/15 bg-white/10 px-2 text-xs font-semibold text-white">{subtitle}</span> : null}
            </div>
            {metaPills || metaInfo ? (
              <div className="flex flex-wrap items-center gap-2">
                {metaPills}
                {metaInfo}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className={isPage ? "shrink-0 shadow-sm" : "shrink-0"}>
        <TabBar tabs={tabs} active={activeTab} onChange={onTabChange} />
      </div>
      <main className={isPage ? "flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 pt-4 md:px-5 md:pt-5" : "min-h-0 flex-1 overflow-auto p-4 md:p-5"}>{children}</main>
      {footer ? (
        <footer className="shrink-0 border-t border-line bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-end gap-3">{footer}</div>
        </footer>
      ) : null}
    </div>
  );

  if (variant === "page") {
    return detail;
  }

  return (
    <Modal open={open} title={title} size="xl" showHeader={false} bodyClassName="p-0" onClose={onClose}>
      {detail}
    </Modal>
  );
}
