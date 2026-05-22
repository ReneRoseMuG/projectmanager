import { AlertTriangle, Info, ShieldAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "./Button";

export type ConfirmSeverity = "danger" | "warn" | "info";

export interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  severity?: ConfirmSeverity;
  confirmLabel?: string;
  cancelLabel?: string;
  requireCheck?: string;
}

interface ConfirmDialogProps {
  open: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

const toneMap: Record<ConfirmSeverity, { icon: ReactNode; iconClass: string; buttonVariant: "primary" | "danger" }> = {
  danger: { icon: <ShieldAlert size={22} />, iconClass: "bg-crimson/10 text-crimson", buttonVariant: "danger" },
  warn: { icon: <AlertTriangle size={22} />, iconClass: "bg-tangerine/10 text-tangerine", buttonVariant: "primary" },
  info: { icon: <Info size={22} />, iconClass: "bg-steel-100 text-steel-700", buttonVariant: "primary" }
};

export function ConfirmDialog({ open, options, onConfirm, onCancel }: ConfirmDialogProps) {
  const [checked, setChecked] = useState(false);
  const severity = options.severity ?? "warn";
  const tone = toneMap[severity];
  const compact = severity === "info" && !options.requireCheck;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-steel-900/55 p-4 backdrop-blur-[2px]">
      <section className="w-full max-w-md overflow-hidden rounded-lg border border-line bg-white shadow-modal" role="alertdialog" aria-modal="true">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex items-start gap-3">
            {!compact ? <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${tone.iconClass}`}>{tone.icon}</span> : null}
            <div>
              <h2 className="text-base font-bold text-ink">{options.title}</h2>
              {options.body ? <div className="mt-1 text-sm leading-6 text-steel-600">{options.body}</div> : null}
            </div>
          </div>
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-steel-500 hover:bg-shell hover:text-ink" aria-label="Schließen" onClick={onCancel}>
            <X size={16} />
          </button>
        </header>
        {options.requireCheck ? (
          <label className="mx-5 mt-4 flex items-start gap-3 rounded-lg border border-line bg-shell/60 p-3 text-sm text-ink">
            <input className="mt-1 h-4 w-4" type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
            <span>{options.requireCheck}</span>
          </label>
        ) : null}
        <footer className="flex justify-end gap-2 px-5 py-4">
          <Button onClick={onCancel}>{options.cancelLabel ?? "Abbrechen"}</Button>
          <Button variant={tone.buttonVariant} disabled={Boolean(options.requireCheck) && !checked} onClick={onConfirm}>
            {options.confirmLabel ?? "Bestätigen"}
          </Button>
        </footer>
      </section>
    </div>
  );
}
