import { eq, inArray } from "drizzle-orm";
import type { JsonValue, UserSummary, VisibleParentContext } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { featureAttachments, featureComments, milestoneFeatures, milestones, projectFeatures, projects, useCases } from "../db/schema.js";
import { assertVersion } from "../repositories/base.repository.js";
import { featureRepository, type FeatureRecord, type FeatureUpdateData } from "../repositories/feature.repository.js";
import type { JournalChangeCreateData } from "../repositories/journal.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { deleteFeatureCommentsForIds, deleteUseCaseCommentsForIds } from "./comments.service.js";import { ensureCatalogEntryExists, resolveDefaultCatalogEntryKey } from "./catalogs.service.js";
import { readContentFromDb } from "./content.service.js";
import { cleanNullable, requireNonEmpty } from "./helpers.js";
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
import { getUserOption, normalizeAssignableUserId } from "./users.service.js";

type FeatureStatus = FeatureRecord["status"];

export interface FeatureInput {
  title?: string;
  status?: FeatureStatus;
  description?: string | null;
  content?: string;
  sortOrder?: number;
  responsibleUserId?: number | null;
  expectedVersion?: number;
}

export interface FeatureDto {
  id: number;
  title: string;
  status: FeatureStatus;
  description: string | null;
  content?: string;
  sortOrder: number;
  responsibleUserId: number | null;
  responsibleUser: UserSummary | null;
  version: number;
  useCaseCount: number;
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  parentContexts?: VisibleParentContext[];
}

interface FeatureSupportCounts {
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
}

const emptyFeatureSupportCounts: FeatureSupportCounts = {
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0
};

const featureJournalFields: Array<JournalFieldDefinition<FeatureRecord>> = [
  { key: "title", label: "Titel" },
  { key: "status", label: "Status" },
  { key: "description", label: "Beschreibung" },
  { key: "sortOrder", label: "Sortierung" },
  { key: "responsibleUserId", label: "Verantwortlich" }
];

async function mapFeature(database: DbClient, record: FeatureRecord, useCaseCount: number, content?: string, supportCounts = emptyFeatureSupportCounts, parentContexts?: VisibleParentContext[]): Promise<FeatureDto> {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    description: record.description,
    content,
    sortOrder: record.sortOrder,
    responsibleUserId: record.responsibleUserId,
    responsibleUser: await getUserOption(database, record.responsibleUserId),
    version: record.version,
    useCaseCount,
    attachmentCount: supportCounts.attachmentCount,
    noteCount: supportCounts.noteCount,
    commentCount: supportCounts.commentCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    parentContexts
  };
}

async function featureParentContexts(database: DbClient, featureId: number): Promise<VisibleParentContext[]> {
  const projectRows = await database
    .select({ id: projects.id, label: projects.name })
    .from(projectFeatures)
    .innerJoin(projects, eq(projectFeatures.projectId, projects.id))
    .where(eq(projectFeatures.featureId, featureId));
  const milestoneRows = await database
    .select({ id: milestones.id, label: milestones.name })
    .from(milestoneFeatures)
    .innerJoin(milestones, eq(milestoneFeatures.milestoneId, milestones.id))
    .where(eq(milestoneFeatures.featureId, featureId));

  return [
    ...projectRows.map((row): VisibleParentContext => ({ type: "project", id: row.id, label: row.label, origin: "direct" })),
    ...milestoneRows.map((row): VisibleParentContext => ({ type: "milestone", id: row.id, label: row.label, origin: "direct" }))
  ];
}

async function countUseCases(database: DbClient, featureId: number): Promise<number> {
  return (await database.select({ id: useCases.id }).from(useCases).where(eq(useCases.featureId, featureId))).length;
}

async function getUseCaseCounts(database: DbClient): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  const rows = await database.select({ featureId: useCases.featureId }).from(useCases);

  for (const row of rows) {
    counts.set(row.featureId, (counts.get(row.featureId) ?? 0) + 1);
  }

  return counts;
}

async function getFeatureSupportCounts(database: DbClient, featureIds: number[]): Promise<Map<number, FeatureSupportCounts>> {
  const counts = new Map<number, FeatureSupportCounts>();
  if (featureIds.length === 0) {
    return counts;
  }

  const ensureCounts = (featureId: number): FeatureSupportCounts => {
    const current = counts.get(featureId);
    if (current) {
      return current;
    }
    const nextCounts = { ...emptyFeatureSupportCounts };
    counts.set(featureId, nextCounts);
    return nextCounts;
  };

  const [attachmentRows, commentRows] = await Promise.all([
    database.select({ featureId: featureAttachments.featureId }).from(featureAttachments).where(inArray(featureAttachments.featureId, featureIds)),
    database.select({ featureId: featureComments.featureId }).from(featureComments).where(inArray(featureComments.featureId, featureIds))
  ]);
  for (const row of attachmentRows) {
    ensureCounts(row.featureId).attachmentCount += 1;
  }
  for (const row of commentRows) {
    ensureCounts(row.featureId).commentCount += 1;
  }

  return counts;
}

async function getFeatureRecord(database: DbClient, id: number): Promise<FeatureRecord> {
  const feature = await featureRepository.findById(database, id);
  if (!feature) {
    throw notFound(`Feature with id ${id} not found`);
  }
  return feature;
}

async function readFeatureContent(database: DbClient, record: FeatureRecord): Promise<string> {
  return readContentFromDb(database, record.id, "features");
}

