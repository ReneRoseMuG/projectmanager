import type { DumpDriveConfig, DumpDriveConfigUpdateRequest } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getDriveDumpConfig, updateDriveDumpConfig } from "../api/dumps";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useDriveDumpConfig() {
  const queryClient = useQueryClient();
  const configQuery = useQuery({
    queryKey: queryKeys.dumps.driveConfig(),
    queryFn: getDriveDumpConfig
  });

  const updateMutation = useMutation({
    mutationFn: updateDriveDumpConfig,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.dumps.driveConfig(), result);
    }
  });

  const updateConfig = useCallback(
    async (input: DumpDriveConfigUpdateRequest) => updateMutation.mutateAsync(input),
    [updateMutation]
  );

  return {
    config: configQuery.data ?? null,
    loading: configQuery.isLoading,
    updating: updateMutation.isPending,
    error: toQueryError(configQuery.error ?? updateMutation.error),
    updateConfig
  } satisfies {
    config: DumpDriveConfig | null;
    loading: boolean;
    updating: boolean;
    error: ReturnType<typeof toQueryError>;
    updateConfig: (input: DumpDriveConfigUpdateRequest) => Promise<DumpDriveConfig>;
  };
}
