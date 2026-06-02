import type { JsonValue, Tag } from "@taskmanager/shared-types";
import { inArray, eq, sql } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import { milestoneTags, milestones, projectTags, projects, tags, taskTags, tasks, ticketTags, tickets } from "../db/schema.js";
import type { JournalChangeCreateData } from "../repositories/journal.repository.js";
import { tagRepository, type TagRecord, type TagUpdateData } from "../repositories/tag.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { requireNonEmpty } from "./helpers.js";
import {
  buildCreateSummary,
  buildDeleteSummary,
  buildJournalChanges,
  buildUpdateSummary,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor,
  type JournalFieldDefinition,
  type JournalObjectRef
} from "./journal.service.js";

type MappableTagRecord = Pick<TagRecord, "id" | "name" | "color" | "version">;

const tagJournalFields: Array<JournalFieldDefinition<TagRecord>> = [
  { key: "name", label: "Name" },
  { key: "color", label: "Farbe" }
];

function mapTag(record: MappableTagRecord): Tag {
  return {
    id: record.id,
    name: record.name,
    color: record.color,
    version: record.version
  };
}

async function getProjectJournalObject(database: DbClient, projectId: number): Promise<JournalObjectRef> {
  const project = firstRow(await database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)));
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
  return makeJournalObject("project", project.id, project.name);
}

async function getTaskJournalObject(database: DbClient, taskId: number): Promise<JournalObjectRef> {
  const task = firstRow(await database.select({ id: tasks.id, title: tasks.title }).from(tasks).where(eq(tasks.id, taskId)));
  if (!task) {
    throw notFound(`Task with id ${taskId} not found`);
  }
  return makeJournalObject("task", task.id, task.title);
}

async function getMilestoneJournalObject(database: DbClient, milestoneId: number): Promise<JournalObjectRef> {
  const milestone = firstRow(await database.select({ id: milestones.id, name: milestones.name }).from(milestones).where(eq(milestones.id, milestoneId)));
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
  return makeJournalObject("milestone", milestone.id, milestone.name);
}

async function getTicketJournalObject(database: DbClient, ticketId: number): Promise<JournalObjectRef> {
  const ticket = firstRow(await database.select({ id: tickets.id, title: tickets.title }).from(tickets).where(eq(tickets.id, ticketId)));
  if (!ticket) {
    throw notFound(`Ticket with id ${ticketId} not found`);
  }
  return makeJournalObject("ticket", ticket.id, ticket.title);
}

async function ensureTagsExist(database: DbClient, tagIds: number[]): Promise<void> {
  if (tagIds.length === 0) {
    return;
  }

  const uniqueIds = [...new Set(tagIds)];
  const found = await tagRepository.findByIds(database, uniqueIds);
  if (found.length !== uniqueIds.length) {
    throw badRequest("One or more tagIds are invalid");
  }
}

function tagJournalObject(record: MappableTagRecord): JournalObjectRef {
  return makeJournalObject("tag", record.id, record.name);
}

function normalizeTagIds(tagIds: number[]): number[] {
  return [...new Set(tagIds)];
}

function tagListLabel(records: MappableTagRecord[]): string | null {
  if (records.length === 0) {
    return null;
  }
  return records
    .map((record) => record.name)
    .sort((left, right) => left.localeCompare(right, "de"))
    .join(", ");
}

function tagListValue(records: MappableTagRecord[]): JsonValue {
  return records
    .map((record) => record.id)
    .sort((left, right) => left - right);
}

function buildTagAssignmentChange(before: MappableTagRecord[], after: MappableTagRecord[]): JournalChangeCreateData[] {
  const oldValueLabel = tagListLabel(before);
  const newValueLabel = tagListLabel(after);
  if (JSON.stringify(tagListValue(before)) === JSON.stringify(tagListValue(after))) {
    return [];
  }
  return [
    {
      fieldKey: "tags",
      fieldLabel: "Tags",
      oldValue: tagListValue(before),
      oldValueLabel,
      newValue: tagListValue(after),
      newValueLabel,
      summary: `Tags: ${oldValueLabel ?? "leer"} → ${newValueLabel ?? "leer"}`
    }
  ];
}

