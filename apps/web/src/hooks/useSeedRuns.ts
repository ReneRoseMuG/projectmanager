import type { SeedRunDeletePreview, SeedRunDeleteResult } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createSeedRun as createSeedRunRequest,
  deleteSeedRun as deleteSeedRunRequest,
  getSeedRuns,
  previewSeedRunDelete as previewSeedRunDeleteRequest
} from "../api/seed-runs";
import { invalidateSeedData } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useSeedRuns() {
  const queryClient = useQueryClient();
  const seedRunsQuery = useQuery({
    queryKey: queryKeys.seedRuns.list(),
    queryFn: getSeedRuns
  });

  const reload = useCallback(async () => {
    await seedRunsQuery.refetch();
  }, [seedRunsQuery]);

  const createSeedRunMutation = useMutation({
    mutationFn: (label: string) => createSeedRunRequest({ label: label.trim() || null }),
    onSuccess: async () => {
      await invalidateSeedData(queryClient);
    }
  });

  const deleteSeedRunMutation = useMutation({
    mutationFn: (id: string) => deleteSeedRunRequest(id, { confirmationId: id }),
    onSuccess: async () => {
      await invalidateSeedData(queryClient);
    }
  });

  const createSeedRun = useCallback(
    async (label: string) => {
      try {
        return await createSeedRunMutation.mutateAsync(label);
      } catch {
        return null;
      }
    },
    [createSeedRunMutation]
  );

  const previewDelete = useCallback(async (id: string): Promise<SeedRunDeletePreview | null> => {
    try {
      return await previewSeedRunDeleteRequest(id);
    } catch {
      return null;
    }
  }, []);

  const deleteSeedRun = useCallback(
    async (id: string): Promise<SeedRunDeleteResult | null> => {
      try {
        return await deleteSeedRunMutation.mutateAsync(id);
      } catch {
        return null;
      }
    },
    [deleteSeedRunMutation]
  );

  return {
    seedRuns: seedRunsQuery.data ?? [],
    loading: seedRunsQuery.isLoading,
    creating: createSeedRunMutation.isPending,
    deletingId: deleteSeedRunMutation.isPending ? (deleteSeedRunMutation.variables ?? null) : null,
    error: toQueryError(seedRunsQuery.error ?? createSeedRunMutation.error ?? deleteSeedRunMutation.error),
    reload,
    createSeedRun,
    previewDelete,
    deleteSeedRun
  };
}
