import type { Task } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import { getProjects } from "../api/projects";
import { getProjectTasks } from "../api/tasks";
import { errorMessage } from "./errors";

export function useCalendarTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projects = await getProjects();
      const allTasks: Task[] = [];
      for (const project of projects) {
        allTasks.push(...(await getProjectTasks(project.id)));
      }
      setTasks(allTasks);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { tasks, loading, error, reload: load };
}
