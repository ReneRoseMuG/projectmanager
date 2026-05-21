import type { DumpBackupStatus, DumpRemoteBackupStatus } from "@taskmanager/shared-types";
import { useQuery } from "@tanstack/react-query";
import { getLocalDumpStatus, getRemoteDumpStatus } from "../api/dumps";
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
