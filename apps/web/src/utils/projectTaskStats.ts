import type { CatalogEntry, Task } from "@taskmanager/shared-types";
import { isCatalogStatusClosed } from "./catalogs";

interface ProjectTaskCountSource {
  openTaskCount: number;
  doneTaskCount: number;
  totalTaskCount: number;
}

export interface ProjectTaskStats {
  totalTasks: number;
  doneTasks: number;
  openTasks: number;
  progress: number;
}

export function deriveProjectTaskStats(source: ProjectTaskCountSource, tasks: Array<Pick<Task, "status">>, taskDataAvailable: boolean, catalogEntries: CatalogEntry[] = []): ProjectTaskStats {
  const totalTasks = taskDataAvailable ? tasks.length : source.totalTaskCount;
  const doneTasks = taskDataAvailable ? tasks.filter((task) => isCatalogStatusClosed(catalogEntries, "workStatus", task.status)).length : source.doneTaskCount;
  const openTasks = taskDataAvailable ? tasks.filter((task) => !isCatalogStatusClosed(catalogEntries, "workStatus", task.status)).length : source.openTaskCount;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return { totalTasks, doneTasks, openTasks, progress };
}
