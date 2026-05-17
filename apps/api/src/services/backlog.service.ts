import { and, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { backlogItems, features, projects, useCases } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import { cleanNullable, nowIso, requireNonEmpty } from "./helpers.js";

type BacklogRecord = typeof backlogItems.$inferSelect;
type BacklogStatus = BacklogRecord["status"];
type BacklogPriority = BacklogRecord["priority"];

export interface BacklogInput {
  title?: string;
  description?: string | null;
  status?: BacklogStatus;
  priority?: BacklogPriority;
  importKey?: string | null;
  featureId?: number | null;
  useCaseId?: number | null;
  sortOrder?: number;
}

export interface BacklogFilters {
  featureId?: number;
  useCaseId?: number;
  status?: BacklogStatus;
}

export interface BacklogDto {
  id: number;
  projectId: number;
  featureId: number | null;
  useCaseId: number | null;
  title: string;
  description: string | null;
  status: BacklogStatus;
  priority: BacklogPriority;
  importKey: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function mapBacklogItem(record: BacklogRecord): BacklogDto {
  return {
    id: record.id,
    projectId: record.projectId,
    featureId: record.featureId,
    useCaseId: record.useCaseId,
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    importKey: record.importKey,
    sortOrder: record.sortOrder,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function ensureProjectExists(database: DbClient, projectId: number): void {
  const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

function ensureFeatureExists(database: DbClient, featureId: number | null | undefined): void {
  if (featureId === undefined || featureId === null) {
    return;
  }

  const feature = database.select({ id: features.id }).from(features).where(eq(features.id, featureId)).get();
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

function ensureUseCaseExists(database: DbClient, useCaseId: number | null | undefined): void {
  if (useCaseId === undefined || useCaseId === null) {
    return;
  }

  const useCase = database.select({ id: useCases.id }).from(useCases).where(eq(useCases.id, useCaseId)).get();
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
}

function getBacklogRecord(database: DbClient, id: number): BacklogRecord {
  const item = database.select().from(backlogItems).where(eq(backlogItems.id, id)).get();
  if (!item) {
    throw notFound(`Backlog item with id ${id} not found`);
  }
  return item;
}

function ensureStatusTransition(current: BacklogStatus, next: BacklogStatus): void {
  if (current === next) {
    return;
  }

  const allowed =
    (current === "open" && (next === "in_progress" || next === "rejected")) ||
    (current === "in_progress" && next === "done");

  if (!allowed) {
    throw badRequest(`Invalid backlog status transition from ${current} to ${next}`);
  }
}

export function listBacklogItems(database: DbClient, projectId: number, filters: BacklogFilters): BacklogDto[] {
  ensureProjectExists(database, projectId);

  const conditions = [eq(backlogItems.projectId, projectId)];
  if (filters.featureId !== undefined) {
    conditions.push(eq(backlogItems.featureId, filters.featureId));
  }
  if (filters.useCaseId !== undefined) {
    conditions.push(eq(backlogItems.useCaseId, filters.useCaseId));
  }
  if (filters.status !== undefined) {
    conditions.push(eq(backlogItems.status, filters.status));
  }

  return database
    .select()
    .from(backlogItems)
    .where(and(...conditions))
    .orderBy(backlogItems.sortOrder, backlogItems.createdAt)
    .all()
    .map(mapBacklogItem);
}

export function createBacklogItem(database: DbClient, projectId: number, input: BacklogInput): BacklogDto {
  ensureProjectExists(database, projectId);
  ensureFeatureExists(database, input.featureId);
  ensureUseCaseExists(database, input.useCaseId);

  const now = nowIso();
  const created = database
    .insert(backlogItems)
    .values({
      projectId,
      featureId: input.featureId ?? null,
      useCaseId: input.useCaseId ?? null,
      title: requireNonEmpty(input.title, "title"),
      description: cleanNullable(input.description) ?? null,
      status: input.status ?? "open",
      priority: input.priority ?? "medium",
      importKey: cleanNullable(input.importKey) ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now
    })
    .returning()
    .get();

  return mapBacklogItem(created);
}

export function getBacklogItem(database: DbClient, id: number): BacklogDto {
  return mapBacklogItem(getBacklogRecord(database, id));
}

export function updateBacklogItem(database: DbClient, id: number, input: BacklogInput): BacklogDto {
  const current = getBacklogRecord(database, id);
  const values: Partial<typeof backlogItems.$inferInsert> = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.status !== undefined) {
    ensureStatusTransition(current.status, input.status);
    values.status = input.status;
  }
  if (input.priority !== undefined) {
    values.priority = input.priority;
  }
  if (input.importKey !== undefined) {
    values.importKey = cleanNullable(input.importKey) ?? null;
  }
  if (input.featureId !== undefined) {
    ensureFeatureExists(database, input.featureId);
    values.featureId = input.featureId;
  }
  if (input.useCaseId !== undefined) {
    ensureUseCaseExists(database, input.useCaseId);
    values.useCaseId = input.useCaseId;
  }
  if (input.sortOrder !== undefined) {
    values.sortOrder = input.sortOrder;
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No backlog item fields provided");
  }

  values.updatedAt = nowIso();

  const updated = database.update(backlogItems).set(values).where(eq(backlogItems.id, id)).returning().get();
  return mapBacklogItem(updated);
}

export function deleteBacklogItem(database: DbClient, id: number): void {
  const result = database.delete(backlogItems).where(eq(backlogItems.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`Backlog item with id ${id} not found`);
  }
}
