import type { CalendarConnection, CalendarJournalEntry } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import * as calendarConnectionsApi from "../api/calendar-connections";
import type { CalendarConfigStatus, ConnectNextCloudInput } from "../api/calendar-connections";
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

  const configQuery = useQuery({
    queryKey: queryKeys.calendarConnections.config(),
    queryFn: calendarConnectionsApi.getCalendarConfig
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.calendarConnections.root }),
    [queryClient]
  );

  const syncMutation = useMutation({ mutationFn: calendarConnectionsApi.syncCalendarConnection, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: calendarConnectionsApi.deleteCalendarConnection, onSuccess: invalidate });
  const connectNextCloudMutation = useMutation({ mutationFn: calendarConnectionsApi.connectNextCloud, onSuccess: invalidate });
  const selectCalendarMutation = useMutation({
    mutationFn: ({ connectionId, calendarId }: { connectionId: number; calendarId: string }) => calendarConnectionsApi.selectGoogleCalendar(connectionId, calendarId),
    onSuccess: invalidate
  });
  const syncAllMutation = useMutation({ mutationFn: calendarConnectionsApi.syncAllConnections, onSuccess: invalidate });

  // Startet den Google-OAuth-Flow (Erst-Verbindung oder Re-Auth) — der Callback kehrt zur Seite zurück.
  const connectGoogle = useCallback(async () => {
    const { url } = await calendarConnectionsApi.getGoogleAuthUrl();
    window.location.assign(url);
  }, []);

  return {
    connections: (query.data ?? []) as CalendarConnection[],
    journal: (journalQuery.data ?? []) as CalendarJournalEntry[],
    config: configQuery.data as CalendarConfigStatus | undefined,
    loading: query.isLoading,
    error: query.error,
    syncConnection: (id: number) => syncMutation.mutateAsync(id),
    deleteConnection: (id: number) => deleteMutation.mutateAsync(id),
    connectGoogle,
    connectNextCloud: (input: ConnectNextCloudInput) => connectNextCloudMutation.mutateAsync(input),
    loadGoogleCalendars: calendarConnectionsApi.listGoogleCalendars,
    selectGoogleCalendar: (connectionId: number, calendarId: string) => selectCalendarMutation.mutateAsync({ connectionId, calendarId }),
    syncAll: () => syncAllMutation.mutateAsync(),
    isSyncing: syncMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isConnectingNextCloud: connectNextCloudMutation.isPending,
    isSelectingCalendar: selectCalendarMutation.isPending,
    isSyncingAll: syncAllMutation.isPending
  };
}
