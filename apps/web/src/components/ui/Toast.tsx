import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export type ToastTone = "success" | "error" | "warn" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export interface ToastViewModel {
  id: number;
  title: string;
  body?: ReactNode;
  tone: ToastTone;
  duration: number | "persistent";
  actions?: ToastAction[];
}

interface ToastProps {
  toast: ToastViewModel;
  onDismiss: (id: number) => void;
}

const toneClasses: Record<ToastTone, { border: string; icon: string; iconNode: ReactNode }> = {
  success: { border: "border-l-fern", icon: "bg-fern/10 text-fern", iconNode: <CheckCircle2 size={17} /> },
  error: { border: "border-l-crimson", icon: "bg-crimson/10 text-crimson", iconNode: <AlertCircle size={17} /> },
  warn: { border: "border-l-tangerine", icon: "bg-tangerine/10 text-tangerine", iconNode: <TriangleAlert size={17} /> },
  info: { border: "border-l-steel-600", icon: "bg-steel-100 text-steel-700", iconNode: <Info size={17} /> }
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const tone = toneClasses[toast.tone];

  return (
    <article className={`toast-enter relative overflow-hidden rounded-lg border border-line border-l-4 bg-white p-3 shadow-panel ${tone.border}`}>
      <div className="grid grid-cols-[auto_1fr_auto] gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone.icon}`}>{tone.iconNode}</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{toast.title}</p>
          {toast.body ? <div className="mt-1 break-words text-xs leading-5 text-steel-600">{toast.body}</div> : null}
          {toast.actions?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {toast.actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={`text-xs font-bold ${action.danger ? "text-crimson hover:text-crimson/80" : "text-steel-700 hover:text-fern"}`}
                  onClick={() => {
                    action.onClick();
                    onDismiss(toast.id);
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Button aria-label="Toast schließen" title="Toast schließen" variant="ghost" icon={<X size={15} />} className="h-8 w-8" onClick={() => onDismiss(toast.id)} />
      </div>
      {typeof toast.duration === "number" ? <span className="toast-timebar absolute inset-x-0 bottom-0 h-0.5 bg-steel-200" style={{ animationDuration: `${toast.duration}ms` }} /> : null}
    </article>
  );
}
