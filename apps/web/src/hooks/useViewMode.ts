import { useCallback, useEffect, useState } from "react";
import type { ViewMode } from "../types";

const storageKey = "taskmanager:view-mode";

export function useViewMode(defaultMode: ViewMode = "list") {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const stored = window.localStorage.getItem(storageKey);
    return stored === "kanban" || stored === "list" ? stored : defaultMode;
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, viewMode);
  }, [viewMode]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
  }, []);

  return { viewMode, setViewMode };
}
