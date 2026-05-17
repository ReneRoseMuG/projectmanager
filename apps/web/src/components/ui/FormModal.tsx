import { Save, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  breadcrumb?: string[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  saving?: boolean;
  submitLabel?: string;
  children: ReactNode;
}

/** Form modal template with shared gradient header, scroll body and fixed footer. */
export function FormModal({ open, onClose, title, subtitle, icon, breadcrumb = [], onSubmit, saving = false, submitLabel = "Speichern", children }: FormModalProps) {
  return (
    <Modal open={open} title={title} size="xl" showHeader={false} bodyClassName="p-0" onClose={onClose}>
      <form className="flex max-h-[calc(100vh-64px)] flex-col bg-shell" onSubmit={onSubmit}>
        <header className="relative overflow-hidden bg-gradient-to-br from-steel-700 to-steel-600 px-5 py-5 text-white md:px-6">
          <div className="pointer-events-none absolute -right-8 -top-32 h-80 w-80 rounded-full bg-white/12 blur-sm" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="grid gap-2">
              {breadcrumb.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-white/75">
                  {breadcrumb.map((item, index) => (
                    <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
                      {index > 0 ? <span>›</span> : null}
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                {icon ? <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/12 text-white">{icon}</span> : null}
                <div>
                  <h2 className="text-2xl font-bold tracking-normal">{title}</h2>
                  {subtitle ? <p className="text-sm text-white/75">{subtitle}</p> : null}
                </div>
              </div>
            </div>
            <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white" aria-label="Schließen" title="Schließen" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="grid flex-1 gap-4 overflow-auto p-4 md:p-5">{children}</div>

        <footer className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white px-5 py-4">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
            {submitLabel}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
