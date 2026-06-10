import { useCallback, useEffect, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  enabled: boolean;
  save: () => Promise<void>;
}

interface UseAutoSaveResult {
  /**
   * Triggers a save of the current form state and resolves once it has settled:
   * `true` when persisted (or nothing to save), `false` when the save failed.
   * Awaitable so callers can complete the save before navigating away.
   */
  flush: () => Promise<boolean>;
  status: AutoSaveStatus;
  errorMessage: string | null;
}

const SAVED_RESET_MS = 2000;

export function useAutoSave({ enabled, save }: UseAutoSaveOptions): UseAutoSaveResult {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const pendingResolversRef = useRef<Array<(ok: boolean) => void>>([]);
  const mountedRef = useRef(true);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      // A queued save can no longer run after unmount: settle any awaiters as failed
      // so a save-before-navigate caller is never left hanging.
      const resolvers = pendingResolversRef.current;
      pendingResolversRef.current = [];
      pendingRef.current = false;
      resolvers.forEach((resolve) => resolve(false));
    };
  }, []);

  const doSave = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current) return false;
    savingRef.current = true;
    setStatus("saving");
    setErrorMessage(null);
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
    let ok = false;
    try {
      await saveRef.current();
      ok = true;
      if (mountedRef.current) {
        setStatus("saved");
        savedTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setStatus("idle");
        }, SAVED_RESET_MS);
      }
    } catch (err) {
      ok = false;
      if (mountedRef.current) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Unbekannter Fehler");
      }
    } finally {
      savingRef.current = false;
    }

    // A flush requested while this save ran persists the latest state once more;
    // awaiters settle on that final result.
    if (pendingRef.current && mountedRef.current) {
      pendingRef.current = false;
      return doSave();
    }
    const resolvers = pendingResolversRef.current;
    pendingResolversRef.current = [];
    resolvers.forEach((resolve) => resolve(ok));
    return ok;
  }, []);

  const flush = useCallback((): Promise<boolean> => {
    if (!enabled) return Promise.resolve(true);
    if (savingRef.current) {
      pendingRef.current = true;
      return new Promise<boolean>((resolve) => {
        pendingResolversRef.current.push(resolve);
      });
    }
    return doSave();
  }, [enabled, doSave]);

  return { flush, status, errorMessage };
}
