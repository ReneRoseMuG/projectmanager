import { useCallback, useEffect, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  enabled: boolean;
  save: () => Promise<void>;
}

interface UseAutoSaveResult {
  flush: () => void;
  status: AutoSaveStatus;
  errorMessage: string | null;
}

const SAVED_RESET_MS = 2000;

export function useAutoSave({ enabled, save }: UseAutoSaveOptions): UseAutoSaveResult {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const mountedRef = useRef(true);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const doSave = useCallback(async () => {
    if (!mountedRef.current) return;
    savingRef.current = true;
    setStatus("saving");
    setErrorMessage(null);
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
    try {
      await saveRef.current();
      if (!mountedRef.current) return;
      setStatus("saved");
      savedTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setStatus("idle");
      }, SAVED_RESET_MS);
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      savingRef.current = false;
      if (pendingRef.current && mountedRef.current) {
        pendingRef.current = false;
        void doSave();
      }
    }
  }, []);

  const flush = useCallback(() => {
    if (!enabled) return;
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    void doSave();
  }, [enabled, doSave]);

  return { flush, status, errorMessage };
}
