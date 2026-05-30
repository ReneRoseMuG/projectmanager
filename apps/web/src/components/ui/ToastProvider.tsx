import { TOAST_POSITIONS, type ToastPosition } from "@taskmanager/shared-types";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSetting } from "../../hooks/useSettings";
import { Toast, type ToastAction, type ToastTone, type ToastViewModel } from "./Toast";

interface ToastInput {
  title: string;
  body?: ReactNode;
  message?: string;
  tone?: ToastTone;
  duration?: number | "persistent";
  timeoutMs?: number;
  actions?: ToastAction[];
}

interface ToastHandle {
  dismiss: () => void;
}

type ToastFunction = ((input: ToastInput) => ToastHandle) & {
  success: (title: string, body?: ReactNode) => ToastHandle;
  error: (title: string, body?: ReactNode) => ToastHandle;
  warn: (title: string, body?: ReactNode) => ToastHandle;
  info: (title: string, body?: ReactNode) => ToastHandle;
};

interface ToastContextValue {
  showToast: (toast: ToastInput) => number;
  toast: ToastFunction;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastPositionClasses: Record<ToastPosition, string> = {
  "top-right": "top-6 right-6",
  "top-left": "top-6 left-6",
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6"
};

function isToastPosition(value: unknown): value is ToastPosition {
  return typeof value === "string" && (TOAST_POSITIONS as readonly string[]).includes(value);
}

function normalizeToastPosition(value: unknown): ToastPosition {
  return isToastPosition(value) ? value : "top-right";
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastViewModel[]>([]);
  const timers = useRef<Map<number, number>>(new Map());
  const configuredPosition = useSetting("ui.toastPosition");
  const toastPosition = normalizeToastPosition(configuredPosition);

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, body, message, tone = "info", duration, timeoutMs, actions }: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const resolvedDuration = actions?.length ? "persistent" : duration ?? timeoutMs ?? 5000;
      const nextToast: ToastViewModel = { id, title, body: body ?? message, tone, duration: resolvedDuration, actions };
      setToasts((current) => [nextToast, ...current].slice(0, 3));
      if (typeof resolvedDuration === "number") {
        const timer = window.setTimeout(() => dismissToast(id), resolvedDuration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismissToast]
  );

  const toastBase = useCallback(
    (input: ToastInput) => {
      const id = showToast(input);
      return { dismiss: () => dismissToast(id) };
    },
    [dismissToast, showToast]
  );

  const toast = useMemo(
    () =>
      Object.assign(toastBase, {
        success: (title: string, body?: ReactNode) => toastBase({ title, body, tone: "success" }),
        error: (title: string, body?: ReactNode) => toastBase({ title, body, tone: "error" }),
        warn: (title: string, body?: ReactNode) => toastBase({ title, body, tone: "warn" }),
        info: (title: string, body?: ReactNode) => toastBase({ title, body, tone: "info" })
      }),
    [toastBase]
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  const value = useMemo(() => ({ showToast, toast, dismissToast }), [dismissToast, showToast, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={`fixed ${toastPositionClasses[toastPosition]} z-50 grid w-[min(24rem,calc(100vw-2rem))] gap-2`} role="status" aria-live="polite">
        {toasts.map((item) => (
          <Toast key={item.id} toast={item} onDismiss={dismissToast} />
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
