import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as calendarSettingsApi from "../api/calendarSettings";
import { invalidateCalendarSettings } from "../queries/invalidation";
import { queryKeys } from "../queries/queryKeys";

/** Lädt und speichert die zentrale Kalender-Sync-Konfiguration (Admin). */
export function useCalendarSyncSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.calendarSettings.config(),
    queryFn: calendarSettingsApi.getCalendarSyncConfig,
    retry: false
  });

  const updateMutation = useMutation({
    mutationFn: calendarSettingsApi.updateCalendarSyncConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.calendarSettings.config(), data);
    },
    onSettled: async () => {
      await invalidateCalendarSettings(queryClient);
    }
  });

  return {
    config: query.data,
    loading: query.isLoading,
    error: query.error,
    save: updateMutation.mutateAsync,
    isSaving: updateMutation.isPending
  };
}
