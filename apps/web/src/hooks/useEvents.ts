import type { CalendarEvent, EventInput, EventUpdate } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import {
  createEvent as createEventRequest,
  deleteEvent as deleteEventRequest,
  getEvents,
  updateEvent as updateEventRequest
} from "../api/events";
import { errorMessage } from "./errors";

export function useEvents(range?: { from?: string; to?: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await getEvents(range));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const createEvent = useCallback(
    async (input: EventInput) => {
      const created = await createEventRequest(input);
      await load();
      return created;
    },
    [load]
  );

  const updateEvent = useCallback(
    async (id: number, input: EventUpdate) => {
      const updated = await updateEventRequest(id, input);
      await load();
      return updated;
    },
    [load]
  );

  const removeEvent = useCallback(
    async (id: number) => {
      await deleteEventRequest(id);
      await load();
    },
    [load]
  );

  return { events, loading, error, reload: load, createEvent, updateEvent, removeEvent };
}
