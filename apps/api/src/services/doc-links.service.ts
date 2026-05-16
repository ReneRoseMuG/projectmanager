import { eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { features, projectFeatures, projects, taskFeatures, taskUseCases, tasks, useCases } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import type { FeatureDto } from "./features.service.js";
import type { UseCaseDto } from "./use-cases.service.js";

function mapFeature(row: typeof features.$inferSelect, useCaseCount = 0): FeatureDto {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    description: row.description,
    contentPath: row.contentPath,
    sortOrder: row.sortOrder,
    useCaseCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapUseCase(row: typeof useCases.$inferSelect): UseCaseDto {
  return {
    id: row.id,
    featureId: row.featureId,
    title: row.title,
    slug: row.slug,
    status: row.status,
    description: row.description,
    contentPath: row.contentPath,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
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

function ensureFeaturesExist(database: DbClient, featureIds: number[]): number[] {
  const uniqueIds = [...new Set(featureIds)];
  if (uniqueIds.length === 0) {
    return [];
  }

  const found = database.select({ id: features.id }).from(features).where(inArray(features.id, uniqueIds)).all();
  const foundIds = new Set(found.map((row) => row.id));
  const invalidIds = uniqueIds.filter((id) => !foundIds.has(id));

  if (invalidIds.length > 0) {
    throw badRequest(`Invalid featureIds: ${invalidIds.join(", ")}`);
  }

  return uniqueIds;
}

function ensureUseCasesExist(database: DbClient, useCaseIds: number[]): number[] {
  const uniqueIds = [...new Set(useCaseIds)];
  if (uniqueIds.length === 0) {
    return [];
  }

  const found = database.select({ id: useCases.id }).from(useCases).where(inArray(useCases.id, uniqueIds)).all();
  const foundIds = new Set(found.map((row) => row.id));
  const invalidIds = uniqueIds.filter((id) => !foundIds.has(id));

  if (invalidIds.length > 0) {
    throw badRequest(`Invalid useCaseIds: ${invalidIds.join(", ")}`);
  }

  return uniqueIds;
}

function getUseCaseCountMap(database: DbClient, featureIds: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  if (featureIds.length === 0) {
    return counts;
  }

  const rows = database.select({ featureId: useCases.featureId }).from(useCases).where(inArray(useCases.featureId, featureIds)).all();
  for (const row of rows) {
    counts.set(row.featureId, (counts.get(row.featureId) ?? 0) + 1);
  }

  return counts;
}

export function listProjectFeatures(database: DbClient, projectId: number): FeatureDto[] {
  ensureProjectExists(database, projectId);
  const rows = database
    .select({
      id: features.id,
      title: features.title,
      slug: features.slug,
      status: features.status,
      description: features.description,
      contentPath: features.contentPath,
      sortOrder: features.sortOrder,
      createdAt: features.createdAt,
      updatedAt: features.updatedAt
    })
    .from(projectFeatures)
    .innerJoin(features, eq(projectFeatures.featureId, features.id))
    .where(eq(projectFeatures.projectId, projectId))
    .all();
  const counts = getUseCaseCountMap(database, rows.map((row) => row.id));

  return rows.map((row) => mapFeature(row, counts.get(row.id) ?? 0));
}

export function setProjectFeatures(database: DbClient, projectId: number, featureIds: number[]): FeatureDto[] {
  ensureProjectExists(database, projectId);
  const uniqueIds = ensureFeaturesExist(database, featureIds);

  database.transaction((tx) => {
    tx.delete(projectFeatures).where(eq(projectFeatures.projectId, projectId)).run();
    if (uniqueIds.length > 0) {
      tx.insert(projectFeatures).values(uniqueIds.map((featureId) => ({ projectId, featureId }))).run();
    }
  });

  return listProjectFeatures(database, projectId);
}

export function listTaskFeatures(database: DbClient, taskId: number): FeatureDto[] {
  ensureTaskExists(database, taskId);
  const rows = database
    .select({
      id: features.id,
      title: features.title,
      slug: features.slug,
      status: features.status,
      description: features.description,
      contentPath: features.contentPath,
      sortOrder: features.sortOrder,
      createdAt: features.createdAt,
      updatedAt: features.updatedAt
    })
    .from(taskFeatures)
    .innerJoin(features, eq(taskFeatures.featureId, features.id))
    .where(eq(taskFeatures.taskId, taskId))
    .all();
  const counts = getUseCaseCountMap(database, rows.map((row) => row.id));

  return rows.map((row) => mapFeature(row, counts.get(row.id) ?? 0));
}

export function setTaskFeatures(database: DbClient, taskId: number, featureIds: number[]): FeatureDto[] {
  ensureTaskExists(database, taskId);
  const uniqueIds = ensureFeaturesExist(database, featureIds);

  database.transaction((tx) => {
    tx.delete(taskFeatures).where(eq(taskFeatures.taskId, taskId)).run();
    if (uniqueIds.length > 0) {
      tx.insert(taskFeatures).values(uniqueIds.map((featureId) => ({ taskId, featureId }))).run();
    }
  });

  return listTaskFeatures(database, taskId);
}

export function listTaskUseCases(database: DbClient, taskId: number): UseCaseDto[] {
  ensureTaskExists(database, taskId);
  return database
    .select({
      id: useCases.id,
      featureId: useCases.featureId,
      title: useCases.title,
      slug: useCases.slug,
      status: useCases.status,
      description: useCases.description,
      contentPath: useCases.contentPath,
      sortOrder: useCases.sortOrder,
      createdAt: useCases.createdAt,
      updatedAt: useCases.updatedAt
    })
    .from(taskUseCases)
    .innerJoin(useCases, eq(taskUseCases.useCaseId, useCases.id))
    .where(eq(taskUseCases.taskId, taskId))
    .all()
    .map(mapUseCase);
}

export function setTaskUseCases(database: DbClient, taskId: number, useCaseIds: number[]): UseCaseDto[] {
  ensureTaskExists(database, taskId);
  const uniqueIds = ensureUseCasesExist(database, useCaseIds);

  database.transaction((tx) => {
    tx.delete(taskUseCases).where(eq(taskUseCases.taskId, taskId)).run();
    if (uniqueIds.length > 0) {
      tx.insert(taskUseCases).values(uniqueIds.map((useCaseId) => ({ taskId, useCaseId }))).run();
    }
  });

  return listTaskUseCases(database, taskId);
}
