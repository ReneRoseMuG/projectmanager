import { useCallback, useEffect, useState } from "react";
import { getHealth } from "../api/health";

interface HealthCheckState {
  online: boolean;
  latencyMs: number | null;
  refetch: () => Promise<void>;
}

export function useHealthCheck(): HealthCheckState {
  const [state, setState] = useState<Omit<HealthCheckState, "refetch">>({ online: false, latencyMs: null });

  const check = useCallback(async () => {
    const startedAt = performance.now();
    try {
      await getHealth();
      setState({ online: true, latencyMs: Math.round(performance.now() - startedAt) });
    } catch {
      setState({ online: false, latencyMs: null });
    }
  }, []);

  useEffect(() => {
    void check();
    const intervalId = window.setInterval(() => void check(), 30_000);
    return () => window.clearInterval(intervalId);
  }, [check]);

  return { ...state, refetch: check };
}
