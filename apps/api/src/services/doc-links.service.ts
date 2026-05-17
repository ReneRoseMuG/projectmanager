import type { FeatureRelation, FeatureRelationInput, Task } from "@taskmanager/shared-types";
import { eq, inArray, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { featureRelations, features, projectFeatures, projects, taskFeatures, taskUseCases, tasks, useCases } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import type { FeatureDto } from "./features.service.js";
import { mapTask } from "./tasks.service.js";
import type { UseCaseDto } from "./use-cases.service.js";

type MappableFeatureRecord = Pick<
  typeof features.$inferSelect,
  "id" | "title" | "slug" | "status" | "description" | "contentPath" | "sortOrder" | "createdAt" | "updatedAt"
>;
type MappableUseCaseRecord = Pick<
  typeof useCases.$inferSelect,
  "id" | "featureId" | "title" | "slug" | "status" | "description" | "contentPath" | "sortOrder" | "createdAt" | "updatedAt"
>;

function mapFeature(row: MappableFeatureRecord, useCaseCount = 0): FeatureDto {
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

function mapUseCase(row: MappableUseCaseRecord): UseCaseDto {
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

function ensureUseCaseExists(database: DbClient, useCaseId: number): void {
  const useCase = database.select({ id: useCases.id }).from(useCases).where(eq(useCases.id, useCaseId)).get();
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
}

function ensureFeatureExists(database: DbClient, featureId: number): void {
  const feature = database.select({ id: features.id }).from(features).where(eq(features.id, featureId)).get();
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

function ensureTasksExist(database: DbClient, taskIds: number[]): number[] {
  const uniqueIds = [...new Set(taskIds)];
  if (uniqueIds.length === 0) {
    return [];
  }

  const found = database.select({ id: tasks.id }).from(tasks).where(inArray(tasks.id, uniqueIds)).all();
  const foundIds = new Set(found.map((row) => row.id));
  const invalidIds = uniqueIds.filter((id) => !foundIds.has(id));

  if (invalidIds.length > 0) {
    throw badRequest(`Invalid taskIds: ${invalidIds.join(", ")}`);
  }

  return uniqueIds;
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

function normalizeFeatureRelations(featureId: number, relations: FeatureRelationInput[]): Array<Required<FeatureRelationInput>> {
  const uniqueRelations = new Map<string, Required<FeatureRelationInput>>();

  for (const relation of relations) {
    const relationType = relation.relationType ?? "related";
    if (relation.targetFeatureId === featureId) {
      throw badRequest("Feature relations cannot point to the same feature");
    }

    uniqueRelations.set(`${relation.targetFeatureId}:${relationType}`, {
      targetFeatureId: relation.targetFeatureId,
      relationType,
      description: relation.description ?? null
    });
  }

  return [...uniqueRelations.values()];
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

export function listFeatureTasks(database: DbClient, featureId: number): Task[] {
  ensureFeatureExists(database, featureId);
  return database
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      parentId: tasks.parentId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assignee: tasks.assignee,
      dueDate: tasks.dueDate,
      importKey: tasks.importKey,
      position: tasks.position,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt
    })
    .from(taskFeatures)
    .innerJoin(tasks, eq(taskFeatures.taskId, tasks.id))
    .where(eq(taskFeatures.featureId, featureId))
    .all()
    .map((task) => mapTask(database, task));
}

export function setFeatureTasks(database: DbClient, featureId: number, taskIds: number[]): Task[] {
  ensureFeatureExists(database, featureId);
  const uniqueIds = ensureTasksExist(database, taskIds);

  database.transaction((tx) => {
    tx.delete(taskFeatures).where(eq(taskFeatures.featureId, featureId)).run();
    if (uniqueIds.length > 0) {
      tx.insert(taskFeatures).values(uniqueIds.map((taskId) => ({ taskId, featureId }))).run();
    }
  });

  return listFeatureTasks(database, featureId);
}

export function listFeatureRelations(database: DbClient, featureId: number): FeatureRelation[] {
  ensureFeatureExists(database, featureId);
  const rows = database
    .select({
      sourceFeatureId: featureRelations.sourceFeatureId,
      targetFeatureId: featureRelations.targetFeatureId,
      relationType: featureRelations.relationType,
      description: featureRelations.description,
      createdAt: featureRelations.createdAt,
      updatedAt: featureRelations.updatedAt,
      targetId: features.id,
      targetTitle: features.title,
      targetSlug: features.slug,
      targetStatus: features.status,
      targetDescription: features.description,
      targetContentPath: features.contentPath,
      targetSortOrder: features.sortOrder,
      targetCreatedAt: features.createdAt,
      targetUpdatedAt: features.updatedAt
    })
    .from(featureRelations)
    .innerJoin(features, eq(featureRelations.targetFeatureId, features.id))
    .where(eq(featureRelations.sourceFeatureId, featureId))
    .all();
  const counts = getUseCaseCountMap(
    database,
    rows.map((row) => row.targetId)
  );

  return rows.map((row) => ({
    sourceFeatureId: row.sourceFeatureId,
    targetFeatureId: row.targetFeatureId,
    relationType: row.relationType,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    targetFeature: mapFeature(
      {
        id: row.targetId,
        title: row.targetTitle,
        slug: row.targetSlug,
        status: row.targetStatus,
        description: row.targetDescription,
        contentPath: row.targetContentPath,
        sortOrder: row.targetSortOrder,
        createdAt: row.targetCreatedAt,
        updatedAt: row.targetUpdatedAt
      },
      counts.get(row.targetId) ?? 0
    )
  }));
}

export function setFeatureRelations(database: DbClient, featureId: number, relations: FeatureRelationInput[]): FeatureRelation[] {
  ensureFeatureExists(database, featureId);
  const normalized = normalizeFeatureRelations(featureId, relations);
  ensureFeaturesExist(
    database,
    normalized.map((relation) => relation.targetFeatureId)
  );

  database.transaction((tx) => {
    tx.delete(featureRelations).where(or(eq(featureRelations.sourceFeatureId, featureId), eq(featureRelations.targetFeatureId, featureId))).run();
    if (normalized.length > 0) {
      tx.insert(featureRelations)
        .values(
          normalized.map((relation) => ({
            sourceFeatureId: featureId,
            targetFeatureId: relation.targetFeatureId,
            relationType: relation.relationType,
            description: relation.description
          }))
        )
        .run();
    }
  });

  return listFeatureRelations(database, featureId);
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

export function listUseCaseTasks(database: DbClient, useCaseId: number): Task[] {
  ensureUseCaseExists(database, useCaseId);
  return database
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      parentId: tasks.parentId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assignee: tasks.assignee,
      dueDate: tasks.dueDate,
      importKey: tasks.importKey,
      position: tasks.position,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt
    })
    .from(taskUseCases)
    .innerJoin(tasks, eq(taskUseCases.taskId, tasks.id))
    .where(eq(taskUseCases.useCaseId, useCaseId))
    .all()
    .map((task) => mapTask(database, task));
}

export function setUseCaseTasks(database: DbClient, useCaseId: number, taskIds: number[]): Task[] {
  ensureUseCaseExists(database, useCaseId);
  const uniqueIds = ensureTasksExist(database, taskIds);

  database.transaction((tx) => {
    tx.delete(taskUseCases).where(eq(taskUseCases.useCaseId, useCaseId)).run();
    if (uniqueIds.length > 0) {
      tx.insert(taskUseCases).values(uniqueIds.map((taskId) => ({ taskId, useCaseId }))).run();
    }
  });

  return listUseCaseTasks(database, useCaseId);
}
