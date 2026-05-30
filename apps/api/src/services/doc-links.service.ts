import type { FeatureRelation, FeatureRelationInput, JsonValue } from "@taskmanager/shared-types";
import { eq, inArray, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { featureRelations, features, milestoneFeatures, milestones, projectFeatures, projects, useCases } from "../db/schema.js";
import { firstRow } from "../db/query-utils.js";
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
import { getUserOption } from "./users.service.js";

type MappableFeatureRecord = Pick<
  typeof features.$inferSelect,
  "id" | "title" | "status" | "description" | "sortOrder" | "responsibleUserId" | "version" | "createdAt" | "updatedAt"
>;

type FeatureReference = Pick<typeof features.$inferSelect, "id" | "title">;

async function mapFeature(database: DbClient, row: MappableFeatureRecord, useCaseCount = 0): Promise<FeatureDto> {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    description: row.description,
    sortOrder: row.sortOrder,
    responsibleUserId: row.responsibleUserId,
    responsibleUser: await getUserOption(database, row.responsibleUserId),
    version: row.version,
    useCaseCount,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function ensureProjectExists(database: DbClient, projectId: number): Promise<void> {
  const project = firstRow(await database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)));
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

async function getProjectJournalObject(database: DbClient, projectId: number): Promise<JournalObjectRef> {
  const project = firstRow(await database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)));
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
  return makeJournalObject("project", project.id, project.name);
}

async function ensureMilestoneExists(database: DbClient, milestoneId: number): Promise<void> {
  const milestone = firstRow(await database.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, milestoneId)));
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
}

async function getMilestoneJournalObject(database: DbClient, milestoneId: number): Promise<JournalObjectRef> {
  const milestone = firstRow(await database.select({ id: milestones.id, name: milestones.name }).from(milestones).where(eq(milestones.id, milestoneId)));
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
  return makeJournalObject("milestone", milestone.id, milestone.name);
}

