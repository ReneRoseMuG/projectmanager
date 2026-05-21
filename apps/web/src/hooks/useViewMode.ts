import type { SettingKey } from "@taskmanager/shared-types";
import { useCallback, useState } from "react";
import type { ViewMode } from "../types";
import { useSetting, useSettings } from "./useSettings";

type ViewModeSettingKey = Extract<SettingKey, "taskBoard.viewMode" | "ticketBoard.viewMode">;

function isViewMode(value: unknown): value is ViewMode {
  return value === "kanban" || value === "list";
}

export function useViewMode(defaultMode: ViewMode = "list", settingKey: ViewModeSettingKey = "taskBoard.viewMode") {
  const settingsValue = useSetting(settingKey);
  const { setSetting } = useSettings();
  const [optimisticMode, setOptimisticMode] = useState<ViewMode | null>(null);
  const resolvedMode = isViewMode(settingsValue) ? settingsValue : defaultMode;
  const viewMode = optimisticMode ?? resolvedMode;

  const setViewMode = useCallback((mode: ViewMode) => {
    setOptimisticMode(mode);
    void setSetting({ key: settingKey, scopeType: "USER", value: mode }).finally(() => {
      setOptimisticMode(null);
    });
  }, [setSetting, settingKey]);

  return { viewMode, setViewMode };
}
