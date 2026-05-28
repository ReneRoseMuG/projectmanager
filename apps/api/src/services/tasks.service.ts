import type { Task, TaskBoardItem, TaskBoardPositionInput, TaskDetail, TaskInput, TaskOwner, TaskStats, TaskUpdate, VisibleParentContext } from "@taskmanager/shared-types";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { dayPlanTasks, featureTasks, features, milestoneTasks, milestones, projectTasks, projects, taskAttachments, taskComments, taskNotes, tasks, useCases, useCaseTasks, wikiPageTasks, wikiPages } from "../db/schema.js";
import { taskRepository, type TaskRecord } from "../repositories/task.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { deleteTaskAttachmentsForIds, listTaskAttachments } from "./attachments.service.js";
import { ensureCatalogEntryExists, listClosedCatalogEntryKeys, resolveDefaultCatalogEntryKey } from "./catalogs.service.js";
import { listComments } from "./comments.service.js";
import { cleanNullable, requireNonEmpty } from "./helpers.js";
import {
  buildCreateSummary,
  buildDeleteSummary,
  buildJournalChanges,
  buildLinkSummary,
  buildUnlinkSummary,
  buildUpdateSummary,
  makeJournalContext,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor,
  type JournalFieldDefinition,
  type JournalObjectRef
} from "./journal.service.js";
import { deleteTaskNotesForIds, listTaskNotes } from "./notes.service.js";
import { assertCompatibleProjectContexts, projectContextsAreCompatible, taskOwnerProjectContext, taskProjectContext } from "./project-context.service.js";
import { getTaskTags, getTaskTagsMap } from "./tags.service.js";

export type { TaskOwner };

export type DashboardTaskOwner = { type: "project" | "milestone" | "task" | "dayPlan"; id: number };
export type DashboardOverdueTaskOwner = { type: "project" | "milestone" | "dayPlan"; id: number };

type MappableTaskRecord = Pick<TaskRecord, "id" | "parentId" | "title" | "description" | "status" | "priority" | "assignee" | "dueDate" | "version" | "createdAt" | "updatedAt">;
type OwnerTaskRecord = MappableTaskRecord & { boardPosition: number; visibleParent?: VisibleParentContext | null };
interface SupportCounts {
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
}

const emptySupportCounts: SupportCounts = {
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0
};

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

const taskJournalFields: Array<JournalFieldDefinition<TaskRecord>> = [
  { key: "title", label: "Titel" },
  { key: "description", label: "Beschreibung" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priorität" },
  { key: "assignee", label: "Zuständige Person" },
  { key: "dueDate", label: "Fälligkeitsdatum" }
];

export function mapTask(
  database: DbClient,
  record: MappableTaskRecord,
  tags = getTaskTags(database, record.id),
  subtaskCount = getSubtaskCounts(database, [record.id]).get(record.id) ?? 0,
  visibleParent?: VisibleParentContext | null,
  supportCounts = getTaskSupportCounts(database, [record.id]).get(record.id) ?? emptySupportCounts
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
    subtaskCount,
    attachmentCount: supportCounts.attachmentCount,
    noteCount: supportCounts.noteCount,
    commentCount: supportCounts.commentCount,
    visibleParent
  };
}

