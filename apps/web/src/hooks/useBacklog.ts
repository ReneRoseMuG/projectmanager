import type { BacklogItemInput, BacklogItemUpdate, BacklogStatus } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  createBacklogItem as createBacklogItemRequest,
  deleteBacklogItem as deleteBacklogItemRequest,
  getBacklogItems,
  getBacklogItemsPage,
  updateBacklogItem as updateBacklogItemRequest,
  type BacklogFilters
} from "../api/backlog";
import { invalidateBacklogScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";
import { useProgressiveList } from "./useProgressiveList";

export function useBacklog(projectId?: number) {
  const [statusFilter, setStatusFilter] = useState<BacklogStatus | "all">("all");
  const queryClient = useQueryClient();
  const validProjectId = projectId !== undefined && Number.isFinite(projectId) ? projectId : undefined;

  const backlogQuery = useQuery({
    queryKey: queryKeys.projects.backlog(validProjectId ?? 0),
    queryFn: () => getBacklogItems(validProjectId as number),
    enabled: validProjectId !== undefined
  });

  const reload = useCallback(async () => {
    if (validProjectId !== undefined) {
      await backlogQuery.refetch();
    }
  }, [backlogQuery, validProjectId]);

  const createItemMutation = useMutation({
    mutationFn: (input: BacklogItemInput) => {
      if (validProjectId === undefined) {
        throw new Error("Project id is required");
      }
      return createBacklogItemRequest(validProjectId, input);
    },
    onSuccess: async () => {
      if (validProjectId !== undefined) {
        await invalidateBacklogScope(queryClient, validProjectId);
      }
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: BacklogItemUpdate }) => updateBacklogItemRequest(id, input),
    onSuccess: async () => {
      if (validProjectId !== undefined) {
        await invalidateBacklogScope(queryClient, validProjectId);
      }
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: deleteBacklogItemRequest,
    onSuccess: async () => {
      if (validProjectId !== undefined) {
        await invalidateBacklogScope(queryClient, validProjectId);
      }
    }
  });

  const createItem = useCallback(
    async (input: BacklogItemInput) => {
      return createItemMutation.mutateAsync(input);
    },
    [createItemMutation]
  );

  const updateItem = useCallback(
    async (id: number, input: BacklogItemUpdate) => {
      return updateItemMutation.mutateAsync({ id, input });
    },
    [updateItemMutation]
  );

  const removeItem = useCallback(
    async (id: number) => {
      await removeItemMutation.mutateAsync(id);
    },
    [removeItemMutation]
  );

  return {
    items: backlogQuery.data ?? [],
    statusFilter,
    setStatusFilter,
    loading: backlogQuery.isLoading,
    error: toQueryError(backlogQuery.error),
    reload,
    createItem,
    updateItem,
    removeItem
  };
}

// Progressiv nachgeladene Backlog-Liste (MS-75, analog useFeatureLibrary). Statt Seitenzahl-
// Blättern lädt useProgressiveList die Blöcke sequenziell nach und hängt sie an, bis alle
// Datensätze da sind. `total` ist die Gesamtzahl nach Filter/Suche, `loadedCount` die bereits
// geladene Menge. Der alte useBacklog-Hook bleibt für Mutationen und die Chip-Counts unberührt.
export function useBacklogPaginated(projectId: number | undefined, filters: BacklogFilters) {
  const validProjectId = projectId !== undefined && Number.isFinite(projectId) ? projectId : undefined;

  const list = useProgressiveList(
    queryKeys.projects.backlog(validProjectId ?? 0, filters as object),
    (page, pageSize) => getBacklogItemsPage(validProjectId as number, filters, { page, pageSize }),
    { enabled: validProjectId !== undefined }
  );

  return {
    items: list.items,
    total: list.total,
    loadedCount: list.loadedCount,
    loading: list.loading,
    loadingMore: list.loadingMore,
    error: list.error
  };
}
