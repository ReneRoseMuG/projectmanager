import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./Button";

type ToastTone = "success" | "error" | "info";

interface ToastInput {
  title: string;
  message?: string;
  tone?: ToastTone;
  timeoutMs?: number;
}

interface Toast extends Required<Pick<ToastInput, "title" | "tone">> {
  id: number;
  message?: string;
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => number;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses: Record<ToastTone, string> = {
  success: "border-moss bg-white text-ink",
  error: "border-coral bg-white text-ink",
  info: "border-teal bg-white text-ink"
};

const icons: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={18} className="text-moss" />,
  error: <AlertCircle size={18} className="text-coral" />,
  info: <Info size={18} className="text-teal" />
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, tone = "info", timeoutMs = 4500 }: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, title, message, tone }].slice(-4));
      timers.current.push(window.setTimeout(() => dismissToast(id), timeoutMs));
      return id;
    },
    [dismissToast]
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 grid w-[min(24rem,calc(100vw-2rem))] gap-2" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`grid grid-cols-[auto_1fr_auto] gap-3 rounded-md border-l-4 p-3 shadow-panel ${toneClasses[toast.tone]}`}>
            <div className="pt-0.5">{icons[toast.tone]}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.message ? <p className="mt-1 break-words text-xs text-slate-600">{toast.message}</p> : null}
            </div>
            <Button aria-label="Toast schließen" title="Toast schließen" variant="ghost" icon={<X size={15} />} onClick={() => dismissToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
