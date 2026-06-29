import type { WikiTreeState } from "@taskmanager/shared-types";
import { useCallback, useMemo, useRef, useState } from "react";
import { useSetting, useSettings } from "./useSettings";

const settingKey = "wiki.treeState";

function normalizeTreeState(value: WikiTreeState): WikiTreeState {
  return {
    sidebarCollapsed: value.sidebarCollapsed,
    collapsedPageIds: Array.from(new Set(value.collapsedPageIds))
      .filter((id) => Number.isInteger(id) && id > 0)
      .sort((a, b) => a - b)
  };
}

export function useWikiTreeState() {
  const settingValue = useSetting(settingKey);
  const { loading, setSetting } = useSettings();
  const [optimisticTreeState, setOptimisticTreeState] = useState<WikiTreeState | null>(null);
  const writeTokenRef = useRef(0);

  const resolvedTreeState = useMemo(() => normalizeTreeState(settingValue), [settingValue]);
  const treeState = optimisticTreeState ?? resolvedTreeState;

  const setTreeState = useCallback((nextState: WikiTreeState) => {
    const normalized = normalizeTreeState(nextState);
    const writeToken = writeTokenRef.current + 1;
    writeTokenRef.current = writeToken;
    setOptimisticTreeState(normalized);
    void setSetting({ key: settingKey, scopeType: "USER", value: normalized }).finally(() => {
      if (writeTokenRef.current === writeToken) {
        setOptimisticTreeState(null);
      }
    });
  }, [setSetting]);

  return {
    treeState,
    treeStateLoading: loading,
    setTreeState
  };
}
