import type { Project, ProjectInput, ProjectUpdate } from "@taskmanager/shared-types";
import { desc, eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { milestones, projectAttachments, projectComments, projectNotes, projects, projectTasks, projectTickets, tasks, wikiPages } from "../db/schema.js";
import { projectRepository, type ProjectRecord } from "../repositories/project.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { deleteProjectAttachmentsForIds } from "./attachments.service.js";
import { ensureCatalogEntryExists, listClosedCatalogEntryKeys, resolveDefaultCatalogEntryKey } from "./catalogs.service.js";
import { cleanNullable, requireNonEmpty } from "./helpers.js";
import {
  buildCreateSummary,
  buildDeleteSummary,
  buildJournalChanges,
  buildUpdateSummary,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor,
  type JournalFieldDefinition
} from "./journal.service.js";
import { deleteMilestoneOwnedSupportForProjectIds } from "./milestones.service.js";
import { deleteProjectNotesForIds } from "./notes.service.js";
import { getProjectTags, getProjectTagsMap } from "./tags.service.js";
import { getUserOption, normalizeAssignableUserId } from "./users.service.js";

interface ProjectCounts {
  milestoneCount: number;
  openTaskCount: number;
  doneTaskCount: number;
  totalTaskCount: number;
  ticketCount: number;
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
}

function wikiPageLabel(database: DbClient, wikiPageId: unknown): string | null {
  if (typeof wikiPageId !== "number") {
    return null;
  }
  const page = database.select({ title: wikiPages.title }).from(wikiPages).where(eq(wikiPages.id, wikiPageId)).get();
  return page?.title ?? `Wiki-Seite ${wikiPageId}`;
}

function ensureWikiPageExists(database: DbClient, wikiPageId: number | null | undefined): void {
  if (wikiPageId === undefined || wikiPageId === null) {
    return;
  }
  const page = database.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.id, wikiPageId)).get();
  if (!page) {
    throw notFound(`Wiki page with id ${wikiPageId} not found`);
  }
}

function projectJournalFields(database: DbClient): Array<JournalFieldDefinition<ProjectRecord>> {
  return [
    { key: "name", label: "Name" },
    { key: "description", label: "Beschreibung" },
    { key: "status", label: "Status" },
    { key: "color", label: "Farbe" },
    { key: "startDate", label: "Startdatum" },
    { key: "dueDate", label: "Enddatum" },
    { key: "responsibleUserId", label: "Verantwortlich" },
    { key: "wikiPageId", label: "Wiki-Startseite", format: (value) => wikiPageLabel(database, value) }
  ];
}

function emptyProjectCounts(): ProjectCounts {
  return {
    milestoneCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0
  };
}

function mapProject(database: DbClient, record: ProjectRecord, counts: ProjectCounts = emptyProjectCounts(), tags = getProjectTags(database, record.id)): Project {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    status: record.status,
    color: record.color,
    startDate: record.startDate,
    dueDate: record.dueDate,
    responsibleUserId: record.responsibleUserId,
    responsibleUser: getUserOption(database, record.responsibleUserId),
    wikiPageId: record.wikiPageId,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    milestoneCount: counts.milestoneCount,
    openTaskCount: counts.openTaskCount,
    doneTaskCount: counts.doneTaskCount,
    totalTaskCount: counts.totalTaskCount,
    ticketCount: counts.ticketCount,
    attachmentCount: counts.attachmentCount,
    noteCount: counts.noteCount,
    commentCount: counts.commentCount,
    tags
  };
}

function getProjectCounts(database: DbClient, projectIds: number[]): Map<number, ProjectCounts> {
  const counts = new Map<number, ProjectCounts>();
  if (projectIds.length === 0) {
    return counts;
  }

  for (const projectId of projectIds) {
    counts.set(projectId, emptyProjectCounts());
  }

  const milestoneRows = database.select({ projectId: milestones.projectId }).from(milestones).where(inArray(milestones.projectId, projectIds)).all();
  for (const row of milestoneRows) {
    const current = counts.get(row.projectId) ?? emptyProjectCounts();
    current.milestoneCount += 1;
    counts.set(row.projectId, current);
  }

  const rows = database
    .select({ projectId: projectTasks.ownerId, status: tasks.status })
    .from(projectTasks)
    .innerJoin(tasks, eq(projectTasks.taskId, tasks.id))
    .where(inArray(projectTasks.ownerId, projectIds))
    .all();
  const closedStatusKeys = listClosedCatalogEntryKeys(database, "workStatus");

  for (const row of rows) {
    const current = counts.get(row.projectId) ?? emptyProjectCounts();
    current.totalTaskCount += 1;
    if (closedStatusKeys.has(row.status)) {
      current.doneTaskCount += 1;
    } else {
      current.openTaskCount += 1;
    }
    counts.set(row.projectId, current);
  }

  const ticketRows = database.select({ projectId: projectTickets.ownerId }).from(projectTickets).where(inArray(projectTickets.ownerId, projectIds)).all();
  for (const row of ticketRows) {
    const current = counts.get(row.projectId) ?? emptyProjectCounts();
    current.ticketCount += 1;
    counts.set(row.projectId, current);
  }

  const attachmentRows = database.select({ projectId: projectAttachments.projectId }).from(projectAttachments).where(inArray(projectAttachments.projectId, projectIds)).all();
  for (const row of attachmentRows) {
    const current = counts.get(row.projectId) ?? emptyProjectCounts();
    current.attachmentCount += 1;
    counts.set(row.projectId, current);
  }

  const noteRows = database.select({ projectId: projectNotes.projectId }).from(projectNotes).where(inArray(projectNotes.projectId, projectIds)).all();
  for (const row of noteRows) {
    const current = counts.get(row.projectId) ?? emptyProjectCounts();
    current.noteCount += 1;
    counts.set(row.projectId, current);
  }

  const commentRows = database.select({ projectId: projectComments.projectId }).from(projectComments).where(inArray(projectComments.projectId, projectIds)).all();
  for (const row of commentRows) {
    const current = counts.get(row.projectId) ?? emptyProjectCounts();
    current.commentCount += 1;
    counts.set(row.projectId, current);
  }

  return counts;
}

