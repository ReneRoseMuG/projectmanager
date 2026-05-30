import type { Task } from "@taskmanager/shared-types";

export const TASK_STATUS_PRIORITY: Record<string, number> = {
  in_progress: 0,
  in_review: 1,
  open: 2,
  todo: 3,
  active: 3,
  on_hold: 4,
  done: 5,
  resolved: 5,
  completed: 5,
  closed: 6,
  rejected: 6,
  archived: 6
};

export function taskSortKey(task: Task): number {
  return TASK_STATUS_PRIORITY[task.status] ?? 3;
}

export function sortCalendarTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((left, right) => taskSortKey(left) - taskSortKey(right) || left.title.localeCompare(right.title) || left.id - right.id);
}
