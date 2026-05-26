import type { FeatureRelation, FeatureRelationInput, JsonValue } from "@taskmanager/shared-types";
import { eq, inArray, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { featureRelations, features, milestoneFeatures, milestones, projectFeatures, projects, useCases } from "../db/schema.js";
import type { JournalChangeCreateData } from "../repositories/journal.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import type { FeatureDto } from "./features.service.js";
import {
  buildUpdateSummary,
  makeJournalContext,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor,
  type JournalObjectRef
} from "./journal.service.js";

type MappableFeatureRecord = Pick<
  typeof features.$inferSelect,
  "id" | "title" | "status" | "description" | "contentPath" | "sortOrder" | "version" | "createdAt" | "updatedAt"
>;

type FeatureReference = Pick<typeof features.$inferSelect, "id" | "title">;

function mapFeature(row: MappableFeatureRecord, useCaseCount = 0): FeatureDto {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    description: row.description,
    contentPath: row.contentPath,
    sortOrder: row.sortOrder,
    version: row.version,
    useCaseCount,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
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

function getProjectJournalObject(database: DbClient, projectId: number): JournalObjectRef {
  const project = database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
  return makeJournalObject("project", project.id, project.name);
}

function ensureMilestoneExists(database: DbClient, milestoneId: number): void {
  const milestone = database.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
}

function getMilestoneJournalObject(database: DbClient, milestoneId: number): JournalObjectRef {
  const milestone = database.select({ id: milestones.id, name: milestones.name }).from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
  return makeJournalObject("milestone", milestone.id, milestone.name);
}

function ensureFeatureExists(database: DbClient, featureId: number): void {
  const feature = database.select({ id: features.id }).from(features).where(eq(features.id, featureId)).get();
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

function getFeatureJournalObject(database: DbClient, featureId: number): JournalObjectRef {
  const feature = database.select({ id: features.id, title: features.title }).from(features).where(eq(features.id, featureId)).get();
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
  return makeJournalObject("feature", feature.id, feature.title);
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

function findFeatureReferences(database: DbClient, featureIds: number[]): FeatureReference[] {
  const uniqueIds = [...new Set(featureIds)];
  if (uniqueIds.length === 0) {
    return [];
  }
  return database.select({ id: features.id, title: features.title }).from(features).where(inArray(features.id, uniqueIds)).all();
}

function featureListLabel(records: FeatureReference[]): string | null {
  if (records.length === 0) {
    return null;
  }
  return records
    .map((record) => record.title)
    .sort((left, right) => left.localeCompare(right, "de"))
    .join(", ");
}

function featureListValue(records: FeatureReference[]): JsonValue {
  return records.map((record) => record.id).sort((left, right) => left - right);
}

function buildFeatureSetChange(before: FeatureReference[], after: FeatureReference[]): JournalChangeCreateData[] {
  if (JSON.stringify(featureListValue(before)) === JSON.stringify(featureListValue(after))) {
    return [];
  }
  const oldValueLabel = featureListLabel(before);
  const newValueLabel = featureListLabel(after);
  return [
    {
      fieldKey: "features",
      fieldLabel: "Features",
      oldValue: featureListValue(before),
      oldValueLabel,
      newValue: featureListValue(after),
      newValueLabel,
      summary: `Features: ${oldValueLabel ?? "leer"} → ${newValueLabel ?? "leer"}`
    }
  ];
}

function relationLabel(relation: Required<FeatureRelationInput>, featureById: Map<number, FeatureReference>): string {
  return `${relation.relationType}: ${featureById.get(relation.targetFeatureId)?.title ?? `Feature ${relation.targetFeatureId}`}`;
}

function relationValue(relations: Array<Required<FeatureRelationInput>>): JsonValue {
  return relations
    .map((relation) => ({
      targetFeatureId: relation.targetFeatureId,
      relationType: relation.relationType,
      description: relation.description
    }))
    .sort((left, right) => `${left.targetFeatureId}:${left.relationType}`.localeCompare(`${right.targetFeatureId}:${right.relationType}`));
}

function relationListLabel(relations: Array<Required<FeatureRelationInput>>, featureById: Map<number, FeatureReference>): string | null {
  if (relations.length === 0) {
    return null;
  }
  return relations
    .map((relation) => relationLabel(relation, featureById))
    .sort((left, right) => left.localeCompare(right, "de"))
    .join(", ");
}

function buildRelationSetChange(
  before: Array<Required<FeatureRelationInput>>,
  after: Array<Required<FeatureRelationInput>>,
  featureById: Map<number, FeatureReference>
): JournalChangeCreateData[] {
  if (JSON.stringify(relationValue(before)) === JSON.stringify(relationValue(after))) {
    return [];
  }
  const oldValueLabel = relationListLabel(before, featureById);
  const newValueLabel = relationListLabel(after, featureById);
  return [
    {
      fieldKey: "relations",
      fieldLabel: "Feature-Beziehungen",
      oldValue: relationValue(before),
      oldValueLabel,
      newValue: relationValue(after),
      newValueLabel,
      summary: `Feature-Beziehungen: ${oldValueLabel ?? "leer"} → ${newValueLabel ?? "leer"}`
    }
  ];
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

export function setProjectFeatures(database: DbClient, projectId: number, featureIds: number[], actor?: JournalActor | null): FeatureDto[] {
  const ownerObject = getProjectJournalObject(database, projectId);
  const uniqueIds = ensureFeaturesExist(database, featureIds);
  const before = listProjectFeatures(database, projectId).map((feature) => ({ id: feature.id, title: feature.title }));
  const after = findFeatureReferences(database, uniqueIds);

  database.transaction((tx) => {
    tx.delete(projectFeatures).where(eq(projectFeatures.projectId, projectId)).run();
    if (uniqueIds.length > 0) {
      tx.insert(projectFeatures).values(uniqueIds.map((featureId) => ({ projectId, featureId }))).run();
    }
    const changes = buildFeatureSetChange(before, after);
    recordJournalEntry(tx, {
      operation: "update",
      object: ownerObject,
      summary: buildUpdateSummary(ownerObject, changes),
      actor,
      changes,
      contexts: after.map((feature) => makeJournalContext(makeJournalObject("feature", feature.id, feature.title), "related"))
    });
  });

  return listProjectFeatures(database, projectId);
}

export function listMilestoneFeatures(database: DbClient, milestoneId: number): FeatureDto[] {
  ensureMilestoneExists(database, milestoneId);
  const rows = database
    .select({
      id: features.id,
      title: features.title,
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

export function setMilestoneFeatures(database: DbClient, milestoneId: number, featureIds: number[], actor?: JournalActor | null): FeatureDto[] {
  const ownerObject = getMilestoneJournalObject(database, milestoneId);
  const uniqueIds = ensureFeaturesExist(database, featureIds);
  const before = listMilestoneFeatures(database, milestoneId).map((feature) => ({ id: feature.id, title: feature.title }));
  const after = findFeatureReferences(database, uniqueIds);

  database.transaction((tx) => {
    tx.delete(milestoneFeatures).where(eq(milestoneFeatures.milestoneId, milestoneId)).run();
    if (uniqueIds.length > 0) {
      tx.insert(milestoneFeatures).values(uniqueIds.map((featureId) => ({ milestoneId, featureId }))).run();
    }
    const changes = buildFeatureSetChange(before, after);
    recordJournalEntry(tx, {
      operation: "update",
      object: ownerObject,
      summary: buildUpdateSummary(ownerObject, changes),
      actor,
      changes,
      contexts: after.map((feature) => makeJournalContext(makeJournalObject("feature", feature.id, feature.title), "related"))
    });
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

export function setFeatureRelations(database: DbClient, featureId: number, relations: FeatureRelationInput[], actor?: JournalActor | null): FeatureRelation[] {
  const ownerObject = getFeatureJournalObject(database, featureId);
  const beforeRelations = listFeatureRelations(database, featureId).map((relation) => ({
    targetFeatureId: relation.targetFeatureId,
    relationType: relation.relationType,
    description: relation.description
  }));
  const normalized = normalizeFeatureRelations(featureId, relations);
  ensureFeaturesExist(
    database,
    normalized.map((relation) => relation.targetFeatureId)
  );
  const relatedFeatures = findFeatureReferences(database, [
    ...beforeRelations.map((relation) => relation.targetFeatureId),
    ...normalized.map((relation) => relation.targetFeatureId)
  ]);
  const featureById = new Map(relatedFeatures.map((feature) => [feature.id, feature]));

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
    const changes = buildRelationSetChange(beforeRelations, normalized, featureById);
    recordJournalEntry(tx, {
      operation: "update",
      object: ownerObject,
      summary: buildUpdateSummary(ownerObject, changes),
      actor,
      changes,
      contexts: normalized.map((relation) => makeJournalContext(getFeatureJournalObject(database, relation.targetFeatureId), "related"))
    });
  });

  return listFeatureRelations(database, featureId);
}

