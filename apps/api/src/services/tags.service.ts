import type { JsonValue, Tag } from "@taskmanager/shared-types";
import { inArray, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
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

function getProjectJournalObject(database: DbClient, projectId: number): JournalObjectRef {
  const project = database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
  return makeJournalObject("project", project.id, project.name);
}

function getTaskJournalObject(database: DbClient, taskId: number): JournalObjectRef {
  const task = database.select({ id: tasks.id, title: tasks.title }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    throw notFound(`Task with id ${taskId} not found`);
  }
  return makeJournalObject("task", task.id, task.title);
}

function getMilestoneJournalObject(database: DbClient, milestoneId: number): JournalObjectRef {
  const milestone = database.select({ id: milestones.id, name: milestones.name }).from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
  return makeJournalObject("milestone", milestone.id, milestone.name);
}

function getTicketJournalObject(database: DbClient, ticketId: number): JournalObjectRef {
  const ticket = database.select({ id: tickets.id, title: tickets.title }).from(tickets).where(eq(tickets.id, ticketId)).get();
  if (!ticket) {
    throw notFound(`Ticket with id ${ticketId} not found`);
  }
  return makeJournalObject("ticket", ticket.id, ticket.title);
}

function ensureTagsExist(database: DbClient, tagIds: number[]): void {
  if (tagIds.length === 0) {
    return;
  }

  const uniqueIds = [...new Set(tagIds)];
  const found = tagRepository.findByIds(database, uniqueIds);
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

export function listTags(database: DbClient): Tag[] {
  return tagRepository.findAll(database).map(mapTag);
}

export function getProjectTags(database: DbClient, projectId: number): Tag[] {
  const rows = database
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(projectTags)
    .innerJoin(tags, eq(projectTags.tagId, tags.id))
    .where(eq(projectTags.projectId, projectId))
    .all();

  return rows.map(mapTag);
}

export function getTaskTags(database: DbClient, taskId: number): Tag[] {
  const rows = database
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(eq(taskTags.taskId, taskId))
    .all();

  return rows.map(mapTag);
}

export function getMilestoneTags(database: DbClient, milestoneId: number): Tag[] {
  const rows = database
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(milestoneTags)
    .innerJoin(tags, eq(milestoneTags.tagId, tags.id))
    .where(eq(milestoneTags.milestoneId, milestoneId))
    .all();

  return rows.map(mapTag);
}

export function getTicketTags(database: DbClient, ticketId: number): Tag[] {
  const rows = database
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(ticketTags)
    .innerJoin(tags, eq(ticketTags.tagId, tags.id))
    .where(eq(ticketTags.ticketId, ticketId))
    .all();

  return rows.map(mapTag);
}

export function getProjectTagsMap(database: DbClient, projectIds: number[]): Map<number, Tag[]> {
  const map = new Map<number, Tag[]>();
  if (projectIds.length === 0) {
    return map;
  }

  const rows = database
    .select({
      projectId: projectTags.projectId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(projectTags)
    .innerJoin(tags, eq(projectTags.tagId, tags.id))
    .where(inArray(projectTags.projectId, projectIds))
    .all();

  for (const row of rows) {
    const current = map.get(row.projectId) ?? [];
    current.push({ id: row.id, name: row.name, color: row.color, version: row.version });
    map.set(row.projectId, current);
  }

  return map;
}

export function getTaskTagsMap(database: DbClient, taskIds: number[]): Map<number, Tag[]> {
  const map = new Map<number, Tag[]>();
  if (taskIds.length === 0) {
    return map;
  }

  const rows = database
    .select({
      taskId: taskTags.taskId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(inArray(taskTags.taskId, taskIds))
    .all();

  for (const row of rows) {
    const current = map.get(row.taskId) ?? [];
    current.push({ id: row.id, name: row.name, color: row.color, version: row.version });
    map.set(row.taskId, current);
  }

  return map;
}

export function getMilestoneTagsMap(database: DbClient, milestoneIds: number[]): Map<number, Tag[]> {
  const map = new Map<number, Tag[]>();
  if (milestoneIds.length === 0) {
    return map;
  }

  const rows = database
    .select({
      milestoneId: milestoneTags.milestoneId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(milestoneTags)
    .innerJoin(tags, eq(milestoneTags.tagId, tags.id))
    .where(inArray(milestoneTags.milestoneId, milestoneIds))
    .all();

  for (const row of rows) {
    const current = map.get(row.milestoneId) ?? [];
    current.push({ id: row.id, name: row.name, color: row.color, version: row.version });
    map.set(row.milestoneId, current);
  }

  return map;
}

export function getTicketTagsMap(database: DbClient, ticketIds: number[]): Map<number, Tag[]> {
  const map = new Map<number, Tag[]>();
  if (ticketIds.length === 0) {
    return map;
  }

  const rows = database
    .select({
      ticketId: ticketTags.ticketId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
      version: tags.version
    })
    .from(ticketTags)
    .innerJoin(tags, eq(ticketTags.tagId, tags.id))
    .where(inArray(ticketTags.ticketId, ticketIds))
    .all();

  for (const row of rows) {
    const current = map.get(row.ticketId) ?? [];
    current.push({ id: row.id, name: row.name, color: row.color, version: row.version });
    map.set(row.ticketId, current);
  }

  return map;
}

export function createTag(database: DbClient, input: { name?: string; color?: string }, actor?: JournalActor | null): Tag {
  const name = requireNonEmpty(input.name, "name");
  const existing = tagRepository.findByName(database, name);
  if (existing) {
    throw conflict(`Tag "${name}" already exists`);
  }

  const created = database.transaction((tx) => {
    const tag = tagRepository.create(tx, { name, color: input.color ?? "#94a3b8" }, actor?.actorUserId ?? undefined);
    const journalObject = tagJournalObject(tag);
    recordJournalEntry(tx, {
      operation: "create",
      object: journalObject,
      summary: buildCreateSummary(journalObject),
      actor
    });
    return tag;
  });

  return mapTag(created);
}

export function updateTag(database: DbClient, id: number, input: { name?: string; color?: string; expectedVersion: number }, actor?: JournalActor | null): Tag {
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

  const updated = database.transaction((tx) => {
    const current = tagRepository.findById(tx, id);
    if (!current) {
      throw notFound(`Tag with id ${id} not found`);
    }
    const tag = tagRepository.update(tx, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!tag) {
      throw notFound(`Tag with id ${id} not found`);
    }
    const journalObject = tagJournalObject(tag);
    const changes = buildJournalChanges(current, tag, tagJournalFields);
    recordJournalEntry(tx, {
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

export function deleteTag(database: DbClient, id: number, actor?: JournalActor | null): void {
  database.transaction((tx) => {
    const current = tagRepository.findById(tx, id);
    if (!current) {
      throw notFound(`Tag with id ${id} not found`);
    }
    const journalObject = tagJournalObject(current);
    recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor
    });
    if (tagRepository.delete(tx, id) === 0) {
      throw notFound(`Tag with id ${id} not found`);
    }
  });
}

export function setProjectTags(database: DbClient, projectId: number, tagIds: number[], actor?: JournalActor | null): Tag[] {
  const owner = getProjectJournalObject(database, projectId);
  ensureTagsExist(database, tagIds);
  const before = getProjectTags(database, projectId);
  const uniqueIds = normalizeTagIds(tagIds);
  const after = uniqueIds.length > 0 ? tagRepository.findByIds(database, uniqueIds) : [];

  database.transaction((tx) => {
    tx.delete(projectTags).where(eq(projectTags.projectId, projectId)).run();
    if (uniqueIds.length > 0) {
      tx.insert(projectTags)
        .values(uniqueIds.map((tagId) => ({ projectId, tagId })))
        .run();
    }
    const changes = buildTagAssignmentChange(before, after);
    recordJournalEntry(tx, {
      operation: "update",
      object: owner,
      summary: buildTagAssignmentSummary(owner, changes),
      actor,
      changes
    });
  });

  return getProjectTags(database, projectId);
}

export function setTaskTags(database: DbClient, taskId: number, tagIds: number[], actor?: JournalActor | null): Tag[] {
  const owner = getTaskJournalObject(database, taskId);
  ensureTagsExist(database, tagIds);
  const before = getTaskTags(database, taskId);
  const uniqueIds = normalizeTagIds(tagIds);
  const after = uniqueIds.length > 0 ? tagRepository.findByIds(database, uniqueIds) : [];

  database.transaction((tx) => {
    tx.delete(taskTags).where(eq(taskTags.taskId, taskId)).run();
    if (uniqueIds.length > 0) {
      tx.insert(taskTags)
        .values(uniqueIds.map((tagId) => ({ taskId, tagId })))
        .run();
    }
    const changes = buildTagAssignmentChange(before, after);
    recordJournalEntry(tx, {
      operation: "update",
      object: owner,
      summary: buildTagAssignmentSummary(owner, changes),
      actor,
      changes
    });
  });

  return getTaskTags(database, taskId);
}

export function setMilestoneTags(database: DbClient, milestoneId: number, tagIds: number[], actor?: JournalActor | null): Tag[] {
  const owner = getMilestoneJournalObject(database, milestoneId);
  ensureTagsExist(database, tagIds);
  const before = getMilestoneTags(database, milestoneId);
  const uniqueIds = normalizeTagIds(tagIds);
  const after = uniqueIds.length > 0 ? tagRepository.findByIds(database, uniqueIds) : [];

  database.transaction((tx) => {
    tx.delete(milestoneTags).where(eq(milestoneTags.milestoneId, milestoneId)).run();
    if (uniqueIds.length > 0) {
      tx.insert(milestoneTags)
        .values(uniqueIds.map((tagId) => ({ milestoneId, tagId })))
        .run();
    }
    const changes = buildTagAssignmentChange(before, after);
    recordJournalEntry(tx, {
      operation: "update",
      object: owner,
      summary: buildTagAssignmentSummary(owner, changes),
      actor,
      changes
    });
  });

  return getMilestoneTags(database, milestoneId);
}

export function setTicketTags(database: DbClient, ticketId: number, tagIds: number[], actor?: JournalActor | null): Tag[] {
  const owner = getTicketJournalObject(database, ticketId);
  ensureTagsExist(database, tagIds);
  const before = getTicketTags(database, ticketId);
  const uniqueIds = normalizeTagIds(tagIds);
  const after = uniqueIds.length > 0 ? tagRepository.findByIds(database, uniqueIds) : [];

  database.transaction((tx) => {
    tx.delete(ticketTags).where(eq(ticketTags.ticketId, ticketId)).run();
    if (uniqueIds.length > 0) {
      tx.insert(ticketTags)
        .values(uniqueIds.map((tagId) => ({ ticketId, tagId })))
        .run();
    }
    const changes = buildTagAssignmentChange(before, after);
    recordJournalEntry(tx, {
      operation: "update",
      object: owner,
      summary: buildTagAssignmentSummary(owner, changes),
      actor,
      changes
    });
  });

  return getTicketTags(database, ticketId);
}
