import type { CalendarConnection, CalendarJournalEntry } from "@taskmanager/shared-types";
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

  const journalQuery = useQuery({
    queryKey: queryKeys.calendarConnections.journal(),
    queryFn: calendarConnectionsApi.listCalendarJournal
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.calendarConnections.root }),
    [queryClient]
  );

  const syncMutation = useMutation({ mutationFn: calendarConnectionsApi.syncCalendarConnection, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: calendarConnectionsApi.deleteCalendarConnection, onSuccess: invalidate });

  // Startet den Google-OAuth-Flow (Erst-Verbindung oder Re-Auth) — der Callback kehrt zur Seite zurück.
  const connectGoogle = useCallback(async () => {
    const { url } = await calendarConnectionsApi.getGoogleAuthUrl();
    window.location.assign(url);
  }, []);

  return {
    connections: (query.data ?? []) as CalendarConnection[],
    journal: (journalQuery.data ?? []) as CalendarJournalEntry[],
    loading: query.isLoading,
    error: query.error,
    syncConnection: (id: number) => syncMutation.mutateAsync(id),
    deleteConnection: (id: number) => deleteMutation.mutateAsync(id),
    connectGoogle,
    isSyncing: syncMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
