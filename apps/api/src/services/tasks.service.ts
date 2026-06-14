import type { Task, TaskBoardItem, TaskBoardPositionInput, TaskDetail, TaskInput, TaskOwner, TaskStats, TaskUpdate, VisibleParentContext } from "@taskmanager/shared-types";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { dayPlans, dayPlanTasks, featureTasks, features, milestoneTasks, milestones, projectTasks, projects, taskAttachments, taskComments, taskNotes, tasks, useCases, useCaseTasks, wikiPageTasks, wikiPages } from "../db/schema.js";
import { firstRow, mutationAffectedRows, recencyOrder } from "../db/query-utils.js";
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
import { deleteTaskCommentsForIds } from "./comments.service.js";
import { deleteTaskNotesForIds, listTaskNotes } from "./notes.service.js";
import { assertCompatibleProjectContexts, projectContextsAreCompatible, taskOwnerProjectContext, taskProjectContext } from "./project-context.service.js";
import { getTaskTags, getTaskTagsMap } from "./tags.service.js";
import { getUserOption, normalizeAssignableUserId } from "./users.service.js";

export type { TaskOwner };

export type DashboardTaskOwner = { type: "project" | "milestone" | "task" | "dayPlan"; id: number };
export type DashboardOverdueTaskOwner = { type: "project" | "milestone" | "dayPlan"; id: number };

type MappableTaskRecord = Pick<TaskRecord, "id" | "parentId" | "title" | "description" | "status" | "priority" | "responsibleUserId" | "dueDate" | "version" | "createdAt" | "updatedAt">;
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
  responsibleUserId: tasks.responsibleUserId,
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
  { key: "responsibleUserId", label: "Zuständige Person" },
  { key: "dueDate", label: "Fälligkeitsdatum" }
];

export async function mapTask(
  database: DbClient,
  record: MappableTaskRecord,
  tags = getTaskTags(database, record.id),
  subtaskCount = getSubtaskCounts(database, [record.id]).then((m) => m.get(record.id) ?? 0),
  visibleParent?: VisibleParentContext | null,
  supportCounts = getTaskSupportCounts(database, [record.id]).then((m) => m.get(record.id) ?? emptySupportCounts)
): Promise<Task> {
  return {
    id: record.id,
    parentId: record.parentId,
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    responsibleUserId: record.responsibleUserId,
    responsibleUser: await getUserOption(database, record.responsibleUserId),
    dueDate: record.dueDate,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tags: await tags,
    subtaskCount: await subtaskCount,
    attachmentCount: (await supportCounts).attachmentCount,
    noteCount: (await supportCounts).noteCount,
    commentCount: (await supportCounts).commentCount,
    visibleParent
  };
}

async function mapTaskBoardItem(database: DbClient, record: OwnerTaskRecord, tags?: Task["tags"], subtaskCount?: number, supportCounts?: SupportCounts): Promise<TaskBoardItem> {
  return {
    ...(await mapTask(database, record, Promise.resolve(tags ?? []), Promise.resolve(subtaskCount ?? 0), record.visibleParent, Promise.resolve(supportCounts ?? emptySupportCounts))),
    boardPosition: record.boardPosition
  };
}

async function ensureProjectExists(database: DbClient, projectId: number): Promise<void> {
  const project = firstRow(await database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)));
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

async function ensureFeatureExists(database: DbClient, featureId: number): Promise<void> {
  const feature = firstRow(await database.select({ id: features.id }).from(features).where(eq(features.id, featureId)));
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

async function ensureMilestoneExists(database: DbClient, milestoneId: number): Promise<void> {
  const milestone = firstRow(await database.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, milestoneId)));
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
}

async function ensureUseCaseExists(database: DbClient, useCaseId: number): Promise<void> {
  const useCase = firstRow(await database.select({ id: useCases.id }).from(useCases).where(eq(useCases.id, useCaseId)));
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
}

async function ensureWikiPageExists(database: DbClient, wikiPageId: number): Promise<void> {
  const page = firstRow(await database.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.id, wikiPageId)));
  if (!page) {
    throw notFound(`Wiki page with id ${wikiPageId} not found`);
  }
}

async function ensureOwnerExists(database: DbClient, owner: TaskOwner): Promise<void> {
  if (owner.type === "project") {
    await ensureProjectExists(database, owner.id);
    return;
  }
  if (owner.type === "feature") {
    await ensureFeatureExists(database, owner.id);
    return;
  }
  if (owner.type === "milestone") {
    await ensureMilestoneExists(database, owner.id);
    return;
  }
  if (owner.type === "wikiPage") {
    await ensureWikiPageExists(database, owner.id);
    return;
  }
  await ensureUseCaseExists(database, owner.id);
}

