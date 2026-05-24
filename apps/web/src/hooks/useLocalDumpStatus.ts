import type { DumpBackupStatus, DumpIncrementalSyncApplyRequest, DumpIncrementalSyncPreviewResult, DumpRemoteBackupStatus } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { applyIncrementalRemoteSync, getLocalDumpStatus, getRemoteDumpStatus, previewIncrementalRemoteSync, runIncrementalRemoteSync } from "../api/dumps";
import { invalidateDumps, invalidateWikiImportData } from "../queries/invalidation";
import { queryKeys } from "../queries/queryKeys";
import { toQueryError } from "../queries/queryErrors";

export function useLocalDumpStatus() {
  const query = useQuery({
    queryKey: queryKeys.dumps.localStatus(),
    queryFn: getLocalDumpStatus
  });

  return {
    status: query.data ?? null,
    loading: query.isLoading,
    error: toQueryError(query.error),
    refetch: query.refetch
  } satisfies {
    status: DumpBackupStatus | null;
    loading: boolean;
    error: string | null;
    refetch: typeof query.refetch;
  };
}

export function useRemoteDumpStatus() {
  const query = useQuery({
    queryKey: queryKeys.dumps.remoteStatus(),
    queryFn: getRemoteDumpStatus
  });

  return {
    status: query.data ?? null,
    loading: query.isLoading,
    error: toQueryError(query.error),
    refetch: query.refetch
  } satisfies {
    status: DumpRemoteBackupStatus | null;
    loading: boolean;
    error: string | null;
    refetch: typeof query.refetch;
  };
}

export function useIncrementalRemoteSync() {
  const queryClient = useQueryClient();
  const previewQuery = useQuery({
    queryKey: queryKeys.dumps.remoteSyncPreview(),
    queryFn: previewIncrementalRemoteSync,
    enabled: false,
    retry: false
  });

  const syncMutation = useMutation({
    mutationFn: runIncrementalRemoteSync,
    onSuccess: async () => {
      await invalidateDumps(queryClient);
    }
  });

  const applyMutation = useMutation({
    mutationFn: (input: DumpIncrementalSyncApplyRequest) => applyIncrementalRemoteSync(input),
    onSuccess: async () => {
      await invalidateWikiImportData(queryClient);
    }
  });

  const previewSync = useCallback(async (): Promise<DumpIncrementalSyncPreviewResult> => {
    const result = await previewQuery.refetch({ throwOnError: true });
    return result.data as DumpIncrementalSyncPreviewResult;
  }, [previewQuery]);

  const applySync = useCallback(
    async (input: DumpIncrementalSyncApplyRequest) => {
      return applyMutation.mutateAsync(input);
    },
    [applyMutation]
  );

  const runSync = useCallback(async () => syncMutation.mutateAsync(), [syncMutation]);

  return {
    preview: previewQuery.data ?? null,
    previewError: toQueryError(previewQuery.error),
    previewSync,
    runSync,
    applySync,
    syncing: syncMutation.isPending,
    previewing: previewQuery.isFetching,
    applying: applyMutation.isPending
  };
}
