import type { Task, TaskBoardItem, TaskBoardPositionInput, TaskDetail, TaskInput, TaskUpdate } from "@taskmanager/shared-types";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { featureTasks, features, projectTasks, projects, tasks, useCases, useCaseTasks } from "../db/schema.js";
import { taskRepository, type TaskRecord } from "../repositories/task.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { deleteTaskAttachmentsForIds, listTaskAttachments } from "./attachments.service.js";
import { listComments } from "./comments.service.js";
import { cleanNullable, requireNonEmpty } from "./helpers.js";
import { deleteTaskNotesForIds, listTaskNotes } from "./notes.service.js";
import { getTaskTags, getTaskTagsMap } from "./tags.service.js";

export type TaskOwner = { type: "project" | "feature" | "useCase"; id: number };

type MappableTaskRecord = Pick<TaskRecord, "id" | "parentId" | "title" | "description" | "status" | "priority" | "assignee" | "dueDate" | "version" | "createdAt" | "updatedAt">;

const taskSelect = {
  id: tasks.id,
  parentId: tasks.parentId,
  title: tasks.title,
  description: tasks.description,
  status: tasks.status,
  priority: tasks.priority,
  assignee: tasks.assignee,
  dueDate: tasks.dueDate,
  version: tasks.version,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt
};

export function mapTask(
  database: DbClient,
  record: MappableTaskRecord,
  tags = getTaskTags(database, record.id),
  subtaskCount = getSubtaskCounts(database, [record.id]).get(record.id) ?? 0
): Task {
  return {
    id: record.id,
    parentId: record.parentId,
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    assignee: record.assignee,
    dueDate: record.dueDate,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tags,
    subtaskCount
  };
}

function mapTaskBoardItem(database: DbClient, record: MappableTaskRecord & { boardPosition: number }, tags?: Task["tags"], subtaskCount?: number): TaskBoardItem {
  return {
    ...mapTask(database, record, tags, subtaskCount),
    boardPosition: record.boardPosition
  };
}

