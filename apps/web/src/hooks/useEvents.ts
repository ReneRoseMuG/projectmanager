import type { CalendarEvent, EventInput, EventUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createEvent as createEventRequest,
  deleteEvent as deleteEventRequest,
  getEvents,
  updateEvent as updateEventRequest
} from "../api/events";
import { invalidateEvents } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

function rangeKey(range?: { from?: string; to?: string }): string {
  return `${range?.from ?? "open"}:${range?.to ?? "open"}`;
}

export function useEvents(range?: { from?: string; to?: string }, enabled = true) {
  const queryClient = useQueryClient();
  const eventsQuery = useQuery({
    queryKey: queryKeys.events.list(rangeKey(range)),
    queryFn: () => getEvents(range),
    enabled
  });

  const reload = useCallback(async () => {
    await eventsQuery.refetch();
  }, [eventsQuery]);

  const createEventMutation = useMutation({
    mutationFn: createEventRequest,
    onSuccess: async () => {
      await invalidateEvents(queryClient);
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: EventUpdate }) => updateEventRequest(id, input),
    onSuccess: async () => {
      await invalidateEvents(queryClient);
    }
  });

  const removeEventMutation = useMutation({
    mutationFn: deleteEventRequest,
    onSuccess: async () => {
      await invalidateEvents(queryClient);
    }
  });

  const createEvent = useCallback(
    async (input: EventInput) => {
      return createEventMutation.mutateAsync(input);
    },
    [createEventMutation]
  );

  const updateEvent = useCallback(
    async (id: number, input: EventUpdate) => {
      return updateEventMutation.mutateAsync({ id, input });
    },
    [updateEventMutation]
  );

  const removeEvent = useCallback(
    async (id: number) => {
      await removeEventMutation.mutateAsync(id);
    },
    [removeEventMutation]
  );

  return {
    events: eventsQuery.data ?? ([] as CalendarEvent[]),
    loading: eventsQuery.isLoading,
    error: toQueryError(eventsQuery.error),
    reload,
    createEvent,
    updateEvent,
    removeEvent
  };
}