async function getOwnerJournalObject(database: DbClient, owner: TaskOwner): Promise<JournalObjectRef> {
  if (owner.type === "project") {
    const project = firstRow(await database.select({ name: projects.name }).from(projects).where(eq(projects.id, owner.id)));
    return makeJournalObject("project", owner.id, project?.name ?? `Projekt ${owner.id}`);
  }
  if (owner.type === "milestone") {
    const milestone = firstRow(await database.select({ name: milestones.name }).from(milestones).where(eq(milestones.id, owner.id)));
    return makeJournalObject("milestone", owner.id, milestone?.name ?? `Meilenstein ${owner.id}`);
  }
  if (owner.type === "feature") {
    const feature = firstRow(await database.select({ title: features.title }).from(features).where(eq(features.id, owner.id)));
    return makeJournalObject("feature", owner.id, feature?.title ?? `Feature ${owner.id}`);
  }
  if (owner.type === "wikiPage") {
    const page = firstRow(await database.select({ title: wikiPages.title }).from(wikiPages).where(eq(wikiPages.id, owner.id)));
    return makeJournalObject("wikiPage", owner.id, page?.title ?? `Wiki-Seite ${owner.id}`);
  }
  const useCase = firstRow(await database.select({ title: useCases.title }).from(useCases).where(eq(useCases.id, owner.id)));
  return makeJournalObject("useCase", owner.id, useCase?.title ?? `Use Case ${owner.id}`);
}

async function visibleParentForOwner(database: DbClient, owner: TaskOwner, origin: VisibleParentContext["origin"]): Promise<VisibleParentContext> {
  const ownerObject = await getOwnerJournalObject(database, owner);
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

async function getTaskRecord(database: DbClient, id: number): Promise<TaskRecord> {
  const task = await taskRepository.findById(database, id);
  if (!task) {
    throw notFound(`Task with id ${id} not found`);
  }
  return task;
}

async function taskParentContexts(database: DbClient, task: TaskRecord): Promise<VisibleParentContext[]> {
  const contexts: VisibleParentContext[] = [];
  if (task.parentId !== null) {
    const parentTask = firstRow(await database.select({ id: tasks.id, label: tasks.title }).from(tasks).where(eq(tasks.id, task.parentId)));
    if (parentTask) {
      contexts.push({ type: "task", id: parentTask.id, label: parentTask.label, origin: "direct" });
    }
  }

  const [projectRows, milestoneRows, featureRows, useCaseRows, wikiRows] = await Promise.all([
    database.select({ id: projects.id, label: projects.name }).from(projectTasks).innerJoin(projects, eq(projectTasks.ownerId, projects.id)).where(eq(projectTasks.taskId, task.id)),
    database.select({ id: milestones.id, label: milestones.name }).from(milestoneTasks).innerJoin(milestones, eq(milestoneTasks.ownerId, milestones.id)).where(eq(milestoneTasks.taskId, task.id)),
    database.select({ id: features.id, label: features.title }).from(featureTasks).innerJoin(features, eq(featureTasks.ownerId, features.id)).where(eq(featureTasks.taskId, task.id)),
    database.select({ id: useCases.id, label: useCases.title }).from(useCaseTasks).innerJoin(useCases, eq(useCaseTasks.ownerId, useCases.id)).where(eq(useCaseTasks.taskId, task.id)),
    database.select({ id: wikiPages.id, label: wikiPages.title }).from(wikiPageTasks).innerJoin(wikiPages, eq(wikiPageTasks.ownerId, wikiPages.id)).where(eq(wikiPageTasks.taskId, task.id))
  ]);

  contexts.push(
    ...projectRows.map((row): VisibleParentContext => ({ type: "project", id: row.id, label: row.label, origin: "direct" })),
    ...milestoneRows.map((row): VisibleParentContext => ({ type: "milestone", id: row.id, label: row.label, origin: "direct" })),
    ...featureRows.map((row): VisibleParentContext => ({ type: "feature", id: row.id, label: row.label, origin: "direct" })),
    ...useCaseRows.map((row): VisibleParentContext => ({ type: "useCase", id: row.id, label: row.label, origin: "direct" })),
    ...wikiRows.map((row): VisibleParentContext => ({ type: "wikiPage", id: row.id, label: row.label, origin: "direct" }))
  );

  return contexts;
}

async function getSubtaskCounts(database: DbClient, taskIds: number[]): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (taskIds.length === 0) {
    return counts;
  }

  const rows = await database.select({ parentId: tasks.parentId }).from(tasks).where(inArray(tasks.parentId, taskIds));
  for (const row of rows) {
    if (row.parentId !== null) {
      counts.set(row.parentId, (counts.get(row.parentId) ?? 0) + 1);
    }
  }

  return counts;
}

