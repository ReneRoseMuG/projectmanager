import type { CalendarEvent, DayPlanUpdate, EventInput, TaskBoardItem, TaskInput, TaskUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createDayPlanEvent as createDayPlanEventRequest,
  createDayPlanTask as createDayPlanTaskRequest,
  getDayPlan,
  linkDayPlanEvent as linkDayPlanEventRequest,
  linkDayPlanTask as linkDayPlanTaskRequest,
  listDayPlanEvents as listDayPlanEventsRequest,
  listDayPlanTasks as listDayPlanTasksRequest,
  unlinkDayPlanEvent as unlinkDayPlanEventRequest,
  unlinkDayPlanTask as unlinkDayPlanTaskRequest,
  unlinkDayPlanTaskAnyDate as unlinkDayPlanTaskAnyDateRequest,
  updateDayPlan as updateDayPlanRequest,
  updateDayPlanTask as updateDayPlanTaskRequest
} from "../api/day-plans";
import { invalidateDayPlan } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

/**
 * Date-independent personal task list: all tasks linked to any of the current user's day plans.
 * Used by the Persönliche Planung so tasks no longer disappear when the day rolls over.
 */
export function useDayPlanTasks(enabled = true) {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: queryKeys.dayPlans.tasks(),
    queryFn: listDayPlanTasksRequest,
    enabled
  });

  const unlinkTaskMutation = useMutation({
    mutationFn: (taskId: number) => unlinkDayPlanTaskAnyDateRequest(taskId),
    onSuccess: async () => {
      await invalidateDayPlan(queryClient);
    }
  });

  const unlinkTask = useCallback(
    async (taskId: number) => {
      await unlinkTaskMutation.mutateAsync(taskId);
    },
    [unlinkTaskMutation]
  );

  return {
    tasks: tasksQuery.data ?? ([] as TaskBoardItem[]),
    loading: tasksQuery.isLoading,
    error: toQueryError(tasksQuery.error),
    unlinkTask
  };
}

/**
 * Date-independent personal events: all events linked to any of the current user's day plans.
 * Used by the Persönliche Planung calendar so appointments stay visible across days.
 */
export function useDayPlanEvents(enabled = true) {
  const eventsQuery = useQuery({
    queryKey: queryKeys.dayPlans.events(),
    queryFn: listDayPlanEventsRequest,
    enabled
  });

  return {
    events: eventsQuery.data ?? ([] as CalendarEvent[]),
    loading: eventsQuery.isLoading,
    error: toQueryError(eventsQuery.error)
  };
}

export function useDayPlan(date: string, enabled = true) {
  const queryClient = useQueryClient();

  const dayPlanQuery = useQuery({
    queryKey: queryKeys.dayPlans.detail(date),
    queryFn: () => getDayPlan(date),
    enabled: enabled && date.length > 0
  });

  const reload = useCallback(async () => {
    await dayPlanQuery.refetch();
  }, [dayPlanQuery]);

  const updateDayPlanMutation = useMutation({
    mutationFn: (input: DayPlanUpdate) => updateDayPlanRequest(date, input),
    onSuccess: async () => {
      await invalidateDayPlan(queryClient, date);
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (input: TaskInput) => createDayPlanTaskRequest(date, input),
    onSuccess: async () => {
      await invalidateDayPlan(queryClient, date);
    }
  });

  const linkTaskMutation = useMutation({
    mutationFn: (taskId: number) => linkDayPlanTaskRequest(date, taskId),
    onSuccess: async () => {
      await invalidateDayPlan(queryClient, date);
    }
  });

  const unlinkTaskMutation = useMutation({
    mutationFn: (taskId: number) => unlinkDayPlanTaskRequest(date, taskId),
    onSuccess: async () => {
      await invalidateDayPlan(queryClient, date);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, input }: { taskId: number; input: TaskUpdate }) => updateDayPlanTaskRequest(taskId, input),
    onSuccess: async () => {
      await invalidateDayPlan(queryClient, date);
    }
  });

  const createEventMutation = useMutation({
    mutationFn: (input: EventInput) => createDayPlanEventRequest(date, input),
    onSuccess: async () => {
      await invalidateDayPlan(queryClient, date);
    }
  });

  const linkEventMutation = useMutation({
    mutationFn: (eventId: number) => linkDayPlanEventRequest(date, eventId),
    onSuccess: async () => {
      await invalidateDayPlan(queryClient, date);
    }
  });

  const unlinkEventMutation = useMutation({
    mutationFn: (eventId: number) => unlinkDayPlanEventRequest(date, eventId),
    onSuccess: async () => {
      await invalidateDayPlan(queryClient, date);
    }
  });

  const updateDayPlan = useCallback(
    async (input: DayPlanUpdate) => {
      return updateDayPlanMutation.mutateAsync(input);
    },
    [updateDayPlanMutation]
  );

  const createTask = useCallback(
    async (input: TaskInput) => {
      return createTaskMutation.mutateAsync(input);
    },
    [createTaskMutation]
  );

  const linkTask = useCallback(
    async (taskId: number) => {
      return linkTaskMutation.mutateAsync(taskId);
    },
    [linkTaskMutation]
  );

  const unlinkTask = useCallback(
    async (taskId: number) => {
      return unlinkTaskMutation.mutateAsync(taskId);
    },
    [unlinkTaskMutation]
  );

  const updateTask = useCallback(
    async (taskId: number, input: TaskUpdate) => {
      return updateTaskMutation.mutateAsync({ taskId, input });
    },
    [updateTaskMutation]
  );

  const createEvent = useCallback(
    async (input: EventInput) => {
      return createEventMutation.mutateAsync(input);
    },
    [createEventMutation]
  );

  const linkEvent = useCallback(
    async (eventId: number) => {
      return linkEventMutation.mutateAsync(eventId);
    },
    [linkEventMutation]
  );

  const unlinkEvent = useCallback(
    async (eventId: number) => {
      return unlinkEventMutation.mutateAsync(eventId);
    },
    [unlinkEventMutation]
  );

  return {
    dayPlan: dayPlanQuery.data,
    loading: dayPlanQuery.isLoading,
    error: toQueryError(dayPlanQuery.error),
    reload,
    updateDayPlan,
    createTask,
    linkTask,
    unlinkTask,
    updateTask,
    createEvent,
    linkEvent,
    unlinkEvent
  };
}