export function listProjects(database: DbClient): Project[] {
  const rows = database.select().from(projects).orderBy(desc(projects.createdAt)).all();
  const ids = rows.map((project) => project.id);
  const counts = getProjectCounts(database, ids);
  const tagsByProject = getProjectTagsMap(database, ids);

  return rows.map((project) => mapProject(database, project, counts.get(project.id), tagsByProject.get(project.id) ?? []));
}

export function getProject(database: DbClient, id: number): Project {
  const project = database.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) {
    throw notFound(`Project with id ${id} not found`);
  }

  const counts = getProjectCounts(database, [id]);
  return mapProject(database, project, counts.get(id));
}

export function createProject(database: DbClient, input: ProjectInput, actor?: JournalActor | null): Project {
  const name = requireNonEmpty(input.name, "name");
  const status = input.status ?? resolveDefaultCatalogEntryKey(database, "workStatus", "active");
  ensureCatalogEntryExists(database, "workStatus", status);
  const created = database.transaction((tx) => {
    const project = projectRepository.create(
      tx,
      {
        name,
        description: cleanNullable(input.description) ?? null,
        status,
        color: input.color ?? "#6366f1",
        startDate: cleanNullable(input.startDate) ?? null,
        dueDate: cleanNullable(input.dueDate) ?? null,
        responsibleUserId: normalizeAssignableUserId(tx, input.responsibleUserId ?? actor?.actorUserId ?? null, "responsibleUserId")
      },
      actor?.actorUserId ?? undefined
    );
    const journalObject = makeJournalObject("project", project.id, project.name);
    recordJournalEntry(tx, {
      operation: "create",
      object: journalObject,
      summary: buildCreateSummary(journalObject),
      actor
    });
    return project;
  });

  return mapProject(database, created, emptyProjectCounts(), []);
}

export function updateProject(database: DbClient, id: number, input: ProjectUpdate, actor?: JournalActor | null): Project {
  const values: Partial<typeof projects.$inferInsert> = {};

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
  if (input.responsibleUserId !== undefined) {
    values.responsibleUserId = normalizeAssignableUserId(database, input.responsibleUserId, "responsibleUserId");
  }
  if (input.wikiPageId !== undefined) {
    ensureWikiPageExists(database, input.wikiPageId);
    values.wikiPageId = input.wikiPageId;
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No project fields provided");
  }

  const updated = database.transaction((tx) => {
    const current = projectRepository.findById(tx, id);
    if (!current) {
      throw notFound(`Project with id ${id} not found`);
    }
    const project = projectRepository.update(tx, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!project) {
      throw notFound(`Project with id ${id} not found`);
    }
    const journalObject = makeJournalObject("project", project.id, project.name);
    const changes = buildJournalChanges(current, project, projectJournalFields(tx));
    recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes
    });
    return project;
  });
  if (!updated) {
    throw notFound(`Project with id ${id} not found`);
  }

  const counts = getProjectCounts(database, [id]);
  return mapProject(database, updated, counts.get(id));
}

export async function deleteProject(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const project = database.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) {
    throw notFound(`Project with id ${id} not found`);
  }

  await deleteProjectAttachmentsForIds(database, [id]);
  await deleteMilestoneOwnedSupportForProjectIds(database, [id]);

  deleteProjectNotesForIds(database, [id]);

  database.transaction((tx) => {
    const journalObject = makeJournalObject("project", project.id, project.name);
    recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor
    });
    const result = tx.delete(projects).where(eq(projects.id, id)).run();
    if (result.changes === 0) {
      throw notFound(`Project with id ${id} not found`);
    }
  });
}