async function getTaskSupportCounts(database: DbClient, taskIds: number[]): Promise<Map<number, SupportCounts>> {
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

  const [attachmentRows, noteRows, commentRows] = await Promise.all([
    database.select({ taskId: taskAttachments.taskId }).from(taskAttachments).where(inArray(taskAttachments.taskId, taskIds)),
    database.select({ taskId: taskNotes.taskId }).from(taskNotes).where(inArray(taskNotes.taskId, taskIds)),
    database.select({ taskId: taskComments.taskId }).from(taskComments).where(inArray(taskComments.taskId, taskIds))
  ]);

  for (const row of attachmentRows) {
    ensureCounts(row.taskId).attachmentCount += 1;
  }
  for (const row of noteRows) {
    ensureCounts(row.taskId).noteCount += 1;
  }
  for (const row of commentRows) {
    ensureCounts(row.taskId).commentCount += 1;
  }

  return counts;
}

async function collectTaskSubtreeIds(database: DbClient, taskId: number): Promise<number[]> {
  await getTaskRecord(database, taskId);

  const ids: number[] = [];
  const queue: number[] = [taskId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    ids.push(currentId);
    const children = await taskRepository.findChildren(database, currentId);
    for (const child of children) {
      queue.push(child.id);
    }
  }
  return ids;
}

async function taskDeleteBlockers(database: DbClient, taskIds: number[]): Promise<string[]> {
  const blockers: string[] = [];

  const [projRow, featRow, mileRow, ucRow, wikiRow, dpRow] = await Promise.all([
    database.select({ taskId: projectTasks.taskId }).from(projectTasks).where(inArray(projectTasks.taskId, taskIds)).then(firstRow),
    database.select({ taskId: featureTasks.taskId }).from(featureTasks).where(inArray(featureTasks.taskId, taskIds)).then(firstRow),
    database.select({ taskId: milestoneTasks.taskId }).from(milestoneTasks).where(inArray(milestoneTasks.taskId, taskIds)).then(firstRow),
    database.select({ taskId: useCaseTasks.taskId }).from(useCaseTasks).where(inArray(useCaseTasks.taskId, taskIds)).then(firstRow),
    database.select({ taskId: wikiPageTasks.taskId }).from(wikiPageTasks).where(inArray(wikiPageTasks.taskId, taskIds)).then(firstRow),
    database.select({ taskId: dayPlanTasks.taskId }).from(dayPlanTasks).where(inArray(dayPlanTasks.taskId, taskIds)).then(firstRow)
  ]);

  if (projRow) blockers.push("Projekt-Verknüpfungen");
  if (featRow) blockers.push("Feature-Verknüpfungen");
  if (mileRow) blockers.push("Meilenstein-Verknüpfungen");
  if (ucRow) blockers.push("Use-Case-Verknüpfungen");
  if (wikiRow) blockers.push("Wiki-Verknüpfungen");
  if (dpRow) blockers.push("Verknüpfungen zur Persönlichen Planung");

  return blockers;
}

async function nextOwnerPosition(database: DbClient, owner: TaskOwner, status: TaskRecord["status"]): Promise<number> {
  const rows = await selectOwnerTaskRows(database, owner);
  const filtered = rows.filter((task) => task.status === status);
  return filtered.reduce((current, row) => Math.max(current, row.boardPosition), 0) + 1024;
}

async function selectOwnerTaskRows(database: DbClient, owner: TaskOwner): Promise<Array<MappableTaskRecord & { boardPosition: number }>> {
  if (owner.type === "project") {
    return database
      .select({ ...taskSelect, boardPosition: projectTasks.position })
      .from(projectTasks)
      .innerJoin(tasks, eq(projectTasks.taskId, tasks.id))
      .where(and(eq(projectTasks.ownerId, owner.id), isNull(tasks.parentId)))
      .orderBy(tasks.status, ...recencyOrder(tasks));
  }
  if (owner.type === "feature") {
    return database
      .select({ ...taskSelect, boardPosition: featureTasks.position })
      .from(featureTasks)
      .innerJoin(tasks, eq(featureTasks.taskId, tasks.id))
      .where(and(eq(featureTasks.ownerId, owner.id), isNull(tasks.parentId)))
      .orderBy(tasks.status, ...recencyOrder(tasks));
  }
  if (owner.type === "milestone") {
    return database
      .select({ ...taskSelect, boardPosition: milestoneTasks.position })
      .from(milestoneTasks)
      .innerJoin(tasks, eq(milestoneTasks.taskId, tasks.id))
      .where(and(eq(milestoneTasks.ownerId, owner.id), isNull(tasks.parentId)))
      .orderBy(tasks.status, ...recencyOrder(tasks));
  }
  if (owner.type === "wikiPage") {
    return database
      .select({ ...taskSelect, boardPosition: wikiPageTasks.position })
      .from(wikiPageTasks)
      .innerJoin(tasks, eq(wikiPageTasks.taskId, tasks.id))
      .where(and(eq(wikiPageTasks.ownerId, owner.id), isNull(tasks.parentId)))
      .orderBy(tasks.status, ...recencyOrder(tasks));
  }

  return database
    .select({ ...taskSelect, boardPosition: useCaseTasks.position })
    .from(useCaseTasks)
    .innerJoin(tasks, eq(useCaseTasks.taskId, tasks.id))
    .where(and(eq(useCaseTasks.ownerId, owner.id), isNull(tasks.parentId)))
    .orderBy(tasks.status, ...recencyOrder(tasks));
}

