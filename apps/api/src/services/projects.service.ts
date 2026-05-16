import type { Project, ProjectInput, ProjectUpdate } from "@taskmanager/shared-types";
import { desc, eq, inArray, ne } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { projects, tasks } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import { cleanNullable, nowIso, requireNonEmpty } from "./helpers.js";
import { getProjectTags, getProjectTagsMap } from "./tags.service.js";

type ProjectRecord = typeof projects.$inferSelect;

function mapProject(database: DbClient, record: ProjectRecord, openTaskCount: number, tags = getProjectTags(database, record.id)): Project {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    status: record.status,
    color: record.color,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    openTaskCount,
    tags
  };
}

function getOpenTaskCounts(database: DbClient, projectIds: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  if (projectIds.length === 0) {
    return counts;
  }

  const rows = database
    .select({ projectId: tasks.projectId })
    .from(tasks)
    .where(inArray(tasks.projectId, projectIds))
    .all();

  const doneRows = database
    .select({ projectId: tasks.projectId })
    .from(tasks)
    .where(ne(tasks.status, "done"))
    .all();

  for (const row of rows) {
    counts.set(row.projectId, 0);
  }

  for (const row of doneRows.filter((row) => projectIds.includes(row.projectId))) {
    counts.set(row.projectId, (counts.get(row.projectId) ?? 0) + 1);
  }

  return counts;
}

export function listProjects(database: DbClient): Project[] {
  const rows = database.select().from(projects).orderBy(desc(projects.createdAt)).all();
  const ids = rows.map((project) => project.id);
  const counts = getOpenTaskCounts(database, ids);
  const tagsByProject = getProjectTagsMap(database, ids);

  return rows.map((project) => mapProject(database, project, counts.get(project.id) ?? 0, tagsByProject.get(project.id) ?? []));
}

export function getProject(database: DbClient, id: number): Project {
  const project = database.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) {
    throw notFound(`Project with id ${id} not found`);
  }

  const counts = getOpenTaskCounts(database, [id]);
  return mapProject(database, project, counts.get(id) ?? 0);
}

export function createProject(database: DbClient, input: ProjectInput): Project {
  const name = requireNonEmpty(input.name, "name");
  const now = nowIso();
  const created = database
    .insert(projects)
    .values({
      name,
      description: cleanNullable(input.description) ?? null,
      status: input.status ?? "active",
      color: input.color ?? "#6366f1",
      createdAt: now,
      updatedAt: now
    })
    .returning()
    .get();

  return mapProject(database, created, 0, []);
}

export function updateProject(database: DbClient, id: number, input: ProjectUpdate): Project {
  const values: Partial<typeof projects.$inferInsert> = {};

  if (input.name !== undefined) {
    values.name = requireNonEmpty(input.name, "name");
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.status !== undefined) {
    values.status = input.status;
  }
  if (input.color !== undefined) {
    values.color = input.color;
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No project fields provided");
  }

  values.updatedAt = nowIso();

  const updated = database.update(projects).set(values).where(eq(projects.id, id)).returning().get();
  if (!updated) {
    throw notFound(`Project with id ${id} not found`);
  }

  const counts = getOpenTaskCounts(database, [id]);
  return mapProject(database, updated, counts.get(id) ?? 0);
}

export function deleteProject(database: DbClient, id: number): void {
  const result = database.delete(projects).where(eq(projects.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`Project with id ${id} not found`);
  }
}
