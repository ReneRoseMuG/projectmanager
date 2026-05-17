import type { Task, TaskDetail, TaskInput, TaskPositionInput, TaskUpdate } from "@taskmanager/shared-types";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { projects, tasks } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import { deleteTaskAttachmentsForIds, listTaskAttachments } from "./attachments.service.js";
import { deleteCommentsForEntities, listComments } from "./comments.service.js";
import { cleanNullable, nowIso, requireNonEmpty } from "./helpers.js";
import { deleteTaskNotesForIds, listTaskNotes } from "./notes.service.js";
import { getTaskTags, getTaskTagsMap } from "./tags.service.js";

type TaskRecord = typeof tasks.$inferSelect;
type MappableTaskRecord = Pick<
  TaskRecord,
  "id" | "projectId" | "parentId" | "title" | "description" | "status" | "priority" | "assignee" | "dueDate" | "position" | "createdAt" | "updatedAt"
>;

export function mapTask(
  database: DbClient,
  record: MappableTaskRecord,
  tags = getTaskTags(database, record.id),
  subtaskCount = getSubtaskCounts(database, [record.id]).get(record.id) ?? 0
): Task {
  return {
    id: record.id,
    projectId: record.projectId,
    parentId: record.parentId,
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    assignee: record.assignee,
    dueDate: record.dueDate,
    position: record.position,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tags,
    subtaskCount
  };
}

function ensureProjectExists(database: DbClient, projectId: number): void {
  const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

function getTaskRecord(database: DbClient, id: number): TaskRecord {
  const task = database.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) {
    throw notFound(`Task with id ${id} not found`);
  }
  return task;
}

function getSubtaskCounts(database: DbClient, taskIds: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  if (taskIds.length === 0) {
    return counts;
  }

  const rows = database.select({ parentId: tasks.parentId }).from(tasks).where(inArray(tasks.parentId, taskIds)).all();
  for (const row of rows) {
    if (row.parentId !== null) {
      counts.set(row.parentId, (counts.get(row.parentId) ?? 0) + 1);
    }
  }

  return counts;
}

function collectTaskSubtreeIds(database: DbClient, taskId: number): number[] {
  const root = getTaskRecord(database, taskId);
  const rows = database.select({ id: tasks.id, parentId: tasks.parentId }).from(tasks).where(eq(tasks.projectId, root.projectId)).all();
  const childrenByParent = new Map<number, number[]>();

  for (const row of rows) {
    if (row.parentId !== null) {
      childrenByParent.set(row.parentId, [...(childrenByParent.get(row.parentId) ?? []), row.id]);
    }
  }

  const ids: number[] = [];
  const queue = [taskId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined) {
      continue;
    }

    ids.push(currentId);
    queue.push(...(childrenByParent.get(currentId) ?? []));
  }

  return ids;
}

function nextPosition(database: DbClient, projectId: number, status: TaskRecord["status"], parentId: number | null): number {
  const where = parentId === null
    ? and(eq(tasks.projectId, projectId), eq(tasks.status, status), isNull(tasks.parentId))
    : and(eq(tasks.projectId, projectId), eq(tasks.status, status), eq(tasks.parentId, parentId));

  const positions = database.select({ position: tasks.position }).from(tasks).where(where).all();
  const max = positions.reduce((current, row) => Math.max(current, row.position), 0);
  return max + 1024;
}

export function listProjectTasks(database: DbClient, projectId: number): Task[] {
  ensureProjectExists(database, projectId);
  const rows = database
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), isNull(tasks.parentId)))
    .orderBy(tasks.status, tasks.position)
    .all();
  const ids = rows.map((task) => task.id);
  const tagsByTask = getTaskTagsMap(database, ids);
  const subtaskCounts = getSubtaskCounts(database, ids);

  return rows.map((task) => mapTask(database, task, tagsByTask.get(task.id) ?? [], subtaskCounts.get(task.id) ?? 0));
}

