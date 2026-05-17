import { Link2, MoreHorizontal, X } from "lucide-react";
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
  children: ReactNode;
}

/** Detail view modal template with shared header, tabs, scroll body and footer. */
export function DetailModal<T extends string>({ open, onClose, title, subtitle, metaPills, metaInfo, breadcrumb = [], tabs, activeTab, onTabChange, footer, children }: DetailModalProps<T>) {
  return (
    <Modal open={open} title={title} size="xl" showHeader={false} bodyClassName="p-0" onClose={onClose}>
      <div className="flex max-h-[calc(100vh-64px)] flex-col bg-shell">
        <header className="relative overflow-hidden border-b border-steel-700 bg-gradient-to-br from-steel-700 to-steel-600 px-5 py-5 text-white md:px-6">
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
              <div className="flex items-center gap-2">
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/12 hover:text-white" aria-label="Link kopieren" title="Link kopieren">
                  <Link2 size={17} />
                </button>
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/12 hover:text-white" aria-label="Mehr Optionen" title="Mehr Optionen">
                  <MoreHorizontal size={18} />
                </button>
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/12 hover:text-white" aria-label="Schließen" title="Schließen" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="max-w-[760px] text-2xl font-bold leading-tight tracking-normal text-white md:text-3xl">{title}</h2>
                {subtitle ? <span className="inline-flex min-h-6 items-center rounded-full border border-white/15 bg-white/10 px-2 text-xs font-semibold text-white">{subtitle}</span> : null}
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

        <TabBar tabs={tabs} active={activeTab} onChange={onTabChange} />
        <main className="min-h-[420px] flex-1 overflow-auto p-4 md:p-5">{children}</main>
        {footer ? <footer className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white px-5 py-4">{footer}</footer> : null}
      </div>
    </Modal>
  );
}