function featureJournalObject(record: FeatureRecord): JournalObjectRef {
  return makeJournalObject("feature", record.id, record.title);
}

function contentValueLabel(value: string): string | null {
  return value.trim() === "" ? null : `${value.length} Zeichen`;
}

function contentValue(value: string): JsonValue {
  return { length: value.length };
}

function buildContentChange(before: string, after: string): JournalChangeCreateData[] {
  if (before === after) {
    return [];
  }
  const oldValueLabel = contentValueLabel(before);
  const newValueLabel = contentValueLabel(after);
  return [
    {
      fieldKey: "content",
      fieldLabel: "Inhalt",
      oldValue: contentValue(before),
      oldValueLabel,
      newValue: contentValue(after),
      newValueLabel,
      summary: `Inhalt: ${oldValueLabel ?? "leer"} → ${newValueLabel ?? "leer"}`
    }
  ];
}

export async function listFeatures(database: DbClient): Promise<FeatureDto[]> {
  const rows = await featureRepository.findAll(database);
  const counts = await getUseCaseCounts(database);
  const ids = rows.map((feature) => feature.id);
  const supportCounts = await getFeatureSupportCounts(database, ids);

  return Promise.all(rows.map((feature) => mapFeature(database, feature, counts.get(feature.id) ?? 0, undefined, supportCounts.get(feature.id) ?? emptyFeatureSupportCounts)));
}

export async function getFeature(database: DbClient, id: number): Promise<FeatureDto> {
  const feature = await getFeatureRecord(database, id);
  const supportCounts = (await getFeatureSupportCounts(database, [id])).get(id) ?? emptyFeatureSupportCounts;
  return mapFeature(database, feature, await countUseCases(database, id), await readFeatureContent(database, feature), supportCounts, await featureParentContexts(database, id));
}

export async function createFeature(database: DbClient, input: FeatureInput, actor?: JournalActor | null): Promise<FeatureDto> {
  const title = requireNonEmpty(input.title, "title");
  const status = input.status ?? await resolveDefaultCatalogEntryKey(database, "featureStatus", "draft");
  await ensureCatalogEntryExists(database, "featureStatus", status);

  const content = input.content ?? "";
  const created = await database.transaction(async (tx) => {
    const feature = await featureRepository.create(
      tx,
      {
        title,
        status,
        description: cleanNullable(input.description) ?? null,
        content,
        sortOrder: input.sortOrder ?? 0,
        responsibleUserId: await normalizeAssignableUserId(tx, input.responsibleUserId ?? actor?.actorUserId ?? null, "responsibleUserId")
      },
      actor?.actorUserId ?? undefined
    );
      const journalObject = featureJournalObject(feature);
      await recordJournalEntry(tx, {
        operation: "create",
        object: journalObject,
        summary: buildCreateSummary(journalObject),
        actor
      });
    return feature;
  });

  return mapFeature(database, created, 0, content);
}

export async function updateFeature(database: DbClient, id: number, input: FeatureInput, actor?: JournalActor | null): Promise<FeatureDto> {
  const current = await getFeatureRecord(database, id);
  const previousContent = await readFeatureContent(database, current);
  assertVersion(current.version, input.expectedVersion ?? 0);
  const values: FeatureUpdateData = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }

  if (input.status !== undefined) {
    await ensureCatalogEntryExists(database, "featureStatus", input.status);
    values.status = input.status;
  }

  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }

  if (input.sortOrder !== undefined) {
    values.sortOrder = input.sortOrder;
  }

  if (input.responsibleUserId !== undefined) {
    values.responsibleUserId = await normalizeAssignableUserId(database, input.responsibleUserId, "responsibleUserId");
  }

  if (Object.keys(values).length === 0 && input.content === undefined) {
    throw badRequest("No feature fields provided");
  }

  if (input.content !== undefined) {
    values.content = input.content;
  }

  const updated = await database.transaction(async (tx) => {
    const feature = await featureRepository.update(tx, id, input.expectedVersion ?? 0, values, actor?.actorUserId ?? undefined);
    if (!feature) {
      throw notFound(`Feature with id ${id} not found`);
    }
    const nextContent = input.content ?? previousContent;
    const journalObject = featureJournalObject(feature);
    const changes = [...buildJournalChanges(current, feature, featureJournalFields), ...buildContentChange(previousContent, nextContent)];
    await recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes
    });
    return feature;
  });
  if (!updated) {
    throw notFound(`Feature with id ${id} not found`);
  }
  const supportCounts = (await getFeatureSupportCounts(database, [id])).get(id) ?? emptyFeatureSupportCounts;
  return mapFeature(database, updated, await countUseCases(database, id), input.content ?? await readFeatureContent(database, updated), supportCounts);
}

export async function deleteFeature(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const feature = await getFeatureRecord(database, id);

  await deleteFeatureCommentsForIds(database, [id]);
  // Also delete use case comments since use cases are cascade-deleted with the feature
  const ucRows = await database.select({ id: useCases.id }).from(useCases).where(eq(useCases.featureId, id));
  if (ucRows.length > 0) await deleteUseCaseCommentsForIds(database, ucRows.map(r => r.id));
  await database.transaction(async (tx) => {
    const journalObject = featureJournalObject(feature);
    await recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor
    });
    await featureRepository.delete(tx, id);
  });
}
