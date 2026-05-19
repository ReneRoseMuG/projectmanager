import type { FeatureRelation, FeatureRelationInput } from "@taskmanager/shared-types";
import { eq, inArray, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { featureRelations, features, milestoneFeatures, milestones, projectFeatures, projects, useCases } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import type { FeatureDto } from "./features.service.js";

type MappableFeatureRecord = Pick<
  typeof features.$inferSelect,
  "id" | "title" | "slug" | "status" | "description" | "contentPath" | "sortOrder" | "version" | "createdAt" | "updatedAt"
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
    version: row.version,
    useCaseCount,
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

function ensureMilestoneExists(database: DbClient, milestoneId: number): void {
  const milestone = database.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
}

function ensureFeatureExists(database: DbClient, featureId: number): void {
  const feature = database.select({ id: features.id }).from(features).where(eq(features.id, featureId)).get();
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
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
      version: features.version,
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

export function listMilestoneFeatures(database: DbClient, milestoneId: number): FeatureDto[] {
  ensureMilestoneExists(database, milestoneId);
  const rows = database
    .select({
      id: features.id,
      title: features.title,
      slug: features.slug,
      status: features.status,
      description: features.description,
      contentPath: features.contentPath,
      sortOrder: features.sortOrder,
      version: features.version,
      createdAt: features.createdAt,
      updatedAt: features.updatedAt
    })
    .from(milestoneFeatures)
    .innerJoin(features, eq(milestoneFeatures.featureId, features.id))
    .where(eq(milestoneFeatures.milestoneId, milestoneId))
    .all();
  const counts = getUseCaseCountMap(database, rows.map((row) => row.id));

  return rows.map((row) => mapFeature(row, counts.get(row.id) ?? 0));
}

export function setMilestoneFeatures(database: DbClient, milestoneId: number, featureIds: number[]): FeatureDto[] {
  ensureMilestoneExists(database, milestoneId);
  const uniqueIds = ensureFeaturesExist(database, featureIds);

  database.transaction((tx) => {
    tx.delete(milestoneFeatures).where(eq(milestoneFeatures.milestoneId, milestoneId)).run();
    if (uniqueIds.length > 0) {
      tx.insert(milestoneFeatures).values(uniqueIds.map((featureId) => ({ milestoneId, featureId }))).run();
    }
  });

  return listMilestoneFeatures(database, milestoneId);
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
      targetVersion: features.version,
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
        version: row.targetVersion,
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

