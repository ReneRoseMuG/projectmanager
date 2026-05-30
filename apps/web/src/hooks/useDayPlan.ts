import type { DayPlanUpdate, EventInput, TaskInput, TaskUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createDayPlanEvent as createDayPlanEventRequest,
  createDayPlanTask as createDayPlanTaskRequest,
  getDayPlan,
  linkDayPlanEvent as linkDayPlanEventRequest,
  linkDayPlanTask as linkDayPlanTaskRequest,
  unlinkDayPlanEvent as unlinkDayPlanEventRequest,
  unlinkDayPlanTask as unlinkDayPlanTaskRequest,
  updateDayPlan as updateDayPlanRequest,
  updateDayPlanTask as updateDayPlanTaskRequest
} from "../api/day-plans";
import { invalidateDayPlan } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

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