function buildTagAssignmentSummary(owner: JournalObjectRef, changes: JournalChangeCreateData[]): string {
  if (changes.length === 0) {
    return `${owner.label} hat unveränderte Tags.`;
  }
  const change = changes[0] as JournalChangeCreateData;
  return `${owner.label} hat neue Tags: ${change.oldValueLabel ?? "leer"} → ${change.newValueLabel ?? "leer"}.`;
}

export async function listTags(database: DbClient): Promise<Tag[]> {
  const rows = await database
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version,
      projectCount: sql<number>`(SELECT COUNT(*) FROM ${projectTags} WHERE ${projectTags.tagId} = ${tags.id})`,
      milestoneCount: sql<number>`(SELECT COUNT(*) FROM ${milestoneTags} WHERE ${milestoneTags.tagId} = ${tags.id})`,
      taskCount: sql<number>`(SELECT COUNT(*) FROM ${taskTags} WHERE ${taskTags.tagId} = ${tags.id})`,
      ticketCount: sql<number>`(SELECT COUNT(*) FROM ${ticketTags} WHERE ${ticketTags.tagId} = ${tags.id})`
    })
    .from(tags);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    version: row.version,
    usageCounts: {
      projects: Number(row.projectCount),
      milestones: Number(row.milestoneCount),
      tasks: Number(row.taskCount),
      tickets: Number(row.ticketCount)
    }
  }));
}

export async function getProjectTags(database: DbClient, projectId: number): Promise<Tag[]> {
  const rows = await database
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(projectTags)
    .innerJoin(tags, eq(projectTags.tagId, tags.id))
    .where(eq(projectTags.projectId, projectId));

  return rows.map(mapTag);
}

export async function getTaskTags(database: DbClient, taskId: number): Promise<Tag[]> {
  const rows = await database
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(eq(taskTags.taskId, taskId));

  return rows.map(mapTag);
}

export async function getMilestoneTags(database: DbClient, milestoneId: number): Promise<Tag[]> {
  const rows = await database
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(milestoneTags)
    .innerJoin(tags, eq(milestoneTags.tagId, tags.id))
    .where(eq(milestoneTags.milestoneId, milestoneId));

  return rows.map(mapTag);
}

export async function getTicketTags(database: DbClient, ticketId: number): Promise<Tag[]> {
  const rows = await database
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(ticketTags)
    .innerJoin(tags, eq(ticketTags.tagId, tags.id))
    .where(eq(ticketTags.ticketId, ticketId));

  return rows.map(mapTag);
}

