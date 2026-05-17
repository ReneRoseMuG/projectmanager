import type { Tag } from "@taskmanager/shared-types";
import { inArray, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { projectTags, projects, tags, taskTags, tasks } from "../db/schema.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { requireNonEmpty } from "./helpers.js";

type TagRecord = typeof tags.$inferSelect;
type MappableTagRecord = Pick<TagRecord, "id" | "name" | "color">;

function mapTag(record: MappableTagRecord): Tag {
  return {
    id: record.id,
    name: record.name,
    color: record.color
  };
}

function ensureProjectExists(database: DbClient, projectId: number): void {
  const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

function ensureTaskExists(database: DbClient, taskId: number): void {
  const task = database.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    throw notFound(`Task with id ${taskId} not found`);
  }
}

function ensureTagsExist(database: DbClient, tagIds: number[]): void {
  if (tagIds.length === 0) {
    return;
  }

  const uniqueIds = [...new Set(tagIds)];
  const found = database.select({ id: tags.id }).from(tags).where(inArray(tags.id, uniqueIds)).all();
  if (found.length !== uniqueIds.length) {
    throw badRequest("One or more tagIds are invalid");
  }
}

export function listTags(database: DbClient): Tag[] {
  return database.select().from(tags).all().map(mapTag);
}

export function getProjectTags(database: DbClient, projectId: number): Tag[] {
  const rows = database
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color
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
      color: tags.color
    })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(eq(taskTags.taskId, taskId))
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
      color: tags.color
    })
    .from(projectTags)
    .innerJoin(tags, eq(projectTags.tagId, tags.id))
    .where(inArray(projectTags.projectId, projectIds))
    .all();

  for (const row of rows) {
    const current = map.get(row.projectId) ?? [];
    current.push({ id: row.id, name: row.name, color: row.color });
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
      color: tags.color
    })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(inArray(taskTags.taskId, taskIds))
    .all();

  for (const row of rows) {
    const current = map.get(row.taskId) ?? [];
    current.push({ id: row.id, name: row.name, color: row.color });
    map.set(row.taskId, current);
  }

  return map;
}

export function createTag(database: DbClient, input: { name?: string; color?: string }): Tag {
  const name = requireNonEmpty(input.name, "name");
  const existing = database.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).get();
  if (existing) {
    throw conflict(`Tag "${name}" already exists`);
  }

  const created = database
    .insert(tags)
    .values({ name, color: input.color ?? "#94a3b8" })
    .returning()
    .get();

  return mapTag(created);
}

export function updateTag(database: DbClient, id: number, input: { name?: string; color?: string }): Tag {
  const values: Partial<typeof tags.$inferInsert> = {};
  if (input.name !== undefined) {
    values.name = requireNonEmpty(input.name, "name");
  }
  if (input.color !== undefined) {
    values.color = input.color;
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No tag fields provided");
  }

  const updated = database.update(tags).set(values).where(eq(tags.id, id)).returning().get();
  if (!updated) {
    throw notFound(`Tag with id ${id} not found`);
  }

  return mapTag(updated);
}

export function deleteTag(database: DbClient, id: number): void {
  const result = database.delete(tags).where(eq(tags.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`Tag with id ${id} not found`);
  }
}

export function setProjectTags(database: DbClient, projectId: number, tagIds: number[]): Tag[] {
  ensureProjectExists(database, projectId);
  ensureTagsExist(database, tagIds);

  database.transaction((tx) => {
    tx.delete(projectTags).where(eq(projectTags.projectId, projectId)).run();
    const uniqueIds = [...new Set(tagIds)];
    if (uniqueIds.length > 0) {
      tx.insert(projectTags)
        .values(uniqueIds.map((tagId) => ({ projectId, tagId })))
        .run();
    }
  });

  return getProjectTags(database, projectId);
}

export function setTaskTags(database: DbClient, taskId: number, tagIds: number[]): Tag[] {
  ensureTaskExists(database, taskId);
  ensureTagsExist(database, tagIds);

  database.transaction((tx) => {
    tx.delete(taskTags).where(eq(taskTags.taskId, taskId)).run();
    const uniqueIds = [...new Set(tagIds)];
    if (uniqueIds.length > 0) {
      tx.insert(taskTags)
        .values(uniqueIds.map((tagId) => ({ taskId, tagId })))
        .run();
    }
  });

  return getTaskTags(database, taskId);
}
