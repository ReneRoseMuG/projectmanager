import type { CalendarConnection } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import * as calendarConnectionsApi from "../api/calendar-connections";
import { queryKeys } from "../queries/queryKeys";

export function useCalendarConnections() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.calendarConnections.list(),
    queryFn: calendarConnectionsApi.listCalendarConnections
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.calendarConnections.root }),
    [queryClient]
  );

  const syncMutation = useMutation({ mutationFn: calendarConnectionsApi.syncCalendarConnection, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: calendarConnectionsApi.deleteCalendarConnection, onSuccess: invalidate });

  return {
    connections: (query.data ?? []) as CalendarConnection[],
    loading: query.isLoading,
    error: query.error,
    syncConnection: (id: number) => syncMutation.mutateAsync(id),
    deleteConnection: (id: number) => deleteMutation.mutateAsync(id),
    isSyncing: syncMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
