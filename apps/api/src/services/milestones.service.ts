import type { Milestone, MilestoneInput, MilestoneUpdate } from "@taskmanager/shared-types";
import { desc, eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { milestoneFeatures, milestones, milestoneTasks, milestoneTickets, projects, tasks } from "../db/schema.js";
import { milestoneRepository, type MilestoneRecord } from "../repositories/milestone.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { cleanNullable, requireNonEmpty } from "./helpers.js";
import { deleteMilestoneAttachmentsForIds } from "./attachments.service.js";
import { ensureCatalogEntryExists, resolveDefaultCatalogEntryKey } from "./catalogs.service.js";
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
import { deleteMilestoneNotesForIds } from "./notes.service.js";
import { getMilestoneTags, getMilestoneTagsMap } from "./tags.service.js";

interface MilestoneCounts {
  taskCount: number;
  openTaskCount: number;
  doneTaskCount: number;
  totalTaskCount: number;
  ticketCount: number;
  featureCount: number;
}

const milestoneJournalFields: Array<JournalFieldDefinition<MilestoneRecord>> = [
  { key: "name", label: "Name" },
  { key: "description", label: "Beschreibung" },
  { key: "status", label: "Status" },
  { key: "color", label: "Farbe" },
  { key: "startDate", label: "Startdatum" },
  { key: "dueDate", label: "Enddatum" }
];

function emptyMilestoneCounts(): MilestoneCounts {
  return {
    taskCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    featureCount: 0
  };
}

function mapMilestone(database: DbClient, record: MilestoneRecord, counts: MilestoneCounts = emptyMilestoneCounts(), tags = getMilestoneTags(database, record.id)): Milestone {
  return {
    id: record.id,
    projectId: record.projectId,
    name: record.name,
    description: record.description,
    status: record.status,
    color: record.color,
    startDate: record.startDate,
    dueDate: record.dueDate,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    taskCount: counts.taskCount,
    openTaskCount: counts.openTaskCount,
    doneTaskCount: counts.doneTaskCount,
    totalTaskCount: counts.totalTaskCount,
    ticketCount: counts.ticketCount,
    featureCount: counts.featureCount,
    tags
  };
}

function ensureProjectExists(database: DbClient, projectId: number): void {
  const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

function getProjectJournalObject(database: DbClient, projectId: number): JournalObjectRef {
  const project = database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
  return makeJournalObject("project", project.id, project.name);
}

function milestoneJournalObject(record: MilestoneRecord): JournalObjectRef {
  return makeJournalObject("milestone", record.id, record.name);
}

function getMilestoneCounts(database: DbClient, milestoneIds: number[]): Map<number, MilestoneCounts> {
  const counts = new Map<number, MilestoneCounts>();
  if (milestoneIds.length === 0) {
    return counts;
  }

  for (const milestoneId of milestoneIds) {
    counts.set(milestoneId, emptyMilestoneCounts());
  }

  const taskRows = database
    .select({ ownerId: milestoneTasks.ownerId, status: tasks.status })
    .from(milestoneTasks)
    .innerJoin(tasks, eq(milestoneTasks.taskId, tasks.id))
    .where(inArray(milestoneTasks.ownerId, milestoneIds))
    .all();
  for (const row of taskRows) {
    const current = counts.get(row.ownerId) ?? emptyMilestoneCounts();
    current.taskCount += 1;
    current.totalTaskCount += 1;
    if (row.status === "done") {
      current.doneTaskCount += 1;
    } else {
      current.openTaskCount += 1;
    }
    counts.set(row.ownerId, current);
  }

  const ticketRows = database.select({ ownerId: milestoneTickets.ownerId }).from(milestoneTickets).where(inArray(milestoneTickets.ownerId, milestoneIds)).all();
  for (const row of ticketRows) {
    const current = counts.get(row.ownerId) ?? emptyMilestoneCounts();
    current.ticketCount += 1;
    counts.set(row.ownerId, current);
  }

  const featureRows = database.select({ milestoneId: milestoneFeatures.milestoneId }).from(milestoneFeatures).where(inArray(milestoneFeatures.milestoneId, milestoneIds)).all();
  for (const row of featureRows) {
    const current = counts.get(row.milestoneId) ?? emptyMilestoneCounts();
    current.featureCount += 1;
    counts.set(row.milestoneId, current);
  }

  return counts;
}

function mapMilestoneList(database: DbClient, rows: MilestoneRecord[]): Milestone[] {
  const ids = rows.map((row) => row.id);
  const counts = getMilestoneCounts(database, ids);
  const tagsByMilestone = getMilestoneTagsMap(database, ids);
  return rows.map((row) => mapMilestone(database, row, counts.get(row.id), tagsByMilestone.get(row.id) ?? []));
}

export function listMilestones(database: DbClient): Milestone[] {
  const rows = database.select().from(milestones).orderBy(desc(milestones.createdAt)).all();
  return mapMilestoneList(database, rows);
}

export function listProjectMilestones(database: DbClient, projectId: number): Milestone[] {
  ensureProjectExists(database, projectId);
  const rows = database.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(desc(milestones.createdAt)).all();
  return mapMilestoneList(database, rows);
}

export function getMilestone(database: DbClient, id: number): Milestone {
  const milestone = milestoneRepository.findById(database, id);
  if (!milestone) {
    throw notFound(`Milestone with id ${id} not found`);
  }

  const counts = getMilestoneCounts(database, [id]);
  return mapMilestone(database, milestone, counts.get(id));
}

export function createMilestone(database: DbClient, input: MilestoneInput, actor?: JournalActor | null): Milestone {
  const projectObject = getProjectJournalObject(database, input.projectId);
  const name = requireNonEmpty(input.name, "name");
  const status = input.status ?? resolveDefaultCatalogEntryKey(database, "workStatus", "active");
  ensureCatalogEntryExists(database, "workStatus", status);
  const created = database.transaction((tx) => {
    const milestone = milestoneRepository.create(
      tx,
      {
        projectId: input.projectId,
        name,
        description: cleanNullable(input.description) ?? null,
        status,
        color: input.color ?? "#6366f1",
        startDate: cleanNullable(input.startDate) ?? null,
        dueDate: cleanNullable(input.dueDate) ?? null
      },
      actor?.actorUserId ?? undefined
    );
    const journalObject = milestoneJournalObject(milestone);
    recordJournalEntry(tx, {
      operation: "create",
      object: journalObject,
      summary: buildCreateSummary(journalObject),
      actor,
      contexts: [makeJournalContext(projectObject, "owner")]
    });
    return milestone;
  });

  return mapMilestone(database, created, emptyMilestoneCounts(), []);
}

export function updateMilestone(database: DbClient, id: number, input: MilestoneUpdate, actor?: JournalActor | null): Milestone {
  const values: Partial<typeof milestones.$inferInsert> = {};

  if (input.projectId !== undefined) {
    ensureProjectExists(database, input.projectId);
    values.projectId = input.projectId;
  }
  if (input.name !== undefined) {
    values.name = requireNonEmpty(input.name, "name");
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.status !== undefined) {
    ensureCatalogEntryExists(database, "workStatus", input.status);
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

  if (Object.keys(values).length === 0) {
    throw badRequest("No milestone fields provided");
  }

  const updated = database.transaction((tx) => {
    const current = milestoneRepository.findById(tx, id);
    if (!current) {
      throw notFound(`Milestone with id ${id} not found`);
    }
    const milestone = milestoneRepository.update(tx, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!milestone) {
      throw notFound(`Milestone with id ${id} not found`);
    }
    const projectField: JournalFieldDefinition<MilestoneRecord> = {
      key: "projectId",
      label: "Projekt",
      format: (value) => (typeof value === "number" ? getProjectJournalObject(database, value).label : null)
    };
    const journalObject = milestoneJournalObject(milestone);
    const changes = buildJournalChanges(current, milestone, [projectField, ...milestoneJournalFields]);
    recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes,
      contexts: [makeJournalContext(getProjectJournalObject(database, milestone.projectId), "owner")]
    });
    return milestone;
  });
  if (!updated) {
    throw notFound(`Milestone with id ${id} not found`);
  }

  const counts = getMilestoneCounts(database, [id]);
  return mapMilestone(database, updated, counts.get(id));
}

export async function deleteMilestone(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const milestone = milestoneRepository.findById(database, id);
  if (!milestone) {
    throw notFound(`Milestone with id ${id} not found`);
  }
  const projectObject = getProjectJournalObject(database, milestone.projectId);

  await deleteMilestoneAttachmentsForIds(database, [id]);
  deleteMilestoneNotesForIds(database, [id]);

  database.transaction((tx) => {
    const journalObject = milestoneJournalObject(milestone);
    recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: [makeJournalContext(projectObject, "owner")]
    });
    if (milestoneRepository.delete(tx, id) === 0) {
      throw notFound(`Milestone with id ${id} not found`);
    }
  });
}

export async function deleteMilestoneOwnedSupportForProjectIds(database: DbClient, projectIds: number[]): Promise<void> {
  const rows = milestoneRepository.findByProjectIds(database, [...new Set(projectIds)]);
  const milestoneIds = rows.map((row) => row.id);
  await deleteMilestoneAttachmentsForIds(database, milestoneIds);
  deleteMilestoneNotesForIds(database, milestoneIds);
}
