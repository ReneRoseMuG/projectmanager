import type { Milestone, MilestoneInput, MilestoneUpdate, Tag, UserOption, VisibleParentContext } from "@taskmanager/shared-types";
import { eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { firstRow, recencyOrder } from "../db/query-utils.js";
import { milestoneAttachments, milestoneComments, milestoneFeatures, milestoneNotes, milestones, milestoneTasks, milestoneTickets, projects, tasks } from "../db/schema.js";
import { milestoneRepository, type MilestoneRecord } from "../repositories/milestone.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { cleanNullable, requireNonEmpty } from "./helpers.js";import { ensureCatalogEntryExists, listClosedCatalogEntryKeys, resolveDefaultCatalogEntryKey } from "./catalogs.service.js";
import {
  buildCreateSummary,
  buildDeleteSummary,
  buildJournalChanges,
  buildUpdateSummary,
  makeJournalContext,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor,
  type JournalFieldDefinition,
  type JournalObjectRef
} from "./journal.service.js";
import { deleteMilestoneCommentsForIds } from "./comments.service.js";
import { deleteMilestoneNotesForIds } from "./notes.service.js";
import { getMilestoneTags, getMilestoneTagsMap } from "./tags.service.js";
import { getUserOption, getUserOptionsMap, normalizeAssignableUserId } from "./users.service.js";

interface MilestoneCounts {
  taskCount: number;
  openTaskCount: number;
  doneTaskCount: number;
  totalTaskCount: number;
  ticketCount: number;
  featureCount: number;
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
}

interface MilestoneMapData {
  counts?: MilestoneCounts;
  tags?: Tag[];
  visibleParent?: VisibleParentContext;
  responsibleUser?: UserOption | null;
}

const milestoneJournalFields: Array<JournalFieldDefinition<MilestoneRecord>> = [
  { key: "name", label: "Name" },
  { key: "description", label: "Beschreibung" },
  { key: "status", label: "Status" },
  { key: "color", label: "Farbe" },
  { key: "startDate", label: "Startdatum" },
  { key: "dueDate", label: "Enddatum" },
  { key: "responsibleUserId", label: "Verantwortlich" }
];

function emptyMilestoneCounts(): MilestoneCounts {
  return {
    taskCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    featureCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0
  };
}

async function mapMilestone(database: DbClient, record: MilestoneRecord, data: MilestoneMapData = {}): Promise<Milestone> {
  const counts = data.counts ?? emptyMilestoneCounts();
  const resolvedTags = data.tags ?? await getMilestoneTags(database, record.id);
  const visibleParent = data.visibleParent ?? await getProjectParentContext(database, record.projectId);
  const responsibleUser = data.responsibleUser !== undefined ? data.responsibleUser : await getUserOption(database, record.responsibleUserId);
  return {
    id: record.id,
    projectId: record.projectId,
    name: record.name,
    description: record.description,
    status: record.status,
    color: record.color,
    startDate: record.startDate,
    dueDate: record.dueDate,
    responsibleUserId: record.responsibleUserId,
    responsibleUser,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    taskCount: counts.taskCount,
    openTaskCount: counts.openTaskCount,
    doneTaskCount: counts.doneTaskCount,
    totalTaskCount: counts.totalTaskCount,
    ticketCount: counts.ticketCount,
    featureCount: counts.featureCount,
    attachmentCount: counts.attachmentCount,
    noteCount: counts.noteCount,
    commentCount: counts.commentCount,
    tags: resolvedTags,
    visibleParent
  };
}

async function ensureProjectExists(database: DbClient, projectId: number): Promise<void> {
  const project = firstRow(await database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)));
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

async function getProjectJournalObject(database: DbClient, projectId: number): Promise<JournalObjectRef> {
  const project = firstRow(await database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)));
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
  return makeJournalObject("project", project.id, project.name);
}

async function getProjectParentContext(database: DbClient, projectId: number): Promise<VisibleParentContext> {
  const project = firstRow(await database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)));
  return {
    type: "project",
    id: projectId,
    label: project?.name ?? `Projekt ${projectId}`,
    origin: "direct"
  };
}

async function getProjectParentContextMap(database: DbClient, projectIds: number[]): Promise<Map<number, VisibleParentContext>> {
  const contexts = new Map<number, VisibleParentContext>();
  const uniqueIds = [...new Set(projectIds)];
  if (uniqueIds.length === 0) {
    return contexts;
  }

  const rows = await database.select({ id: projects.id, name: projects.name }).from(projects).where(inArray(projects.id, uniqueIds));
  for (const row of rows) {
    contexts.set(row.id, {
      type: "project",
      id: row.id,
      label: row.name,
      origin: "direct"
    });
  }

  for (const projectId of uniqueIds) {
    if (!contexts.has(projectId)) {
      contexts.set(projectId, {
        type: "project",
        id: projectId,
        label: `Projekt ${projectId}`,
        origin: "direct"
      });
    }
  }

  return contexts;
}