function ensureProjectExists(database: DbClient, projectId: number): void {
  const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

function ensureFeatureExists(database: DbClient, featureId: number): void {
  const feature = database.select({ id: features.id }).from(features).where(eq(features.id, featureId)).get();
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

function ensureUseCaseExists(database: DbClient, useCaseId: number): void {
  const useCase = database.select({ id: useCases.id }).from(useCases).where(eq(useCases.id, useCaseId)).get();
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
}

function ensureOwnerExists(database: DbClient, owner: TaskOwner): void {
  if (owner.type === "project") {
    ensureProjectExists(database, owner.id);
    return;
  }
  if (owner.type === "feature") {
    ensureFeatureExists(database, owner.id);
    return;
  }
  ensureUseCaseExists(database, owner.id);
}

function getTaskRecord(database: DbClient, id: number): TaskRecord {
  const task = taskRepository.findById(database, id);
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
  getTaskRecord(database, taskId);
  const rows = taskRepository.findAll(database);
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

function taskDeleteBlockers(database: DbClient, taskIds: number[]): string[] {
  const blockers: string[] = [];

  if (database.select({ taskId: projectTasks.taskId }).from(projectTasks).where(inArray(projectTasks.taskId, taskIds)).get()) {
    blockers.push("Projekt-Verknüpfungen");
  }
  if (database.select({ taskId: featureTasks.taskId }).from(featureTasks).where(inArray(featureTasks.taskId, taskIds)).get()) {
    blockers.push("Feature-Verknüpfungen");
  }
  if (database.select({ taskId: useCaseTasks.taskId }).from(useCaseTasks).where(inArray(useCaseTasks.taskId, taskIds)).get()) {
    blockers.push("Use-Case-Verknüpfungen");
  }

  return blockers;
}

function nextOwnerPosition(database: DbClient, owner: TaskOwner, status: TaskRecord["status"]): number {
  const rows = selectOwnerTaskRows(database, owner).filter((task) => task.status === status);
  return rows.reduce((current, row) => Math.max(current, row.boardPosition), 0) + 1024;
}

function selectOwnerTaskRows(database: DbClient, owner: TaskOwner): Array<MappableTaskRecord & { boardPosition: number }> {
  if (owner.type === "project") {
    return database
      .select({ ...taskSelect, boardPosition: projectTasks.position })
      .from(projectTasks)
      .innerJoin(tasks, eq(projectTasks.taskId, tasks.id))
      .where(and(eq(projectTasks.ownerId, owner.id), isNull(tasks.parentId)))
      .orderBy(tasks.status, projectTasks.position)
      .all();
  }
  if (owner.type === "feature") {
    return database
      .select({ ...taskSelect, boardPosition: featureTasks.position })
      .from(featureTasks)
      .innerJoin(tasks, eq(featureTasks.taskId, tasks.id))
      .where(and(eq(featureTasks.ownerId, owner.id), isNull(tasks.parentId)))
      .orderBy(tasks.status, featureTasks.position)
      .all();
  }

  return database
    .select({ ...taskSelect, boardPosition: useCaseTasks.position })
    .from(useCaseTasks)
    .innerJoin(tasks, eq(useCaseTasks.taskId, tasks.id))
    .where(and(eq(useCaseTasks.ownerId, owner.id), isNull(tasks.parentId)))
    .orderBy(tasks.status, useCaseTasks.position)
    .all();
}

function getOwnerTaskRow(database: DbClient, owner: TaskOwner, taskId: number): (MappableTaskRecord & { boardPosition: number }) | undefined {
  return selectOwnerTaskRows(database, owner).find((task) => task.id === taskId);
}

function insertOwnerTask(database: DbClient, owner: TaskOwner, taskId: number, position: number): void {
  if (owner.type === "project") {
    database.insert(projectTasks).values({ ownerId: owner.id, taskId, position }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "feature") {
    database.insert(featureTasks).values({ ownerId: owner.id, taskId, position }).onConflictDoNothing().run();
    return;
  }
  database.insert(useCaseTasks).values({ ownerId: owner.id, taskId, position }).onConflictDoNothing().run();
}

function updateOwnerTaskPosition(database: DbClient, owner: TaskOwner, taskId: number, position: number): void {
  if (owner.type === "project") {
    database.update(projectTasks).set({ position }).where(and(eq(projectTasks.ownerId, owner.id), eq(projectTasks.taskId, taskId))).run();
    return;
  }
  if (owner.type === "feature") {
    database.update(featureTasks).set({ position }).where(and(eq(featureTasks.ownerId, owner.id), eq(featureTasks.taskId, taskId))).run();
    return;
  }
  database.update(useCaseTasks).set({ position }).where(and(eq(useCaseTasks.ownerId, owner.id), eq(useCaseTasks.taskId, taskId))).run();
}

function deleteOwnerTaskLink(database: DbClient, owner: TaskOwner, taskId: number): number {
  if (owner.type === "project") {
    return database.delete(projectTasks).where(and(eq(projectTasks.ownerId, owner.id), eq(projectTasks.taskId, taskId))).run().changes;
  }
  if (owner.type === "feature") {
    return database.delete(featureTasks).where(and(eq(featureTasks.ownerId, owner.id), eq(featureTasks.taskId, taskId))).run().changes;
  }
  return database.delete(useCaseTasks).where(and(eq(useCaseTasks.ownerId, owner.id), eq(useCaseTasks.taskId, taskId))).run().changes;
}

function insertTask(database: DbClient, input: TaskInput, parentId: number | null = null): TaskRecord {
  const title = requireNonEmpty(input.title, "title");

  return taskRepository.create(database, {
    parentId,
    title,
    description: cleanNullable(input.description) ?? null,
    status: input.status ?? "todo",
    priority: input.priority ?? "medium",
    assignee: cleanNullable(input.assignee) ?? null,
    dueDate: input.dueDate ?? null
  });
}

export function listOwnerTasks(database: DbClient, owner: TaskOwner): TaskBoardItem[] {
  ensureOwnerExists(database, owner);
  const rows = selectOwnerTaskRows(database, owner);
  const ids = rows.map((task) => task.id);
  const tagsByTask = getTaskTagsMap(database, ids);
  const subtaskCounts = getSubtaskCounts(database, ids);

  return rows.map((task) => mapTaskBoardItem(database, task, tagsByTask.get(task.id) ?? [], subtaskCounts.get(task.id) ?? 0));
}

export function listTasks(database: DbClient): Task[] {
  const rows = taskRepository.findRootTasks(database);
  const ids = rows.map((task) => task.id);
  const tagsByTask = getTaskTagsMap(database, ids);
  const subtaskCounts = getSubtaskCounts(database, ids);

  return rows.map((task) => mapTask(database, task, tagsByTask.get(task.id) ?? [], subtaskCounts.get(task.id) ?? 0));
}

export function listSubtasks(database: DbClient, taskId: number): Task[] {
  getTaskRecord(database, taskId);
  const rows = taskRepository.findChildren(database, taskId);
  const ids = rows.map((task) => task.id);
  const tagsByTask = getTaskTagsMap(database, ids);
  const subtaskCounts = getSubtaskCounts(database, ids);

  return rows.map((task) => mapTask(database, task, tagsByTask.get(task.id) ?? [], subtaskCounts.get(task.id) ?? 0));
}

export function createOwnerTask(database: DbClient, owner: TaskOwner, input: TaskInput): TaskBoardItem {
  ensureOwnerExists(database, owner);
  const status = input.status ?? "todo";
  const position = nextOwnerPosition(database, owner, status);
  const created = database.transaction((tx) => {
    const task = insertTask(tx as unknown as DbClient, input);
    insertOwnerTask(tx as unknown as DbClient, owner, task.id, position);
    return task;
  });

  return mapTaskBoardItem(database, { ...created, boardPosition: position }, [], 0);
}

export function linkOwnerTask(database: DbClient, owner: TaskOwner, taskId: number): TaskBoardItem {
  ensureOwnerExists(database, owner);
  const task = getTaskRecord(database, taskId);
  if (task.parentId !== null) {
    throw badRequest("Subtasks cannot be linked to owners");
  }

  const existing = getOwnerTaskRow(database, owner, taskId);
  if (existing) {
    return mapTaskBoardItem(database, existing);
  }

  const position = nextOwnerPosition(database, owner, task.status);
  insertOwnerTask(database, owner, taskId, position);
  return mapTaskBoardItem(database, { ...task, boardPosition: position });
}

export function unlinkOwnerTask(database: DbClient, owner: TaskOwner, taskId: number): void {
  ensureOwnerExists(database, owner);
  const changes = deleteOwnerTaskLink(database, owner, taskId);
  if (changes === 0) {
    throw notFound(`Task ${taskId} is not linked to ${owner.type} ${owner.id}`);
  }
}

export function updateOwnerTaskBoard(database: DbClient, owner: TaskOwner, taskId: number, input: TaskBoardPositionInput): TaskBoardItem {
  ensureOwnerExists(database, owner);
  const linked = getOwnerTaskRow(database, owner, taskId);
  if (!linked) {
    throw notFound(`Task ${taskId} is not linked to ${owner.type} ${owner.id}`);
  }

  const updated = taskRepository.update(database, taskId, input.expectedVersion, { status: input.status });
  if (!updated) {
    throw notFound(`Task with id ${taskId} not found`);
  }
  updateOwnerTaskPosition(database, owner, taskId, input.position);

  return mapTaskBoardItem(database, { ...updated, boardPosition: input.position });
}

export function createSubtask(database: DbClient, taskId: number, input: TaskInput): Task {
  const parent = getTaskRecord(database, taskId);
  if (parent.parentId !== null) {
    throw badRequest("Subtasks cannot have subtasks");
  }

  return mapTask(database, insertTask(database, input, parent.id), [], 0);
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
  const values: Partial<Pick<TaskRecord, "title" | "description" | "status" | "priority" | "assignee" | "dueDate">> = {};

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

  const updated = taskRepository.update(database, id, input.expectedVersion, values);
  if (!updated) {
    throw notFound(`Task with id ${id} not found`);
  }

  return mapTask(database, updated);
}

export async function deleteTask(database: DbClient, id: number): Promise<void> {
  const taskIds = collectTaskSubtreeIds(database, id);
  const blockers = taskDeleteBlockers(database, taskIds);
  if (blockers.length > 0) {
    throw conflict(`Aufgabe kann nicht gelöscht werden, solange Beziehungen bestehen: ${blockers.join(", ")}.`);
  }

  await deleteTaskAttachmentsForIds(database, taskIds);
  deleteTaskNotesForIds(database, taskIds);

  if (taskRepository.delete(database, id) === 0) {
    throw notFound(`Task with id ${id} not found`);
  }
}