export async function getProjectTagsMap(database: DbClient, projectIds: number[]): Promise<Map<number, Tag[]>> {
  const map = new Map<number, Tag[]>();
  if (projectIds.length === 0) {
    return map;
  }

  const rows = await database
    .select({
      projectId: projectTags.projectId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(projectTags)
    .innerJoin(tags, eq(projectTags.tagId, tags.id))
    .where(inArray(projectTags.projectId, projectIds));

  for (const row of rows) {
    const current = map.get(row.projectId) ?? [];
    current.push({ id: row.id, name: row.name, color: row.color, version: row.version });
    map.set(row.projectId, current);
  }

  return map;
}

export async function getTaskTagsMap(database: DbClient, taskIds: number[]): Promise<Map<number, Tag[]>> {
  const map = new Map<number, Tag[]>();
  if (taskIds.length === 0) {
    return map;
  }

  const rows = await database
    .select({
      taskId: taskTags.taskId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(inArray(taskTags.taskId, taskIds));

  for (const row of rows) {
    const current = map.get(row.taskId) ?? [];
    current.push({ id: row.id, name: row.name, color: row.color, version: row.version });
    map.set(row.taskId, current);
  }

  return map;
}

export async function getMilestoneTagsMap(database: DbClient, milestoneIds: number[]): Promise<Map<number, Tag[]>> {
  const map = new Map<number, Tag[]>();
  if (milestoneIds.length === 0) {
    return map;
  }

  const rows = await database
    .select({
      milestoneId: milestoneTags.milestoneId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(milestoneTags)
    .innerJoin(tags, eq(milestoneTags.tagId, tags.id))
    .where(inArray(milestoneTags.milestoneId, milestoneIds));

  for (const row of rows) {
    const current = map.get(row.milestoneId) ?? [];
    current.push({ id: row.id, name: row.name, color: row.color, version: row.version });
    map.set(row.milestoneId, current);
  }

  return map;
}

export async function getTicketTagsMap(database: DbClient, ticketIds: number[]): Promise<Map<number, Tag[]>> {
  const map = new Map<number, Tag[]>();
  if (ticketIds.length === 0) {
    return map;
  }

  const rows = await database
    .select({
      ticketId: ticketTags.ticketId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(ticketTags)
    .innerJoin(tags, eq(ticketTags.tagId, tags.id))
    .where(inArray(ticketTags.ticketId, ticketIds));

  for (const row of rows) {
    const current = map.get(row.ticketId) ?? [];
    current.push({ id: row.id, name: row.name, color: row.color, version: row.version });
    map.set(row.ticketId, current);
  }

  return map;
}

export async function createTag(database: DbClient, input: { name?: string; color?: string }, actor?: JournalActor | null): Promise<Tag> {
  const name = requireNonEmpty(input.name, "name");
  const existing = await tagRepository.findByName(database, name);
  if (existing) {
    throw conflict(`Tag "${name}" already exists`);
  }

  const created = await database.transaction(async (tx) => {
    const tag = await tagRepository.create(tx, { name, color: input.color ?? "#94a3b8" }, actor?.actorUserId ?? undefined);
    const journalObject = tagJournalObject(tag);
    await recordJournalEntry(tx, {
      operation: "create",
      object: journalObject,
      summary: buildCreateSummary(journalObject),
      actor
    });
    return tag;
  });

  return mapTag(created);
}

export async function updateTag(database: DbClient, id: number, input: { name?: string; color?: string; expectedVersion: number }, actor?: JournalActor | null): Promise<Tag> {
  const values: TagUpdateData = {};
  if (input.name !== undefined) {
    values.name = requireNonEmpty(input.name, "name");
  }
  if (input.color !== undefined) {
    values.color = input.color;
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No tag fields provided");
  }

  const updated = await database.transaction(async (tx) => {
    const current = await tagRepository.findById(tx, id);
    if (!current) {
      throw notFound(`Tag with id ${id} not found`);
    }
    const tag = await tagRepository.update(tx, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!tag) {
      throw notFound(`Tag with id ${id} not found`);
    }
    const journalObject = tagJournalObject(tag);
    const changes = buildJournalChanges(current, tag, tagJournalFields);
    await recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes
    });
    return tag;
  });
  if (!updated) {
    throw notFound(`Tag with id ${id} not found`);
  }

  return mapTag(updated);
}

export async function deleteTag(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  await database.transaction(async (tx) => {
    const current = await tagRepository.findById(tx, id);
    if (!current) {
      throw notFound(`Tag with id ${id} not found`);
    }
    const journalObject = tagJournalObject(current);
    await recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor
    });
    if ((await tagRepository.delete(tx, id)) === 0) {
      throw notFound(`Tag with id ${id} not found`);
    }
  });
}

export async function setProjectTags(database: DbClient, projectId: number, tagIds: number[], actor?: JournalActor | null): Promise<Tag[]> {
  const owner = await getProjectJournalObject(database, projectId);
  await ensureTagsExist(database, tagIds);
  const before = await getProjectTags(database, projectId);
  const uniqueIds = normalizeTagIds(tagIds);
  const after = uniqueIds.length > 0 ? await tagRepository.findByIds(database, uniqueIds) : [];

  await database.transaction(async (tx) => {
    await tx.delete(projectTags).where(eq(projectTags.projectId, projectId));
    if (uniqueIds.length > 0) {
      await tx.insert(projectTags)
        .values(uniqueIds.map((tagId) => ({ projectId, tagId })));
    }
    const changes = buildTagAssignmentChange(before, after);
    await recordJournalEntry(tx, {
      operation: "update",
      object: owner,
      summary: buildTagAssignmentSummary(owner, changes),
      actor,
      changes
    });
  });

  return getProjectTags(database, projectId);
}

export async function setTaskTags(database: DbClient, taskId: number, tagIds: number[], actor?: JournalActor | null): Promise<Tag[]> {
  const owner = await getTaskJournalObject(database, taskId);
  await ensureTagsExist(database, tagIds);
  const before = await getTaskTags(database, taskId);
  const uniqueIds = normalizeTagIds(tagIds);
  const after = uniqueIds.length > 0 ? await tagRepository.findByIds(database, uniqueIds) : [];

  await database.transaction(async (tx) => {
    await tx.delete(taskTags).where(eq(taskTags.taskId, taskId));
    if (uniqueIds.length > 0) {
      await tx.insert(taskTags)
        .values(uniqueIds.map((tagId) => ({ taskId, tagId })));
    }
    const changes = buildTagAssignmentChange(before, after);
    await recordJournalEntry(tx, {
      operation: "update",
      object: owner,
      summary: buildTagAssignmentSummary(owner, changes),
      actor,
      changes
    });
  });

  return getTaskTags(database, taskId);
}

export async function setMilestoneTags(database: DbClient, milestoneId: number, tagIds: number[], actor?: JournalActor | null): Promise<Tag[]> {
  const owner = await getMilestoneJournalObject(database, milestoneId);
  await ensureTagsExist(database, tagIds);
  const before = await getMilestoneTags(database, milestoneId);
  const uniqueIds = normalizeTagIds(tagIds);
  const after = uniqueIds.length > 0 ? await tagRepository.findByIds(database, uniqueIds) : [];

  await database.transaction(async (tx) => {
    await tx.delete(milestoneTags).where(eq(milestoneTags.milestoneId, milestoneId));
    if (uniqueIds.length > 0) {
      await tx.insert(milestoneTags)
        .values(uniqueIds.map((tagId) => ({ milestoneId, tagId })));
    }
    const changes = buildTagAssignmentChange(before, after);
    await recordJournalEntry(tx, {
      operation: "update",
      object: owner,
      summary: buildTagAssignmentSummary(owner, changes),
      actor,
      changes
    });
  });

  return getMilestoneTags(database, milestoneId);
}

export async function setTicketTags(database: DbClient, ticketId: number, tagIds: number[], actor?: JournalActor | null): Promise<Tag[]> {
  const owner = await getTicketJournalObject(database, ticketId);
  await ensureTagsExist(database, tagIds);
  const before = await getTicketTags(database, ticketId);
  const uniqueIds = normalizeTagIds(tagIds);
  const after = uniqueIds.length > 0 ? await tagRepository.findByIds(database, uniqueIds) : [];

  await database.transaction(async (tx) => {
    await tx.delete(ticketTags).where(eq(ticketTags.ticketId, ticketId));
    if (uniqueIds.length > 0) {
      await tx.insert(ticketTags)
        .values(uniqueIds.map((tagId) => ({ ticketId, tagId })));
    }
    const changes = buildTagAssignmentChange(before, after);
    await recordJournalEntry(tx, {
      operation: "update",
      object: owner,
      summary: buildTagAssignmentSummary(owner, changes),
      actor,
      changes
    });
  });

  return getTicketTags(database, ticketId);
}