async function ensureFeatureExists(database: DbClient, featureId: number): Promise<void> {
  const feature = firstRow(await database.select({ id: features.id }).from(features).where(eq(features.id, featureId)));
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

async function getFeatureJournalObject(database: DbClient, featureId: number): Promise<JournalObjectRef> {
  const feature = firstRow(await database.select({ id: features.id, title: features.title }).from(features).where(eq(features.id, featureId)));
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
  return makeJournalObject("feature", feature.id, feature.title);
}

async function ensureFeaturesExist(database: DbClient, featureIds: number[]): Promise<number[]> {
  const uniqueIds = [...new Set(featureIds)];
  if (uniqueIds.length === 0) {
    return [];
  }

  const found = await database.select({ id: features.id }).from(features).where(inArray(features.id, uniqueIds));
  const foundIds = new Set(found.map((row) => row.id));
  const invalidIds = uniqueIds.filter((id) => !foundIds.has(id));

  if (invalidIds.length > 0) {
    throw badRequest(`Invalid featureIds: ${invalidIds.join(", ")}`);
  }

  return uniqueIds;
}

async function findFeatureReferences(database: DbClient, featureIds: number[]): Promise<FeatureReference[]> {
  const uniqueIds = [...new Set(featureIds)];
  if (uniqueIds.length === 0) {
    return [];
  }
  return database.select({ id: features.id, title: features.title }).from(features).where(inArray(features.id, uniqueIds));
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

async function getUseCaseCountMap(database: DbClient, featureIds: number[]): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (featureIds.length === 0) {
    return counts;
  }

  const rows = await database.select({ featureId: useCases.featureId }).from(useCases).where(inArray(useCases.featureId, featureIds));
  for (const row of rows) {
    counts.set(row.featureId, (counts.get(row.featureId) ?? 0) + 1);
  }

  return counts;
}

export async function listProjectFeatures(database: DbClient, projectId: number): Promise<FeatureDto[]> {
  await ensureProjectExists(database, projectId);
  const rows = await database
    .select({
      id: features.id,
      title: features.title,
      status: features.status,
      description: features.description,
      sortOrder: features.sortOrder,
      responsibleUserId: features.responsibleUserId,
      version: features.version,
      createdAt: features.createdAt,
      updatedAt: features.updatedAt
    })
    .from(projectFeatures)
    .innerJoin(features, eq(projectFeatures.featureId, features.id))
    .where(eq(projectFeatures.projectId, projectId));
  const counts = await getUseCaseCountMap(database, rows.map((row) => row.id));

  return Promise.all(rows.map((row) => mapFeature(database, row, counts.get(row.id) ?? 0)));
}

export async function setProjectFeatures(database: DbClient, projectId: number, featureIds: number[], actor?: JournalActor | null): Promise<FeatureDto[]> {
  const ownerObject = await getProjectJournalObject(database, projectId);
  const uniqueIds = await ensureFeaturesExist(database, featureIds);
  const before = (await listProjectFeatures(database, projectId)).map((feature) => ({ id: feature.id, title: feature.title }));
  const after = await findFeatureReferences(database, uniqueIds);

  await database.transaction(async (tx) => {
    await tx.delete(projectFeatures).where(eq(projectFeatures.projectId, projectId));
    if (uniqueIds.length > 0) {
      await tx.insert(projectFeatures).values(uniqueIds.map((featureId) => ({ projectId, featureId })));
    }
    const changes = buildFeatureSetChange(before, after);
    await recordJournalEntry(tx, {
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

export async function listMilestoneFeatures(database: DbClient, milestoneId: number): Promise<FeatureDto[]> {
  await ensureMilestoneExists(database, milestoneId);
  const rows = await database
    .select({
      id: features.id,
      title: features.title,
      status: features.status,
      description: features.description,
      sortOrder: features.sortOrder,
      responsibleUserId: features.responsibleUserId,
      version: features.version,
      createdAt: features.createdAt,
      updatedAt: features.updatedAt
    })
    .from(milestoneFeatures)
    .innerJoin(features, eq(milestoneFeatures.featureId, features.id))
    .where(eq(milestoneFeatures.milestoneId, milestoneId));
  const counts = await getUseCaseCountMap(database, rows.map((row) => row.id));

  return Promise.all(rows.map((row) => mapFeature(database, row, counts.get(row.id) ?? 0)));
}

export async function setMilestoneFeatures(database: DbClient, milestoneId: number, featureIds: number[], actor?: JournalActor | null): Promise<FeatureDto[]> {
  const ownerObject = await getMilestoneJournalObject(database, milestoneId);
  const uniqueIds = await ensureFeaturesExist(database, featureIds);
  const before = (await listMilestoneFeatures(database, milestoneId)).map((feature) => ({ id: feature.id, title: feature.title }));
  const after = await findFeatureReferences(database, uniqueIds);

  await database.transaction(async (tx) => {
    await tx.delete(milestoneFeatures).where(eq(milestoneFeatures.milestoneId, milestoneId));
    if (uniqueIds.length > 0) {
      await tx.insert(milestoneFeatures).values(uniqueIds.map((featureId) => ({ milestoneId, featureId })));
    }
    const changes = buildFeatureSetChange(before, after);
    await recordJournalEntry(tx, {
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

export async function listFeatureRelations(database: DbClient, featureId: number): Promise<FeatureRelation[]> {
  await ensureFeatureExists(database, featureId);
  const rows = await database
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
      targetSortOrder: features.sortOrder,
      targetResponsibleUserId: features.responsibleUserId,
      targetVersion: features.version,
      targetCreatedAt: features.createdAt,
      targetUpdatedAt: features.updatedAt
    })
    .from(featureRelations)
    .innerJoin(features, eq(featureRelations.targetFeatureId, features.id))
    .where(eq(featureRelations.sourceFeatureId, featureId));
  const counts = await getUseCaseCountMap(
    database,
    rows.map((row) => row.targetId)
  );

  return Promise.all(rows.map(async (row) => ({
    sourceFeatureId: row.sourceFeatureId,
    targetFeatureId: row.targetFeatureId,
    relationType: row.relationType,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    targetFeature: await mapFeature(
      database,
      {
        id: row.targetId,
        title: row.targetTitle,
        status: row.targetStatus,
        description: row.targetDescription,
        sortOrder: row.targetSortOrder,
        responsibleUserId: row.targetResponsibleUserId,
        version: row.targetVersion,
        createdAt: row.targetCreatedAt,
        updatedAt: row.targetUpdatedAt
      },
      counts.get(row.targetId) ?? 0
    )
  })));
}

export async function setFeatureRelations(database: DbClient, featureId: number, relations: FeatureRelationInput[], actor?: JournalActor | null): Promise<FeatureRelation[]> {
  const ownerObject = await getFeatureJournalObject(database, featureId);
  const beforeRelations = (await listFeatureRelations(database, featureId)).map((relation) => ({
    targetFeatureId: relation.targetFeatureId,
    relationType: relation.relationType,
    description: relation.description
  }));
  const normalized = normalizeFeatureRelations(featureId, relations);
  await ensureFeaturesExist(
    database,
    normalized.map((relation) => relation.targetFeatureId)
  );
  const relatedFeatures = await findFeatureReferences(database, [
    ...beforeRelations.map((relation) => relation.targetFeatureId),
    ...normalized.map((relation) => relation.targetFeatureId)
  ]);
  const featureById = new Map(relatedFeatures.map((feature) => [feature.id, feature]));

  await database.transaction(async (tx) => {
    await tx.delete(featureRelations).where(or(eq(featureRelations.sourceFeatureId, featureId), eq(featureRelations.targetFeatureId, featureId)));
    if (normalized.length > 0) {
      await tx.insert(featureRelations)
        .values(
          normalized.map((relation) => ({
            sourceFeatureId: featureId,
            targetFeatureId: relation.targetFeatureId,
            relationType: relation.relationType,
            description: relation.description
          }))
        );
    }
    const changes = buildRelationSetChange(beforeRelations, normalized, featureById);
    const contexts = await Promise.all(normalized.map(async (relation) => makeJournalContext(await getFeatureJournalObject(database, relation.targetFeatureId), "related")));
    await recordJournalEntry(tx, {
      operation: "update",
      object: ownerObject,
      summary: buildUpdateSummary(ownerObject, changes),
      actor,
      changes,
      contexts
    });
  });

  return listFeatureRelations(database, featureId);
}
