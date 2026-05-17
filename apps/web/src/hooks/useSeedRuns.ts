import type { SeedRun, SeedRunDeletePreview, SeedRunDeleteResult } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import {
  createSeedRun as createSeedRunRequest,
  deleteSeedRun as deleteSeedRunRequest,
  getSeedRuns,
  previewSeedRunDelete as previewSeedRunDeleteRequest
} from "../api/seed-runs";
import { errorMessage } from "./errors";

export function useSeedRuns() {
  const [seedRuns, setSeedRuns] = useState<SeedRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSeedRuns(await getSeedRuns());
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createSeedRun = useCallback(
    async (label: string): Promise<SeedRun | null> => {
      setCreating(true);
      setError(null);
      try {
        const created = await createSeedRunRequest({ label: label.trim() || null });
        await load();
        return created;
      } catch (requestError) {
        setError(errorMessage(requestError));
        return null;
      } finally {
        setCreating(false);
      }
    },
    [load]
  );

  const previewDelete = useCallback(async (id: string): Promise<SeedRunDeletePreview | null> => {
    setError(null);
    try {
      return await previewSeedRunDeleteRequest(id);
    } catch (requestError) {
      setError(errorMessage(requestError));
      return null;
    }
  }, []);

  const deleteSeedRun = useCallback(
    async (id: string): Promise<SeedRunDeleteResult | null> => {
      setDeletingId(id);
      setError(null);
      try {
        const deleted = await deleteSeedRunRequest(id, { confirmationId: id });
        await load();
        return deleted;
      } catch (requestError) {
        setError(errorMessage(requestError));
        return null;
      } finally {
        setDeletingId(null);
      }
    },
    [load]
  );

  return {
    seedRuns,
    loading,
    creating,
    deletingId,
    error,
    reload: load,
    createSeedRun,
    previewDelete,
    deleteSeedRun
  };
}