export function listTasks(database: DbClient): Task[] {
  const rows = database
    .select()
    .from(tasks)
    .where(isNull(tasks.parentId))
    .orderBy(tasks.projectId, tasks.status, tasks.position)
    .all();
  const ids = rows.map((task) => task.id);
  const tagsByTask = getTaskTagsMap(database, ids);
  const subtaskCounts = getSubtaskCounts(database, ids);

  return rows.map((task) => mapTask(database, task, tagsByTask.get(task.id) ?? [], subtaskCounts.get(task.id) ?? 0));
}

export function listSubtasks(database: DbClient, taskId: number): Task[] {
  const parent = getTaskRecord(database, taskId);
  const rows = database
    .select()
    .from(tasks)
    .where(eq(tasks.parentId, taskId))
    .orderBy(tasks.position)
    .all();
  const ids = rows.map((task) => task.id);
  const tagsByTask = getTaskTagsMap(database, ids);
  const subtaskCounts = getSubtaskCounts(database, ids);

  return rows
    .filter((task) => task.projectId === parent.projectId)
    .map((task) => mapTask(database, task, tagsByTask.get(task.id) ?? [], subtaskCounts.get(task.id) ?? 0));
}

export function createTask(database: DbClient, projectId: number, input: TaskInput, parentId: number | null = null): Task {
  ensureProjectExists(database, projectId);
  if (parentId !== null) {
    const parent = getTaskRecord(database, parentId);
    if (parent.projectId !== projectId) {
      throw badRequest("Subtask must belong to the same project as its parent");
    }
  }

  const title = requireNonEmpty(input.title, "title");
  const status = input.status ?? "todo";
  const now = nowIso();
  const created = database
    .insert(tasks)
    .values({
      projectId,
      parentId,
      title,
      description: cleanNullable(input.description) ?? null,
      status,
      priority: input.priority ?? "medium",
      assignee: cleanNullable(input.assignee) ?? null,
      dueDate: input.dueDate ?? null,
      position: nextPosition(database, projectId, status, parentId),
      createdAt: now,
      updatedAt: now
    })
    .returning()
    .get();

  return mapTask(database, created, [], 0);
}

export function createSubtask(database: DbClient, taskId: number, input: TaskInput): Task {
  const parent = getTaskRecord(database, taskId);
  if (parent.parentId !== null) {
    throw badRequest("Subtasks cannot have subtasks");
  }

  return createTask(database, parent.projectId, input, parent.id);
}

export function getTask(database: DbClient, id: number): Task {
  return mapTask(database, getTaskRecord(database, id));
}

export function getTaskDetail(database: DbClient, id: number): TaskDetail {
  const base = getTask(database, id);
  return {
    ...base,
    subtasks: listSubtasks(database, id),
    comments: listComments(database, id),
    notes: listTaskNotes(database, id),
    attachments: listTaskAttachments(database, id)
  };
}

export function updateTask(database: DbClient, id: number, input: TaskUpdate): Task {
  const values: Partial<typeof tasks.$inferInsert> = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.status !== undefined) {
    values.status = input.status;
  }
  if (input.priority !== undefined) {
    values.priority = input.priority;
  }
  if (input.assignee !== undefined) {
    values.assignee = cleanNullable(input.assignee) ?? null;
  }
  if (input.dueDate !== undefined) {
    values.dueDate = input.dueDate;
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No task fields provided");
  }

  values.updatedAt = nowIso();

  const updated = database.update(tasks).set(values).where(eq(tasks.id, id)).returning().get();
  if (!updated) {
    throw notFound(`Task with id ${id} not found`);
  }

  return mapTask(database, updated);
}

export function updateTaskPosition(database: DbClient, id: number, input: TaskPositionInput): Task {
  const updated = database
    .update(tasks)
    .set({ status: input.status, position: input.position, updatedAt: nowIso() })
    .where(eq(tasks.id, id))
    .returning()
    .get();

  if (!updated) {
    throw notFound(`Task with id ${id} not found`);
  }

  return mapTask(database, updated);
}

export async function deleteTask(database: DbClient, id: number): Promise<void> {
  const taskIds = collectTaskSubtreeIds(database, id);

  await deleteTaskAttachmentsForIds(database, taskIds);
  deleteCommentsForEntities(database, "task", taskIds);
  deleteTaskNotesForIds(database, taskIds);

  const result = database.delete(tasks).where(eq(tasks.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`Task with id ${id} not found`);
  }
}
