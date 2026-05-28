import { eq, inArray } from "drizzle-orm";
import type { JsonValue } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { featureAttachments, featureComments, useCases } from "../db/schema.js";
import { assertVersion } from "../repositories/base.repository.js";
import { featureRepository, type FeatureRecord, type FeatureUpdateData } from "../repositories/feature.repository.js";
import type { JournalChangeCreateData } from "../repositories/journal.repository.js";
import { useCaseRepository } from "../repositories/use-case.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { deleteFeatureAttachmentsForIds } from "./attachments.service.js";
import { ensureCatalogEntryExists, resolveDefaultCatalogEntryKey } from "./catalogs.service.js";
import {
  deleteContent,
  readContentFromDb,
  resolveStoredContentPath,
} from "./content.service.js";
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

type FeatureStatus = FeatureRecord["status"];

export interface FeatureInput {
  title?: string;
  status?: FeatureStatus;
  description?: string | null;
  content?: string;
  sortOrder?: number;
  expectedVersion?: number;
}

export interface FeatureDto {
  id: number;
  title: string;
  status: FeatureStatus;
  description: string | null;
  content?: string;
  contentPath: string | null;
  sortOrder: number;
  version: number;
  useCaseCount: number;
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
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
  { key: "sortOrder", label: "Sortierung" }
];

function mapFeature(record: FeatureRecord, useCaseCount: number, content?: string, supportCounts = emptyFeatureSupportCounts): FeatureDto {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    description: record.description,
    content,
    contentPath: record.contentPath,
    sortOrder: record.sortOrder,
    version: record.version,
    useCaseCount,
    attachmentCount: supportCounts.attachmentCount,
    noteCount: supportCounts.noteCount,
    commentCount: supportCounts.commentCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function countUseCases(database: DbClient, featureId: number): number {
  return database.select({ id: useCases.id }).from(useCases).where(eq(useCases.featureId, featureId)).all().length;
}

function getUseCaseCounts(database: DbClient): Map<number, number> {
  const counts = new Map<number, number>();
  const rows = database.select({ featureId: useCases.featureId }).from(useCases).all();

  for (const row of rows) {
    counts.set(row.featureId, (counts.get(row.featureId) ?? 0) + 1);
  }

  return counts;
}

function getFeatureSupportCounts(database: DbClient, featureIds: number[]): Map<number, FeatureSupportCounts> {
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

  const attachmentRows = database.select({ featureId: featureAttachments.featureId }).from(featureAttachments).where(inArray(featureAttachments.featureId, featureIds)).all();
  for (const row of attachmentRows) {
    ensureCounts(row.featureId).attachmentCount += 1;
  }

  const commentRows = database.select({ featureId: featureComments.featureId }).from(featureComments).where(inArray(featureComments.featureId, featureIds)).all();
  for (const row of commentRows) {
    ensureCounts(row.featureId).commentCount += 1;
  }

  return counts;
}

function getFeatureRecord(database: DbClient, id: number): FeatureRecord {
  const feature = featureRepository.findById(database, id);
  if (!feature) {
    throw notFound(`Feature with id ${id} not found`);
  }
  return feature;
}

function readFeatureContent(database: DbClient, record: FeatureRecord): string {
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

export function listFeatures(database: DbClient): FeatureDto[] {
  const rows = featureRepository.findAll(database);
  const counts = getUseCaseCounts(database);
  const ids = rows.map((feature) => feature.id);
  const supportCounts = getFeatureSupportCounts(database, ids);

  return rows.map((feature) => mapFeature(feature, counts.get(feature.id) ?? 0, undefined, supportCounts.get(feature.id) ?? emptyFeatureSupportCounts));
}

export function getFeature(database: DbClient, id: number): FeatureDto {
  const feature = getFeatureRecord(database, id);
  const supportCounts = getFeatureSupportCounts(database, [id]).get(id) ?? emptyFeatureSupportCounts;
  return mapFeature(feature, countUseCases(database, id), readFeatureContent(database, feature), supportCounts);
}

export function createFeature(database: DbClient, input: FeatureInput, actor?: JournalActor | null): FeatureDto {
  const title = requireNonEmpty(input.title, "title");
  const status = input.status ?? resolveDefaultCatalogEntryKey(database, "featureStatus", "draft");
  ensureCatalogEntryExists(database, "featureStatus", status);

  const content = input.content ?? "";
  const created = database.transaction((tx) => {
    const feature = featureRepository.create(
      tx,
      {
        title,
        status,
        description: cleanNullable(input.description) ?? null,
        contentPath: null,
        content,
        sortOrder: input.sortOrder ?? 0
      },
      actor?.actorUserId ?? undefined
    );
      const journalObject = featureJournalObject(feature);
      recordJournalEntry(tx, {
        operation: "create",
        object: journalObject,
        summary: buildCreateSummary(journalObject),
        actor
      });
    return feature;
  });

  return mapFeature(created, 0, content);
}

export function updateFeature(database: DbClient, id: number, input: FeatureInput, actor?: JournalActor | null): FeatureDto {
  const current = getFeatureRecord(database, id);
  const previousContent = readFeatureContent(database, current);
  assertVersion(current.version, input.expectedVersion ?? 0);
  const values: FeatureUpdateData = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }

  if (input.status !== undefined) {
    ensureCatalogEntryExists(database, "featureStatus", input.status);
    values.status = input.status;
  }

  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }

  if (input.sortOrder !== undefined) {
    values.sortOrder = input.sortOrder;
  }

  if (Object.keys(values).length === 0 && input.content === undefined) {
    throw badRequest("No feature fields provided");
  }

  if (input.content !== undefined) {
    values.content = input.content;
  }

  const updated = database.transaction((tx) => {
    const feature = featureRepository.update(tx, id, input.expectedVersion ?? 0, values, actor?.actorUserId ?? undefined);
    if (!feature) {
      throw notFound(`Feature with id ${id} not found`);
    }
    const nextContent = input.content ?? previousContent;
    const journalObject = featureJournalObject(feature);
    const changes = [...buildJournalChanges(current, feature, featureJournalFields), ...buildContentChange(previousContent, nextContent)];
    recordJournalEntry(tx, {
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
  const supportCounts = getFeatureSupportCounts(database, [id]).get(id) ?? emptyFeatureSupportCounts;
  return mapFeature(updated, countUseCases(database, id), input.content ?? readFeatureContent(database, updated), supportCounts);
}

export async function deleteFeature(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const feature = getFeatureRecord(database, id);
  const linkedUseCases = useCaseRepository.findByFeatureId(database, id);

  await deleteFeatureAttachmentsForIds(database, [id]);
  database.transaction((tx) => {
    const journalObject = featureJournalObject(feature);
    recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor
    });
    featureRepository.delete(tx, id);
  });

  if (feature.contentPath) {
    deleteContent(resolveStoredContentPath(feature.contentPath));
  }

  for (const useCase of linkedUseCases) {
    if (useCase.contentPath) {
      deleteContent(resolveStoredContentPath(useCase.contentPath));
    }
  }
}