function milestoneJournalObject(record: MilestoneRecord): JournalObjectRef {
  return makeJournalObject("milestone", record.id, record.name);
}

async function getMilestoneCounts(database: DbClient, milestoneIds: number[]): Promise<Map<number, MilestoneCounts>> {
  const counts = new Map<number, MilestoneCounts>();
  if (milestoneIds.length === 0) {
    return counts;
  }

  for (const milestoneId of milestoneIds) {
    counts.set(milestoneId, emptyMilestoneCounts());
  }

  const [taskRows, closedStatusKeys, ticketRows, featureRows, attachmentRows, noteRows, commentRows] = await Promise.all([
    database
      .select({ ownerId: milestoneTasks.ownerId, status: tasks.status })
      .from(milestoneTasks)
      .innerJoin(tasks, eq(milestoneTasks.taskId, tasks.id))
      .where(inArray(milestoneTasks.ownerId, milestoneIds)),
    listClosedCatalogEntryKeys(database, "workStatus"),
    database.select({ ownerId: milestoneTickets.ownerId }).from(milestoneTickets).where(inArray(milestoneTickets.ownerId, milestoneIds)),
    database.select({ milestoneId: milestoneFeatures.milestoneId }).from(milestoneFeatures).where(inArray(milestoneFeatures.milestoneId, milestoneIds)),
    database.select({ milestoneId: milestoneAttachments.milestoneId }).from(milestoneAttachments).where(inArray(milestoneAttachments.milestoneId, milestoneIds)),
    database.select({ milestoneId: milestoneNotes.milestoneId }).from(milestoneNotes).where(inArray(milestoneNotes.milestoneId, milestoneIds)),
    database.select({ milestoneId: milestoneComments.milestoneId }).from(milestoneComments).where(inArray(milestoneComments.milestoneId, milestoneIds))
  ]);

  for (const row of taskRows) {
    const current = counts.get(row.ownerId) ?? emptyMilestoneCounts();
    current.taskCount += 1;
    current.totalTaskCount += 1;
    if (closedStatusKeys.has(row.status)) {
      current.doneTaskCount += 1;
    } else {
      current.openTaskCount += 1;
    }
    counts.set(row.ownerId, current);
  }
  for (const row of ticketRows) {
    const current = counts.get(row.ownerId) ?? emptyMilestoneCounts();
    current.ticketCount += 1;
    counts.set(row.ownerId, current);
  }
  for (const row of featureRows) {
    const current = counts.get(row.milestoneId) ?? emptyMilestoneCounts();
    current.featureCount += 1;
    counts.set(row.milestoneId, current);
  }
  for (const row of attachmentRows) {
    const current = counts.get(row.milestoneId) ?? emptyMilestoneCounts();
    current.attachmentCount += 1;
    counts.set(row.milestoneId, current);
  }
  for (const row of noteRows) {
    const current = counts.get(row.milestoneId) ?? emptyMilestoneCounts();
    current.noteCount += 1;
    counts.set(row.milestoneId, current);
  }
  for (const row of commentRows) {
    const current = counts.get(row.milestoneId) ?? emptyMilestoneCounts();
    current.commentCount += 1;
    counts.set(row.milestoneId, current);
  }

  return counts;
}

async function mapMilestoneList(database: DbClient, rows: MilestoneRecord[]): Promise<Milestone[]> {
  const ids = rows.map((row) => row.id);
  const [counts, tagsByMilestone, parentContexts, responsibleUsers] = await Promise.all([
    getMilestoneCounts(database, ids),
    getMilestoneTagsMap(database, ids),
    getProjectParentContextMap(database, rows.map((row) => row.projectId)),
    getUserOptionsMap(database, rows.map((row) => row.responsibleUserId))
  ]);
  return Promise.all(rows.map((row) => mapMilestone(database, row, {
    counts: counts.get(row.id),
    tags: tagsByMilestone.get(row.id) ?? [],
    visibleParent: parentContexts.get(row.projectId),
    responsibleUser: row.responsibleUserId ? responsibleUsers.get(row.responsibleUserId) ?? null : null
  })));
}

export async function listMilestones(database: DbClient): Promise<Milestone[]> {
  const rows = await database.select().from(milestones).orderBy(...recencyOrder(milestones));
  return mapMilestoneList(database, rows);
}

export async function listProjectMilestones(database: DbClient, projectId: number): Promise<Milestone[]> {
  await ensureProjectExists(database, projectId);
  const rows = await database.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(...recencyOrder(milestones));
  return mapMilestoneList(database, rows);
}

export async function getMilestone(database: DbClient, id: number): Promise<Milestone> {
  const milestone = await milestoneRepository.findById(database, id);
  if (!milestone) {
    throw notFound(`Milestone with id ${id} not found`);
  }

  const counts = await getMilestoneCounts(database, [id]);
  return mapMilestone(database, milestone, { counts: counts.get(id) });
}