function mapTaskBoardItem(database: DbClient, record: OwnerTaskRecord, tags?: Task["tags"], subtaskCount?: number, supportCounts?: SupportCounts): TaskBoardItem {
  return {
    ...mapTask(database, record, tags, subtaskCount, record.visibleParent, supportCounts),
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

function ensureMilestoneExists(database: DbClient, milestoneId: number): void {
  const milestone = database.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
}

function ensureUseCaseExists(database: DbClient, useCaseId: number): void {
  const useCase = database.select({ id: useCases.id }).from(useCases).where(eq(useCases.id, useCaseId)).get();
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
}

function ensureWikiPageExists(database: DbClient, wikiPageId: number): void {
  const page = database.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.id, wikiPageId)).get();
  if (!page) {
    throw notFound(`Wiki page with id ${wikiPageId} not found`);
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
  if (owner.type === "milestone") {
    ensureMilestoneExists(database, owner.id);
    return;
  }
  if (owner.type === "wikiPage") {
    ensureWikiPageExists(database, owner.id);
    return;
  }
  ensureUseCaseExists(database, owner.id);
}

function getOwnerJournalObject(database: DbClient, owner: TaskOwner): JournalObjectRef {
  if (owner.type === "project") {
    const project = database.select({ name: projects.name }).from(projects).where(eq(projects.id, owner.id)).get();
    return makeJournalObject("project", owner.id, project?.name ?? `Projekt ${owner.id}`);
  }
  if (owner.type === "milestone") {
    const milestone = database.select({ name: milestones.name }).from(milestones).where(eq(milestones.id, owner.id)).get();
    return makeJournalObject("milestone", owner.id, milestone?.name ?? `Meilenstein ${owner.id}`);
  }
  if (owner.type === "feature") {
    const feature = database.select({ title: features.title }).from(features).where(eq(features.id, owner.id)).get();
    return makeJournalObject("feature", owner.id, feature?.title ?? `Feature ${owner.id}`);
  }
  if (owner.type === "wikiPage") {
    const page = database.select({ title: wikiPages.title }).from(wikiPages).where(eq(wikiPages.id, owner.id)).get();
    return makeJournalObject("wikiPage", owner.id, page?.title ?? `Wiki-Seite ${owner.id}`);
  }
  const useCase = database.select({ title: useCases.title }).from(useCases).where(eq(useCases.id, owner.id)).get();
  return makeJournalObject("useCase", owner.id, useCase?.title ?? `Use Case ${owner.id}`);
}

function visibleParentForOwner(database: DbClient, owner: TaskOwner, origin: VisibleParentContext["origin"]): VisibleParentContext {
  const ownerObject = getOwnerJournalObject(database, owner);
  return {
    type: owner.type,
    id: owner.id,
    label: ownerObject.label,
    origin
  };
}

function withVisibleParent(rows: Array<MappableTaskRecord & { boardPosition: number }>, parent: VisibleParentContext): OwnerTaskRecord[] {
  return rows.map((row) => ({ ...row, visibleParent: parent }));
}

function taskJournalObject(task: Pick<TaskRecord, "id" | "title">): JournalObjectRef {
  return makeJournalObject("task", task.id, task.title);
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

function getTaskSupportCounts(database: DbClient, taskIds: number[]): Map<number, SupportCounts> {
  const counts = new Map<number, SupportCounts>();
  if (taskIds.length === 0) {
    return counts;
  }

  const ensureCounts = (taskId: number): SupportCounts => {
    const current = counts.get(taskId);
    if (current) {
      return current;
    }
    const nextCounts = { ...emptySupportCounts };
    counts.set(taskId, nextCounts);
    return nextCounts;
  };

  const attachmentRows = database.select({ taskId: taskAttachments.taskId }).from(taskAttachments).where(inArray(taskAttachments.taskId, taskIds)).all();
  for (const row of attachmentRows) {
    ensureCounts(row.taskId).attachmentCount += 1;
  }

  const noteRows = database.select({ taskId: taskNotes.taskId }).from(taskNotes).where(inArray(taskNotes.taskId, taskIds)).all();
  for (const row of noteRows) {
    ensureCounts(row.taskId).noteCount += 1;
  }

  const commentRows = database.select({ taskId: taskComments.taskId }).from(taskComments).where(inArray(taskComments.taskId, taskIds)).all();
  for (const row of commentRows) {
    ensureCounts(row.taskId).commentCount += 1;
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
  if (database.select({ taskId: milestoneTasks.taskId }).from(milestoneTasks).where(inArray(milestoneTasks.taskId, taskIds)).get()) {
    blockers.push("Meilenstein-Verknüpfungen");
  }
  if (database.select({ taskId: useCaseTasks.taskId }).from(useCaseTasks).where(inArray(useCaseTasks.taskId, taskIds)).get()) {
    blockers.push("Use-Case-Verknüpfungen");
  }

  if (database.select({ taskId: wikiPageTasks.taskId }).from(wikiPageTasks).where(inArray(wikiPageTasks.taskId, taskIds)).get()) {
    blockers.push("Wiki-VerknÃ¼pfungen");
  }

  if (database.select({ taskId: dayPlanTasks.taskId }).from(dayPlanTasks).where(inArray(dayPlanTasks.taskId, taskIds)).get()) {
    blockers.push("Verknüpfungen zur Persönlichen Planung");
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
  if (owner.type === "milestone") {
    return database
      .select({ ...taskSelect, boardPosition: milestoneTasks.position })
      .from(milestoneTasks)
      .innerJoin(tasks, eq(milestoneTasks.taskId, tasks.id))
      .where(and(eq(milestoneTasks.ownerId, owner.id), isNull(tasks.parentId)))
      .orderBy(tasks.status, milestoneTasks.position)
      .all();
  }
  if (owner.type === "wikiPage") {
    return database
      .select({ ...taskSelect, boardPosition: wikiPageTasks.position })
      .from(wikiPageTasks)
      .innerJoin(tasks, eq(wikiPageTasks.taskId, tasks.id))
      .where(and(eq(wikiPageTasks.ownerId, owner.id), isNull(tasks.parentId)))
      .orderBy(tasks.status, wikiPageTasks.position)
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

function selectProjectMilestoneTaskRows(database: DbClient, projectId: number): OwnerTaskRecord[] {
  const milestoneRows = database
    .select({
      ...taskSelect,
      boardPosition: milestoneTasks.position,
      milestoneId: milestones.id,
      milestoneName: milestones.name
    })
    .from(milestoneTasks)
    .innerJoin(milestones, eq(milestoneTasks.ownerId, milestones.id))
    .innerJoin(tasks, eq(milestoneTasks.taskId, tasks.id))
    .where(and(eq(milestones.projectId, projectId), isNull(tasks.parentId)))
    .orderBy(tasks.status, milestoneTasks.position)
    .all();

  return milestoneRows.map((row) => {
    const { milestoneId, milestoneName, ...taskRow } = row;
    return {
      ...taskRow,
      visibleParent: {
        type: "milestone",
        id: milestoneId,
        label: milestoneName,
        origin: "inherited"
      }
    };
  });
}

function selectVisibleOwnerTaskRows(database: DbClient, owner: TaskOwner): OwnerTaskRecord[] {
  const directRows = withVisibleParent(selectOwnerTaskRows(database, owner), visibleParentForOwner(database, owner, "direct"));
  if (owner.type !== "project") {
    return directRows;
  }

  const directIds = new Set(directRows.map((row) => row.id));
  const inheritedRows = selectProjectMilestoneTaskRows(database, owner.id).filter((row) => !directIds.has(row.id));
  return [...directRows, ...inheritedRows];
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
  if (owner.type === "milestone") {
    database.insert(milestoneTasks).values({ ownerId: owner.id, taskId, position }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "wikiPage") {
    database.insert(wikiPageTasks).values({ ownerId: owner.id, taskId, position }).onConflictDoNothing().run();
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
  if (owner.type === "milestone") {
    database.update(milestoneTasks).set({ position }).where(and(eq(milestoneTasks.ownerId, owner.id), eq(milestoneTasks.taskId, taskId))).run();
    return;
  }
  if (owner.type === "wikiPage") {
    database.update(wikiPageTasks).set({ position }).where(and(eq(wikiPageTasks.ownerId, owner.id), eq(wikiPageTasks.taskId, taskId))).run();
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
  if (owner.type === "milestone") {
    return database.delete(milestoneTasks).where(and(eq(milestoneTasks.ownerId, owner.id), eq(milestoneTasks.taskId, taskId))).run().changes;
  }
  if (owner.type === "wikiPage") {
    return database.delete(wikiPageTasks).where(and(eq(wikiPageTasks.ownerId, owner.id), eq(wikiPageTasks.taskId, taskId))).run().changes;
  }
  return database.delete(useCaseTasks).where(and(eq(useCaseTasks.ownerId, owner.id), eq(useCaseTasks.taskId, taskId))).run().changes;
}

function insertTask(database: DbClient, input: TaskInput, parentId: number | null = null, actor?: JournalActor | null): TaskRecord {
  const title = requireNonEmpty(input.title, "title");
  const status = input.status ?? resolveDefaultCatalogEntryKey(database, "workStatus", "active");
  const priority = input.priority ?? resolveDefaultCatalogEntryKey(database, "priority", "medium");
  ensureCatalogEntryExists(database, "workStatus", status);
  ensureCatalogEntryExists(database, "priority", priority);

  return taskRepository.create(
    database,
    {
      parentId,
      title,
      description: cleanNullable(input.description) ?? null,
      status,
      priority,
      assignee: cleanNullable(input.assignee) ?? null,
      dueDate: input.dueDate ?? null
    },
    actor?.actorUserId ?? undefined
  );
}

export function listOwnerTasks(database: DbClient, owner: TaskOwner): TaskBoardItem[] {
  ensureOwnerExists(database, owner);
  const rows = selectVisibleOwnerTaskRows(database, owner);
  const ids = rows.map((task) => task.id);
  const tagsByTask = getTaskTagsMap(database, ids);
  const subtaskCounts = getSubtaskCounts(database, ids);
  const supportCounts = getTaskSupportCounts(database, ids);

  return rows.map((task) => mapTaskBoardItem(database, task, tagsByTask.get(task.id) ?? [], subtaskCounts.get(task.id) ?? 0, supportCounts.get(task.id) ?? emptySupportCounts));
}

export function listTasks(database: DbClient): Task[] {
  const rows = taskRepository.findRootTasks(database);
  const ids = rows.map((task) => task.id);
  const tagsByTask = getTaskTagsMap(database, ids);
  const subtaskCounts = getSubtaskCounts(database, ids);
  const supportCounts = getTaskSupportCounts(database, ids);

  return rows.map((task) => mapTask(database, task, tagsByTask.get(task.id) ?? [], subtaskCounts.get(task.id) ?? 0, undefined, supportCounts.get(task.id) ?? emptySupportCounts));
}

export function listTaskLinkCandidates(database: DbClient, owner: TaskOwner): Task[] {
  ensureOwnerExists(database, owner);
  const linkedTaskIds = new Set(selectVisibleOwnerTaskRows(database, owner).map((task) => task.id));
  const closedStatusKeys = listClosedCatalogEntryKeys(database, "workStatus");
  if (owner.type === "wikiPage") {
    return listTasks(database).filter((task) => !linkedTaskIds.has(task.id) && !closedStatusKeys.has(task.status));
  }

  const ownerContext = taskOwnerProjectContext(database, owner);

  return listTasks(database).filter(
    (task) => !linkedTaskIds.has(task.id) && !closedStatusKeys.has(task.status) && projectContextsAreCompatible(ownerContext, taskProjectContext(database, task.id))
  );
}

export function listSubtasks(database: DbClient, taskId: number): Task[] {
  getTaskRecord(database, taskId);
  const rows = taskRepository.findChildren(database, taskId);
  const ids = rows.map((task) => task.id);
  const tagsByTask = getTaskTagsMap(database, ids);
  const subtaskCounts = getSubtaskCounts(database, ids);
  const supportCounts = getTaskSupportCounts(database, ids);

  return rows.map((task) => mapTask(database, task, tagsByTask.get(task.id) ?? [], subtaskCounts.get(task.id) ?? 0, undefined, supportCounts.get(task.id) ?? emptySupportCounts));
}

function listDashboardTasks(database: DbClient, owner?: DashboardTaskOwner): Task[] {
  if (!owner) {
    return listTasks(database);
  }
  if (owner.type === "dayPlan") {
    const rows = database
      .select({ ...taskSelect, boardPosition: dayPlanTasks.position })
      .from(dayPlanTasks)
      .innerJoin(tasks, eq(dayPlanTasks.taskId, tasks.id))
      .where(and(eq(dayPlanTasks.ownerId, owner.id), isNull(tasks.parentId)))
      .orderBy(tasks.status, dayPlanTasks.position)
      .all();
    const ids = rows.map((task) => task.id);
    const tagsByTask = getTaskTagsMap(database, ids);
    const subtaskCounts = getSubtaskCounts(database, ids);
    const supportCounts = getTaskSupportCounts(database, ids);

    return rows.map((task) => mapTaskBoardItem(database, task, tagsByTask.get(task.id) ?? [], subtaskCounts.get(task.id) ?? 0, supportCounts.get(task.id) ?? emptySupportCounts));
  }
  if (owner.type === "task") {
    return listSubtasks(database, owner.id);
  }
  if (owner.type === "project") {
    const seen = new Set<number>();
    return listOwnerTasks(database, { type: "project", id: owner.id }).filter((task) => {
      if (seen.has(task.id)) {
        return false;
      }
      seen.add(task.id);
      return true;
    });
  }
  return listOwnerTasks(database, { type: "milestone", id: owner.id });
}

function dateKey(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isOpenTaskStatus(status: string, closedStatusKeys: Set<string>): boolean {
  return !closedStatusKeys.has(status);
}

export function getTaskStats(database: DbClient, owner?: DashboardTaskOwner): TaskStats {
  const statusCounts: Record<string, number> = {};
  for (const task of listDashboardTasks(database, owner)) {
    statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
  }
  return {
    statusCounts,
    total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
  };
}

export function listRecentTasks(
  database: DbClient,
  options: { owner?: DashboardTaskOwner; limit?: number; sort?: "createdAt" | "updatedAt" } = {}
): Task[] {
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const sort = options.sort ?? "updatedAt";
  const closedStatusKeys = listClosedCatalogEntryKeys(database, "workStatus");
  return [...listDashboardTasks(database, options.owner)]
    .filter((task) => isOpenTaskStatus(task.status, closedStatusKeys))
    .sort((left, right) => dateKey(right[sort]) - dateKey(left[sort]) || right.id - left.id)
    .slice(0, limit);
}

export function listOverdueTasks(database: DbClient, options: { owner?: DashboardOverdueTaskOwner; limit?: number } = {}): Task[] {
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const today = new Date().toISOString().slice(0, 10);
  const closedStatusKeys = listClosedCatalogEntryKeys(database, "workStatus");
  return [...listDashboardTasks(database, options.owner)]
    .filter((task) => task.dueDate !== null && task.dueDate < today && isOpenTaskStatus(task.status, closedStatusKeys))
    .sort((left, right) => String(left.dueDate).localeCompare(String(right.dueDate)) || left.id - right.id)
    .slice(0, limit);
}

export function createOwnerTask(database: DbClient, owner: TaskOwner, input: TaskInput, actor?: JournalActor | null): TaskBoardItem {
  ensureOwnerExists(database, owner);
  const status = input.status ?? resolveDefaultCatalogEntryKey(database, "workStatus", "active");
  const position = nextOwnerPosition(database, owner, status);
  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const task = insertTask(txDb, input, null, actor);
    insertOwnerTask(txDb, owner, task.id, position);
    const taskObject = taskJournalObject(task);
    const ownerObject = getOwnerJournalObject(txDb, owner);
    recordJournalEntry(txDb, {
      operation: "create",
      object: taskObject,
      summary: buildCreateSummary(taskObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
    return task;
  });

  return mapTaskBoardItem(database, { ...created, boardPosition: position }, [], 0);
}

export function linkOwnerTask(
  database: DbClient,
  owner: TaskOwner,
  taskId: number,
  actor?: JournalActor | null,
  options: { conflictOnExisting?: boolean } = {}
): TaskBoardItem {
  ensureOwnerExists(database, owner);
  const task = getTaskRecord(database, taskId);
  if (task.parentId !== null) {
    throw badRequest("Subtasks cannot be linked to owners");
  }
  if (listClosedCatalogEntryKeys(database, "workStatus").has(task.status)) {
    throw badRequest("Closed tasks cannot be linked to owners");
  }

  const existing = getOwnerTaskRow(database, owner, taskId);
  if (existing) {
    if (options.conflictOnExisting === true) {
      throw conflict(`Task ${taskId} is already linked to ${owner.type} ${owner.id}`);
    }
    return mapTaskBoardItem(database, existing);
  }

  if (owner.type !== "wikiPage") {
    assertCompatibleProjectContexts(taskOwnerProjectContext(database, owner), taskProjectContext(database, taskId));
  }

  const position = nextOwnerPosition(database, owner, task.status);
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    insertOwnerTask(txDb, owner, taskId, position);
    const taskObject = taskJournalObject(task);
    const ownerObject = getOwnerJournalObject(txDb, owner);
    recordJournalEntry(txDb, {
      operation: "link",
      object: taskObject,
      summary: buildLinkSummary(ownerObject, taskObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
  return mapTaskBoardItem(database, { ...task, boardPosition: position });
}

export function unlinkOwnerTask(database: DbClient, owner: TaskOwner, taskId: number, actor?: JournalActor | null): void {
  ensureOwnerExists(database, owner);
  const task = getTaskRecord(database, taskId);
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const changes = deleteOwnerTaskLink(txDb, owner, taskId);
    if (changes === 0) {
      throw notFound(`Task ${taskId} is not linked to ${owner.type} ${owner.id}`);
    }
    const taskObject = taskJournalObject(task);
    const ownerObject = getOwnerJournalObject(txDb, owner);
    recordJournalEntry(txDb, {
      operation: "unlink",
      object: taskObject,
      summary: buildUnlinkSummary(ownerObject, taskObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
}

export function updateOwnerTaskBoard(database: DbClient, owner: TaskOwner, taskId: number, input: TaskBoardPositionInput, actor?: JournalActor | null): TaskBoardItem {
  ensureOwnerExists(database, owner);
  ensureCatalogEntryExists(database, "workStatus", input.status);
  const linked = getOwnerTaskRow(database, owner, taskId);
  if (!linked) {
    throw notFound(`Task ${taskId} is not linked to ${owner.type} ${owner.id}`);
  }

  const updated = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const task = taskRepository.update(txDb, taskId, input.expectedVersion, { status: input.status }, actor?.actorUserId ?? undefined);
    if (!task) {
      throw notFound(`Task with id ${taskId} not found`);
    }
    updateOwnerTaskPosition(txDb, owner, taskId, input.position);
    const taskObject = taskJournalObject(task);
    const ownerObject = getOwnerJournalObject(txDb, owner);
    const changes = buildJournalChanges(linked, { ...task, boardPosition: input.position }, [
      { key: "status", label: "Status" },
      { key: "boardPosition", label: "Board-Position" }
    ]);
    recordJournalEntry(txDb, {
      operation: "update",
      object: taskObject,
      summary: buildUpdateSummary(taskObject, changes),
      actor,
      changes,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
    return task;
  });

  return mapTaskBoardItem(database, { ...updated, boardPosition: input.position });
}

export function createSubtask(database: DbClient, taskId: number, input: TaskInput, actor?: JournalActor | null): Task {
  const parent = getTaskRecord(database, taskId);
  if (parent.parentId !== null) {
    throw badRequest("Subtasks cannot have subtasks");
  }

  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const task = insertTask(txDb, input, parent.id, actor);
    const taskObject = taskJournalObject(task);
    const parentObject = taskJournalObject(parent);
    recordJournalEntry(txDb, {
      operation: "create",
      object: taskObject,
      summary: buildCreateSummary(taskObject),
      actor,
      contexts: [makeJournalContext(parentObject, "parent")]
    });
    return task;
  });
  return mapTask(database, created, [], 0);
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

export function updateTask(database: DbClient, id: number, input: TaskUpdate, actor?: JournalActor | null): Task {
  const values: Partial<Pick<TaskRecord, "title" | "description" | "status" | "priority" | "assignee" | "dueDate">> = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.status !== undefined) {
    ensureCatalogEntryExists(database, "workStatus", input.status);
    values.status = input.status;
  }
  if (input.priority !== undefined) {
    ensureCatalogEntryExists(database, "priority", input.priority);
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

  const updated = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const current = getTaskRecord(txDb, id);
    const task = taskRepository.update(txDb, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!task) {
      throw notFound(`Task with id ${id} not found`);
    }
    const taskObject = taskJournalObject(task);
    const changes = buildJournalChanges(current, task, taskJournalFields);
    recordJournalEntry(txDb, {
      operation: "update",
      object: taskObject,
      summary: buildUpdateSummary(taskObject, changes),
      actor,
      changes,
      contexts: current.parentId ? [makeJournalContext(makeJournalObject("task", current.parentId, `Aufgabe ${current.parentId}`), "parent")] : []
    });
    return task;
  });

  return mapTask(database, updated);
}

export async function deleteTask(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const taskIds = collectTaskSubtreeIds(database, id);
  const task = getTaskRecord(database, id);
  const blockers = taskDeleteBlockers(database, taskIds);
  if (blockers.length > 0) {
    throw conflict(`Aufgabe kann nicht gelöscht werden, solange Beziehungen bestehen: ${blockers.join(", ")}.`);
  }

  await deleteTaskAttachmentsForIds(database, taskIds);
  deleteTaskNotesForIds(database, taskIds);

  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const taskObject = taskJournalObject(task);
    recordJournalEntry(txDb, {
      operation: "delete",
      object: taskObject,
      summary: buildDeleteSummary(taskObject),
      actor
    });
    if (taskRepository.delete(txDb, id) === 0) {
      throw notFound(`Task with id ${id} not found`);
    }
  });
}
