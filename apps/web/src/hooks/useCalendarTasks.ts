import type { Task } from "@taskmanager/shared-types";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { getTasks } from "../api/tasks";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

async function getCalendarTasks(): Promise<Task[]> {
  return getTasks();
}

export function useCalendarTasks() {
  const tasksQuery = useQuery({
    queryKey: queryKeys.calendarTasks.list(),
    queryFn: getCalendarTasks
  });

  const reload = useCallback(async () => {
    await tasksQuery.refetch();
  }, [tasksQuery]);

  return {
    tasks: tasksQuery.data ?? [],
    loading: tasksQuery.isLoading,
    error: toQueryError(tasksQuery.error),
    reload
  };
}