async function selectProjectMilestoneTaskRows(database: DbClient, projectId: number): Promise<OwnerTaskRecord[]> {
  const milestoneRows = await database
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
    .orderBy(tasks.status, ...recencyOrder(tasks));

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

async function selectVisibleOwnerTaskRows(database: DbClient, owner: TaskOwner): Promise<OwnerTaskRecord[]> {
  const directRows = withVisibleParent(await selectOwnerTaskRows(database, owner), await visibleParentForOwner(database, owner, "direct"));
  if (owner.type !== "project") {
    return directRows;
  }

  const directIds = new Set(directRows.map((row) => row.id));
  const inheritedRows = (await selectProjectMilestoneTaskRows(database, owner.id)).filter((row) => !directIds.has(row.id));
  return [...directRows, ...inheritedRows];
}

function getOwnerTaskRow(rows: Array<MappableTaskRecord & { boardPosition: number }>, taskId: number): (MappableTaskRecord & { boardPosition: number }) | undefined {
  return rows.find((task) => task.id === taskId);
}

async function insertOwnerTask(database: DbClient, owner: TaskOwner, taskId: number, position: number): Promise<void> {
  if (owner.type === "project") {
    await database.insert(projectTasks).ignore().values({ ownerId: owner.id, taskId, position });
    return;
  }
  if (owner.type === "feature") {
    await database.insert(featureTasks).ignore().values({ ownerId: owner.id, taskId, position });
    return;
  }
  if (owner.type === "milestone") {
    await database.insert(milestoneTasks).ignore().values({ ownerId: owner.id, taskId, position });
    return;
  }
  if (owner.type === "wikiPage") {
    await database.insert(wikiPageTasks).ignore().values({ ownerId: owner.id, taskId, position });
    return;
  }
  await database.insert(useCaseTasks).ignore().values({ ownerId: owner.id, taskId, position });
}

async function updateOwnerTaskPosition(database: DbClient, owner: TaskOwner, taskId: number, position: number): Promise<void> {
  if (owner.type === "project") {
    await database.update(projectTasks).set({ position }).where(and(eq(projectTasks.ownerId, owner.id), eq(projectTasks.taskId, taskId)));
    return;
  }
  if (owner.type === "feature") {
    await database.update(featureTasks).set({ position }).where(and(eq(featureTasks.ownerId, owner.id), eq(featureTasks.taskId, taskId)));
    return;
  }
  if (owner.type === "milestone") {
    await database.update(milestoneTasks).set({ position }).where(and(eq(milestoneTasks.ownerId, owner.id), eq(milestoneTasks.taskId, taskId)));
    return;
  }
  if (owner.type === "wikiPage") {
    await database.update(wikiPageTasks).set({ position }).where(and(eq(wikiPageTasks.ownerId, owner.id), eq(wikiPageTasks.taskId, taskId)));
    return;
  }
  await database.update(useCaseTasks).set({ position }).where(and(eq(useCaseTasks.ownerId, owner.id), eq(useCaseTasks.taskId, taskId)));
}

async function deleteOwnerTaskLink(database: DbClient, owner: TaskOwner, taskId: number): Promise<number> {
  if (owner.type === "project") {
    return mutationAffectedRows(await database.delete(projectTasks).where(and(eq(projectTasks.ownerId, owner.id), eq(projectTasks.taskId, taskId))));
  }
  if (owner.type === "feature") {
    return mutationAffectedRows(await database.delete(featureTasks).where(and(eq(featureTasks.ownerId, owner.id), eq(featureTasks.taskId, taskId))));
  }
  if (owner.type === "milestone") {
    return mutationAffectedRows(await database.delete(milestoneTasks).where(and(eq(milestoneTasks.ownerId, owner.id), eq(milestoneTasks.taskId, taskId))));
  }
  if (owner.type === "wikiPage") {
    return mutationAffectedRows(await database.delete(wikiPageTasks).where(and(eq(wikiPageTasks.ownerId, owner.id), eq(wikiPageTasks.taskId, taskId))));
  }
  return mutationAffectedRows(await database.delete(useCaseTasks).where(and(eq(useCaseTasks.ownerId, owner.id), eq(useCaseTasks.taskId, taskId))));
}

async function insertTask(database: DbClient, input: TaskInput, parentId: number | null = null, actor?: JournalActor | null): Promise<TaskRecord> {
  const title = requireNonEmpty(input.title, "title");
  const status = input.status ?? await resolveDefaultCatalogEntryKey(database, "workStatus", "active");
  const priority = input.priority ?? await resolveDefaultCatalogEntryKey(database, "priority", "medium");
  await ensureCatalogEntryExists(database, "workStatus", status);
  await ensureCatalogEntryExists(database, "priority", priority);

  return taskRepository.create(
    database,
    {
      parentId,
      title,
      description: cleanNullable(input.description) ?? null,
      status,
      priority,
      responsibleUserId: await normalizeAssignableUserId(database, input.responsibleUserId ?? actor?.actorUserId ?? null, "responsibleUserId"),
      dueDate: input.dueDate ?? null
    },
    actor?.actorUserId ?? undefined
  );
}

export async function listOwnerTasks(database: DbClient, owner: TaskOwner): Promise<TaskBoardItem[]> {
  await ensureOwnerExists(database, owner);
  const rows = await selectVisibleOwnerTaskRows(database, owner);
  const ids = rows.map((task) => task.id);
  const [tagsByTask, subtaskCounts, supportCountsMap] = await Promise.all([
    getTaskTagsMap(database, ids),
    getSubtaskCounts(database, ids),
    getTaskSupportCounts(database, ids)
  ]);

  return Promise.all(rows.map((task) => mapTaskBoardItem(database, task, tagsByTask.get(task.id) ?? [], subtaskCounts.get(task.id) ?? 0, supportCountsMap.get(task.id) ?? emptySupportCounts)));
}

export async function listTasks(database: DbClient): Promise<Task[]> {
  const rows = await taskRepository.findRootTasks(database);
  const ids = rows.map((task) => task.id);
  const [tagsByTask, subtaskCounts, supportCountsMap] = await Promise.all([
    getTaskTagsMap(database, ids),
    getSubtaskCounts(database, ids),
    getTaskSupportCounts(database, ids)
  ]);

  return Promise.all(rows.map((task) => mapTask(database, task, Promise.resolve(tagsByTask.get(task.id) ?? []), Promise.resolve(subtaskCounts.get(task.id) ?? 0), undefined, Promise.resolve(supportCountsMap.get(task.id) ?? emptySupportCounts))));
}

async function listNeutralTasks(database: DbClient): Promise<Task[]> {
  const rows = await database
    .select(taskSelect)
    .from(tasks)
    .leftJoin(projectTasks, eq(projectTasks.taskId, tasks.id))
    .leftJoin(milestoneTasks, eq(milestoneTasks.taskId, tasks.id))
    .leftJoin(featureTasks, eq(featureTasks.taskId, tasks.id))
    .leftJoin(useCaseTasks, eq(useCaseTasks.taskId, tasks.id))
    .leftJoin(wikiPageTasks, eq(wikiPageTasks.taskId, tasks.id))
    .where(and(
      isNull(tasks.parentId),
      isNull(projectTasks.taskId),
      isNull(milestoneTasks.taskId),
      isNull(featureTasks.taskId),
      isNull(useCaseTasks.taskId),
      isNull(wikiPageTasks.taskId)
    ));
  const ids = rows.map((task) => task.id);
  const [tagsByTask, subtaskCounts, supportCountsMap] = await Promise.all([
    getTaskTagsMap(database, ids),
    getSubtaskCounts(database, ids),
    getTaskSupportCounts(database, ids)
  ]);

  return Promise.all(rows.map((task) => mapTask(database, task, Promise.resolve(tagsByTask.get(task.id) ?? []), Promise.resolve(subtaskCounts.get(task.id) ?? 0), undefined, Promise.resolve(supportCountsMap.get(task.id) ?? emptySupportCounts))));
}

async function listMilestoneTaskLinkCandidates(
  database: DbClient,
  milestoneOwner: { type: "milestone"; id: number },
  linkedTaskIds: Set<number>,
  closedStatusKeys: Set<string>
): Promise<Task[]> {
  const ownerContext = await taskOwnerProjectContext(database, milestoneOwner);
  const projectId = [...ownerContext][0];
  if (ownerContext.size !== 1 || projectId === undefined) {
    return [];
  }

  const [projectTasks, neutralTasks] = await Promise.all([
    listOwnerTasks(database, { type: "project", id: projectId }),
    listNeutralTasks(database)
  ]);
  const seenTaskIds = new Set<number>();
  return [...projectTasks, ...neutralTasks].filter((task) => {
    if (seenTaskIds.has(task.id) || linkedTaskIds.has(task.id) || closedStatusKeys.has(task.status)) {
      return false;
    }
    seenTaskIds.add(task.id);
    return true;
  });
}

export async function listTaskLinkCandidates(database: DbClient, owner: TaskOwner | null, contextOwner?: TaskOwner | null): Promise<Task[]> {
  if (!owner && !contextOwner) {
    throw badRequest("Task link candidates require an owner or context owner");
  }
  if (owner) {
    await ensureOwnerExists(database, owner);
  }
  if (contextOwner) {
    await ensureOwnerExists(database, contextOwner);
  }
  const ownerTaskRows = owner ? await selectVisibleOwnerTaskRows(database, owner) : [];
  const linkedTaskIds = new Set(ownerTaskRows.map((task) => task.id));
  const closedStatusKeys = await listClosedCatalogEntryKeys(database, "workStatus");

  if (!owner && contextOwner?.type === "project") {
    const projectTasks = await listOwnerTasks(database, contextOwner);
    return projectTasks.filter((task) => !closedStatusKeys.has(task.status));
  }

  if (owner?.type === "milestone" && !contextOwner) {
    return listMilestoneTaskLinkCandidates(database, { type: "milestone", id: owner.id }, linkedTaskIds, closedStatusKeys);
  }

  const allTasks = await listTasks(database);

  const compatibilityOwner = contextOwner ?? owner;
  if (!compatibilityOwner) {
    return [];
  }

  if (compatibilityOwner.type === "wikiPage") {
    return allTasks.filter((task) => !linkedTaskIds.has(task.id) && !closedStatusKeys.has(task.status));
  }

  const ownerContext = await taskOwnerProjectContext(database, compatibilityOwner);

  const candidatePairs = await Promise.all(
    allTasks
      .filter((task) => !linkedTaskIds.has(task.id) && !closedStatusKeys.has(task.status))
      .map(async (task) => ({ task, context: await taskProjectContext(database, task.id) }))
  );
  return candidatePairs.filter(({ context }) => projectContextsAreCompatible(ownerContext, context)).map(({ task }) => task);
}

export async function listSubtasks(database: DbClient, taskId: number): Promise<Task[]> {
  await getTaskRecord(database, taskId);
  const rows = await taskRepository.findChildren(database, taskId);
  const ids = rows.map((task) => task.id);
  const [tagsByTask, subtaskCounts, supportCountsMap] = await Promise.all([
    getTaskTagsMap(database, ids),
    getSubtaskCounts(database, ids),
    getTaskSupportCounts(database, ids)
  ]);

  return Promise.all(rows.map((task) => mapTask(database, task, Promise.resolve(tagsByTask.get(task.id) ?? []), Promise.resolve(subtaskCounts.get(task.id) ?? 0), undefined, Promise.resolve(supportCountsMap.get(task.id) ?? emptySupportCounts))));
}

async function listDashboardTasks(database: DbClient, owner?: DashboardTaskOwner): Promise<Task[]> {
  if (!owner) {
    return listTasks(database);
  }
  if (owner.type === "dayPlan") {
    // Persönliche Planung ist datumsübergreifend: alle Tagesplan-Aufgaben desselben Users,
    // nicht nur die des übergebenen (heutigen) Plans. Der Owner-Plan ist über
    // ensureDashboardDayPlanAccess bereits dem aktuellen User zugeordnet (keine Fremddaten).
    const ownerPlan = await database
      .select({ userId: dayPlans.userId })
      .from(dayPlans)
      .where(eq(dayPlans.id, owner.id))
      .then(firstRow);
    if (!ownerPlan) {
      return [];
    }
    const rows = await database
      .select({ ...taskSelect, boardPosition: dayPlanTasks.position })
      .from(dayPlanTasks)
      .innerJoin(tasks, eq(dayPlanTasks.taskId, tasks.id))
      .innerJoin(dayPlans, eq(dayPlanTasks.ownerId, dayPlans.id))
      .where(and(eq(dayPlans.userId, ownerPlan.userId), isNull(tasks.parentId)))
      .orderBy(tasks.status, dayPlanTasks.position);
    // Eine Aufgabe kann an mehreren Tagesplänen hängen → dedupliziert genau einmal.
    const seen = new Set<number>();
    const uniqueRows = rows.filter((row) => {
      if (seen.has(row.id)) {
        return false;
      }
      seen.add(row.id);
      return true;
    });
    const ids = uniqueRows.map((task) => task.id);
    const [tagsByTask, subtaskCounts, supportCountsMap] = await Promise.all([
      getTaskTagsMap(database, ids),
      getSubtaskCounts(database, ids),
      getTaskSupportCounts(database, ids)
    ]);

    return Promise.all(uniqueRows.map((task) => mapTaskBoardItem(database, task, tagsByTask.get(task.id) ?? [], subtaskCounts.get(task.id) ?? 0, supportCountsMap.get(task.id) ?? emptySupportCounts)));
  }
  if (owner.type === "task") {
    return listSubtasks(database, owner.id);
  }
  if (owner.type === "project") {
    const seen = new Set<number>();
    return (await listOwnerTasks(database, { type: "project", id: owner.id })).filter((task) => {
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

export async function getTaskStats(database: DbClient, owner?: DashboardTaskOwner): Promise<TaskStats> {
  const statusCounts: Record<string, number> = {};
  for (const task of await listDashboardTasks(database, owner)) {
    statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
  }
  return {
    statusCounts,
    total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
  };
}

export async function listRecentTasks(
  database: DbClient,
  options: { owner?: DashboardTaskOwner; limit?: number; sort?: "createdAt" | "updatedAt"; includeClosed?: boolean } = {}
): Promise<Task[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const sort = options.sort ?? "updatedAt";
  // Board- und Listen-Widgets zeigen geschlossene Aufgaben in einer eigenen Geschlossen-Gruppe;
  // nur das Journal-Widget ("Aktuelle Aufgaben") blendet sie weiterhin per Default aus.
  const closedStatusKeys = options.includeClosed ? null : await listClosedCatalogEntryKeys(database, "workStatus");
  return [...(await listDashboardTasks(database, options.owner))]
    .filter((task) => closedStatusKeys === null || isOpenTaskStatus(task.status, closedStatusKeys))
    .sort((left, right) => dateKey(right[sort]) - dateKey(left[sort]) || right.id - left.id)
    .slice(0, limit);
}

export async function listOverdueTasks(database: DbClient, options: { owner?: DashboardOverdueTaskOwner; limit?: number } = {}): Promise<Task[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const today = new Date().toISOString().slice(0, 10);
  const closedStatusKeys = await listClosedCatalogEntryKeys(database, "workStatus");
  return [...(await listDashboardTasks(database, options.owner))]
    .filter((task) => task.dueDate !== null && task.dueDate < today && isOpenTaskStatus(task.status, closedStatusKeys))
    .sort((left, right) => String(left.dueDate).localeCompare(String(right.dueDate)) || left.id - right.id)
    .slice(0, limit);
}

export async function createOwnerTask(database: DbClient, owner: TaskOwner, input: TaskInput, actor?: JournalActor | null): Promise<TaskBoardItem> {
  await ensureOwnerExists(database, owner);
  const status = input.status ?? await resolveDefaultCatalogEntryKey(database, "workStatus", "active");
  const position = await nextOwnerPosition(database, owner, status);
  const created = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const task = await insertTask(txDb, input, null, actor);
    await insertOwnerTask(txDb, owner, task.id, position);
    const taskObject = taskJournalObject(task);
    const ownerObject = await getOwnerJournalObject(txDb, owner);
    await recordJournalEntry(txDb, {
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

export async function linkOwnerTask(
  database: DbClient,
  owner: TaskOwner,
  taskId: number,
  actor?: JournalActor | null,
  options: { conflictOnExisting?: boolean } = {}
): Promise<TaskBoardItem> {
  await ensureOwnerExists(database, owner);
  const task = await getTaskRecord(database, taskId);
  if (task.parentId !== null) {
    throw badRequest("Subtasks cannot be linked to owners");
  }
  if ((await listClosedCatalogEntryKeys(database, "workStatus")).has(task.status)) {
    throw badRequest("Closed tasks cannot be linked to owners");
  }

  const ownerTaskRows = await selectOwnerTaskRows(database, owner);
  const existing = getOwnerTaskRow(ownerTaskRows, taskId);
  if (existing) {
    if (options.conflictOnExisting === true) {
      throw conflict(`Task ${taskId} is already linked to ${owner.type} ${owner.id}`);
    }
    return mapTaskBoardItem(database, existing);
  }

  if (owner.type !== "wikiPage") {
    assertCompatibleProjectContexts(await taskOwnerProjectContext(database, owner), await taskProjectContext(database, taskId));
  }

  const position = await nextOwnerPosition(database, owner, task.status);
  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    await insertOwnerTask(txDb, owner, taskId, position);
    const taskObject = taskJournalObject(task);
    const ownerObject = await getOwnerJournalObject(txDb, owner);
    await recordJournalEntry(txDb, {
      operation: "link",
      object: taskObject,
      summary: buildLinkSummary(ownerObject, taskObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
  return mapTaskBoardItem(database, { ...task, boardPosition: position });
}

export async function unlinkOwnerTask(database: DbClient, owner: TaskOwner, taskId: number, actor?: JournalActor | null): Promise<void> {
  await ensureOwnerExists(database, owner);
  const task = await getTaskRecord(database, taskId);
  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const changes = await deleteOwnerTaskLink(txDb, owner, taskId);
    if (changes === 0) {
      throw notFound(`Task ${taskId} is not linked to ${owner.type} ${owner.id}`);
    }
    const taskObject = taskJournalObject(task);
    const ownerObject = await getOwnerJournalObject(txDb, owner);
    await recordJournalEntry(txDb, {
      operation: "unlink",
      object: taskObject,
      summary: buildUnlinkSummary(ownerObject, taskObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
}

export async function updateOwnerTaskBoard(database: DbClient, owner: TaskOwner, taskId: number, input: TaskBoardPositionInput, actor?: JournalActor | null): Promise<TaskBoardItem> {
  await ensureOwnerExists(database, owner);
  await ensureCatalogEntryExists(database, "workStatus", input.status);
  const ownerTaskRows = await selectOwnerTaskRows(database, owner);
  const linked = getOwnerTaskRow(ownerTaskRows, taskId);
  if (!linked) {
    throw notFound(`Task ${taskId} is not linked to ${owner.type} ${owner.id}`);
  }

  const updated = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const task = await taskRepository.update(txDb, taskId, input.expectedVersion, { status: input.status }, actor?.actorUserId ?? undefined);
    if (!task) {
      throw notFound(`Task with id ${taskId} not found`);
    }
    await updateOwnerTaskPosition(txDb, owner, taskId, input.position);
    const taskObject = taskJournalObject(task);
    const ownerObject = await getOwnerJournalObject(txDb, owner);
    const changes = buildJournalChanges(linked, { ...task, boardPosition: input.position }, [
      { key: "status", label: "Status" },
      { key: "boardPosition", label: "Board-Position" }
    ]);
    await recordJournalEntry(txDb, {
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

export async function createSubtask(database: DbClient, taskId: number, input: TaskInput, actor?: JournalActor | null): Promise<Task> {
  const parent = await getTaskRecord(database, taskId);
  if (parent.parentId !== null) {
    throw badRequest("Subtasks cannot have subtasks");
  }

  const created = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const task = await insertTask(txDb, input, parent.id, actor);
    const taskObject = taskJournalObject(task);
    const parentObject = taskJournalObject(parent);
    await recordJournalEntry(txDb, {
      operation: "create",
      object: taskObject,
      summary: buildCreateSummary(taskObject),
      actor,
      contexts: [makeJournalContext(parentObject, "parent")]
    });
    return task;
  });
  return mapTask(database, created, Promise.resolve([]), Promise.resolve(0));
}

export async function getTask(database: DbClient, id: number): Promise<Task> {
  return mapTask(database, await getTaskRecord(database, id));
}

export async function getTaskDetail(database: DbClient, id: number): Promise<TaskDetail> {
  const record = await getTaskRecord(database, id);
  const base = await mapTask(database, record);
  return {
    ...base,
    parentContexts: await taskParentContexts(database, record),
    subtasks: await listSubtasks(database, id),
    comments: await listComments(database, id),
    notes: await listTaskNotes(database, id),
    attachments: await listTaskAttachments(database, id)
  };
}

export async function updateTask(database: DbClient, id: number, input: TaskUpdate, actor?: JournalActor | null): Promise<Task> {
  const values: Partial<Pick<TaskRecord, "title" | "description" | "status" | "priority" | "responsibleUserId" | "dueDate">> = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.status !== undefined) {
    await ensureCatalogEntryExists(database, "workStatus", input.status);
    values.status = input.status;
  }
  if (input.priority !== undefined) {
    await ensureCatalogEntryExists(database, "priority", input.priority);
    values.priority = input.priority;
  }
  if (input.responsibleUserId !== undefined) {
    values.responsibleUserId = await normalizeAssignableUserId(database, input.responsibleUserId, "responsibleUserId");
  }
  if (input.dueDate !== undefined) {
    values.dueDate = input.dueDate;
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No task fields provided");
  }

  const updated = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const current = await getTaskRecord(txDb, id);
    const task = await taskRepository.update(txDb, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!task) {
      throw notFound(`Task with id ${id} not found`);
    }
    const taskObject = taskJournalObject(task);
    const changes = buildJournalChanges(current, task, taskJournalFields);
    await recordJournalEntry(txDb, {
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
  const taskIds = await collectTaskSubtreeIds(database, id);
  const task = await getTaskRecord(database, id);
  const blockers = await taskDeleteBlockers(database, taskIds);
  if (blockers.length > 0) {
    throw conflict(`Aufgabe kann nicht gelöscht werden, solange Beziehungen bestehen: ${blockers.join(", ")}.`);
  }

  await deleteTaskAttachmentsForIds(database, taskIds);
  await deleteTaskNotesForIds(database, taskIds);
  await deleteTaskCommentsForIds(database, taskIds);

  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const taskObject = taskJournalObject(task);
    await recordJournalEntry(txDb, {
      operation: "delete",
      object: taskObject,
      summary: buildDeleteSummary(taskObject),
      actor
    });
    if (await taskRepository.delete(txDb, id) === 0) {
      throw notFound(`Task with id ${id} not found`);
    }
  });
}
