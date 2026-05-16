import type { Project, ProjectInput, ProjectUpdate } from "@taskmanager/shared-types";
import { desc, eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { projects, tasks } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import { cleanNullable, nowIso, requireNonEmpty } from "./helpers.js";
import { getProjectTags, getProjectTagsMap } from "./tags.service.js";

type ProjectRecord = typeof projects.$inferSelect;
interface ProjectTaskCounts {
  openTaskCount: number;
  doneTaskCount: number;
  totalTaskCount: number;
}

function emptyProjectTaskCounts(): ProjectTaskCounts {
  return {
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0
  };
}

function mapProject(database: DbClient, record: ProjectRecord, counts: ProjectTaskCounts = emptyProjectTaskCounts(), tags = getProjectTags(database, record.id)): Project {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    status: record.status,
    color: record.color,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    openTaskCount: counts.openTaskCount,
    doneTaskCount: counts.doneTaskCount,
    totalTaskCount: counts.totalTaskCount,
    tags
  };
}

function getProjectTaskCounts(database: DbClient, projectIds: number[]): Map<number, ProjectTaskCounts> {
  const counts = new Map<number, ProjectTaskCounts>();
  if (projectIds.length === 0) {
    return counts;
  }

  for (const projectId of projectIds) {
    counts.set(projectId, emptyProjectTaskCounts());
  }

  const rows = database
    .select({ projectId: tasks.projectId, status: tasks.status })
    .from(tasks)
    .where(inArray(tasks.projectId, projectIds))
    .all();

  for (const row of rows) {
    const current = counts.get(row.projectId) ?? emptyProjectTaskCounts();
    current.totalTaskCount += 1;
    if (row.status === "done") {
      current.doneTaskCount += 1;
    } else {
      current.openTaskCount += 1;
    }
    counts.set(row.projectId, current);
  }

  return counts;
}

export function listProjects(database: DbClient): Project[] {
  const rows = database.select().from(projects).orderBy(desc(projects.createdAt)).all();
  const ids = rows.map((project) => project.id);
  const counts = getProjectTaskCounts(database, ids);
  const tagsByProject = getProjectTagsMap(database, ids);

  return rows.map((project) => mapProject(database, project, counts.get(project.id), tagsByProject.get(project.id) ?? []));
}

export function getProject(database: DbClient, id: number): Project {
  const project = database.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) {
    throw notFound(`Project with id ${id} not found`);
  }

  const counts = getProjectTaskCounts(database, [id]);
  return mapProject(database, project, counts.get(id));
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

  return mapProject(database, created, emptyProjectTaskCounts(), []);
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

  const counts = getProjectTaskCounts(database, [id]);
  return mapProject(database, updated, counts.get(id));
}

export function deleteProject(database: DbClient, id: number): void {
  const result = database.delete(projects).where(eq(projects.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`Project with id ${id} not found`);
  }
}