export async function createMilestone(database: DbClient, input: MilestoneInput, actor?: JournalActor | null): Promise<Milestone> {
  const projectObject = await getProjectJournalObject(database, input.projectId);
  const name = requireNonEmpty(input.name, "name");
  const status = input.status ?? await resolveDefaultCatalogEntryKey(database, "workStatus", "active");
  await ensureCatalogEntryExists(database, "workStatus", status);
  const created = await database.transaction(async (tx) => {
    const milestone = await milestoneRepository.create(
      tx,
      {
        projectId: input.projectId,
        name,
        description: cleanNullable(input.description) ?? null,
        status,
        color: input.color ?? "#6366f1",
        startDate: cleanNullable(input.startDate) ?? null,
        dueDate: cleanNullable(input.dueDate) ?? null,
        responsibleUserId: await normalizeAssignableUserId(tx, input.responsibleUserId ?? actor?.actorUserId ?? null, "responsibleUserId")
      },
      actor?.actorUserId ?? undefined
    );
    const journalObject = milestoneJournalObject(milestone);
    await recordJournalEntry(tx, {
      operation: "create",
      object: journalObject,
      summary: buildCreateSummary(journalObject),
      actor,
      contexts: [makeJournalContext(projectObject, "owner")]
    });
    return milestone;
  });

  return mapMilestone(database, created, { counts: emptyMilestoneCounts(), tags: [] });
}

export async function updateMilestone(database: DbClient, id: number, input: MilestoneUpdate, actor?: JournalActor | null): Promise<Milestone> {
  const values: Partial<typeof milestones.$inferInsert> = {};

  if (input.projectId !== undefined) {
    await ensureProjectExists(database, input.projectId);
    values.projectId = input.projectId;
  }
  if (input.name !== undefined) {
    values.name = requireNonEmpty(input.name, "name");
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.status !== undefined) {
    await ensureCatalogEntryExists(database, "workStatus", input.status);
    values.status = input.status;
  }
  if (input.color !== undefined) {
    values.color = input.color;
  }
  if (input.startDate !== undefined) {
    values.startDate = cleanNullable(input.startDate) ?? null;
  }
  if (input.dueDate !== undefined) {
    values.dueDate = cleanNullable(input.dueDate) ?? null;
  }
  if (input.responsibleUserId !== undefined) {
    values.responsibleUserId = await normalizeAssignableUserId(database, input.responsibleUserId, "responsibleUserId");
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No milestone fields provided");
  }

  const updated = await database.transaction(async (tx) => {
    const current = await milestoneRepository.findById(tx, id);
    if (!current) {
      throw notFound(`Milestone with id ${id} not found`);
    }
    const milestone = await milestoneRepository.update(tx, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!milestone) {
      throw notFound(`Milestone with id ${id} not found`);
    }
    const projectField: JournalFieldDefinition<MilestoneRecord> = {
      key: "projectId",
      label: "Projekt",
      format: (value) => (typeof value === "number" ? `Projekt ${value}` : null)
    };
    const journalObject = milestoneJournalObject(milestone);
    const changes = buildJournalChanges(current, milestone, [projectField, ...milestoneJournalFields]);
    await recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes,
      contexts: [makeJournalContext(await getProjectJournalObject(database, milestone.projectId), "owner")]
    });
    return milestone;
  });
  if (!updated) {
    throw notFound(`Milestone with id ${id} not found`);
  }

  const [counts, tags] = await Promise.all([
    getMilestoneCounts(database, [id]),
    getMilestoneTags(database, id)
  ]);
  return mapMilestone(database, updated, { counts: counts.get(id), tags });
}

export async function deleteMilestone(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const milestone = await milestoneRepository.findById(database, id);
  if (!milestone) {
    throw notFound(`Milestone with id ${id} not found`);
  }
  const projectObject = await getProjectJournalObject(database, milestone.projectId);

  await deleteMilestoneNotesForIds(database, [id]);
  await deleteMilestoneCommentsForIds(database, [id]);

  await database.transaction(async (tx) => {
    const journalObject = milestoneJournalObject(milestone);
    await recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: [makeJournalContext(projectObject, "owner")]
    });
    if ((await milestoneRepository.delete(tx, id)) === 0) {
      throw notFound(`Milestone with id ${id} not found`);
    }
  });
}

export async function deleteMilestoneOwnedSupportForProjectIds(database: DbClient, projectIds: number[]): Promise<void> {
  const rows = await milestoneRepository.findByProjectIds(database, [...new Set(projectIds)]);
  const milestoneIds = rows.map((row) => row.id);
  await deleteMilestoneNotesForIds(database, milestoneIds);
  await deleteMilestoneCommentsForIds(database, milestoneIds);
}
