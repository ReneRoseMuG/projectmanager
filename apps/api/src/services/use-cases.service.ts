import type { JsonValue } from "@taskmanager/shared-types";
import { eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { features, useCaseComments } from "../db/schema.js";
import { assertVersion } from "../repositories/base.repository.js";
import type { JournalChangeCreateData } from "../repositories/journal.repository.js";
import { useCaseRepository, type UseCaseRecord, type UseCaseUpdateData } from "../repositories/use-case.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import {
  buildFilename,
  buildStoredContentPath,
  deleteContent,
  readContent,
  resolveContentPath,
  resolveStoredContentPath,
  writeContent
} from "./content.service.js";
import { ensureCatalogEntryExists, resolveDefaultCatalogEntryKey } from "./catalogs.service.js";
import { cleanNullable, requireNonEmpty } from "./helpers.js";
import {
  buildCreateSummary,
  buildDeleteSummary,
  buildJournalChanges,
  buildUpdateSummary,
  makeJournalContext,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor,
  type JournalFieldDefinition,
  type JournalObjectRef
} from "./journal.service.js";

type UseCaseStatus = UseCaseRecord["status"];

export interface UseCaseInput {
  featureId?: number;
  title?: string;
  status?: UseCaseStatus;
  description?: string | null;
  content?: string;
  sortOrder?: number;
  expectedVersion?: number;
}

export interface UseCaseDto {
  id: number;
  featureId: number;
  title: string;
  status: UseCaseStatus;
  description: string | null;
  content?: string;
  contentPath: string | null;
  sortOrder: number;
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface UseCaseSupportCounts {
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
}

const emptyUseCaseSupportCounts: UseCaseSupportCounts = {
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0
};

const useCaseJournalFields: Array<JournalFieldDefinition<UseCaseRecord>> = [
  { key: "title", label: "Titel" },
  { key: "status", label: "Status" },
  { key: "description", label: "Beschreibung" },
  { key: "sortOrder", label: "Sortierung" }
];

function contentFilename(id: number): string {
  return buildFilename("usecase", id);
}

function mapUseCase(record: UseCaseRecord, content?: string, supportCounts = emptyUseCaseSupportCounts): UseCaseDto {
  return {
    id: record.id,
    featureId: record.featureId,
    title: record.title,
    status: record.status,
    description: record.description,
    content,
    contentPath: record.contentPath,
    sortOrder: record.sortOrder,
    attachmentCount: supportCounts.attachmentCount,
    noteCount: supportCounts.noteCount,
    commentCount: supportCounts.commentCount,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function getUseCaseSupportCounts(database: DbClient, useCaseIds: number[]): Map<number, UseCaseSupportCounts> {
  const counts = new Map<number, UseCaseSupportCounts>();
  if (useCaseIds.length === 0) {
    return counts;
  }

  const ensureCounts = (useCaseId: number): UseCaseSupportCounts => {
    const current = counts.get(useCaseId);
    if (current) {
      return current;
    }
    const nextCounts = { ...emptyUseCaseSupportCounts };
    counts.set(useCaseId, nextCounts);
    return nextCounts;
  };

  const commentRows = database.select({ useCaseId: useCaseComments.useCaseId }).from(useCaseComments).where(inArray(useCaseComments.useCaseId, useCaseIds)).all();
  for (const row of commentRows) {
    ensureCounts(row.useCaseId).commentCount += 1;
  }

  return counts;
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

function getUseCaseRecord(database: DbClient, id: number): UseCaseRecord {
  const useCase = useCaseRepository.findById(database, id);
  if (!useCase) {
    throw notFound(`Use case with id ${id} not found`);
  }
  return useCase;
}

function readUseCaseContent(record: UseCaseRecord): string {
  return record.contentPath ? readContent(resolveStoredContentPath(record.contentPath)) : "";
}

function useCaseJournalObject(record: UseCaseRecord): JournalObjectRef {
  return makeJournalObject("useCase", record.id, record.title);
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

export function listUseCases(database: DbClient, featureId: number): UseCaseDto[] {
  ensureFeatureExists(database, featureId);
  const rows = useCaseRepository.findByFeatureId(database, featureId);
  const ids = rows.map((useCase) => useCase.id);
  const supportCounts = getUseCaseSupportCounts(database, ids);
  return rows.map((useCase) => mapUseCase(useCase, undefined, supportCounts.get(useCase.id) ?? emptyUseCaseSupportCounts));
}

export function getUseCase(database: DbClient, id: number): UseCaseDto {
  const useCase = getUseCaseRecord(database, id);
  const supportCounts = getUseCaseSupportCounts(database, [id]).get(id) ?? emptyUseCaseSupportCounts;
  return mapUseCase(useCase, readUseCaseContent(useCase), supportCounts);
}

export function createUseCase(database: DbClient, featureId: number, input: UseCaseInput, actor?: JournalActor | null): UseCaseDto {
  const targetFeatureId = input.featureId ?? featureId;
  const featureObject = getFeatureJournalObject(database, targetFeatureId);
  const title = requireNonEmpty(input.title, "title");
  const status = input.status ?? resolveDefaultCatalogEntryKey(database, "featureStatus", "draft");
  ensureCatalogEntryExists(database, "featureStatus", status);

  const created = useCaseRepository.create(
    database,
    {
      featureId: targetFeatureId,
      title,
      status,
      description: cleanNullable(input.description) ?? null,
      contentPath: null,
      sortOrder: input.sortOrder ?? 0
    },
    actor?.actorUserId ?? undefined
  );

  const filename = contentFilename(created.id);
  const absolutePath = resolveContentPath("usecases", filename);
  const storedPath = buildStoredContentPath("usecases", filename);

  try {
    writeContent(absolutePath, input.content ?? "");
    const updated = database.transaction((tx) => {
      const useCase = useCaseRepository.setContentPath(tx, created.id, storedPath);
      if (!useCase) {
        throw notFound(`Use case with id ${created.id} not found`);
      }
      const journalObject = useCaseJournalObject(useCase);
      recordJournalEntry(tx, {
        operation: "create",
        object: journalObject,
        summary: buildCreateSummary(journalObject),
        actor,
        contexts: [makeJournalContext(featureObject, "owner")]
      });
      return useCase;
    });
    if (!updated) {
      throw notFound(`Use case with id ${created.id} not found`);
    }

    return mapUseCase(updated, input.content ?? "");
  } catch (error) {
    useCaseRepository.delete(database, created.id);
    deleteContent(absolutePath);
    throw error;
  }
}

export function updateUseCase(database: DbClient, id: number, input: UseCaseInput, actor?: JournalActor | null): UseCaseDto {
  const current = getUseCaseRecord(database, id);
  const previousContent = readUseCaseContent(current);
  assertVersion(current.version, input.expectedVersion ?? 0);
  const values: UseCaseUpdateData = {};
  let contentPath = current.contentPath;

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.featureId !== undefined) {
    ensureFeatureExists(database, input.featureId);
    values.featureId = input.featureId;
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
    throw badRequest("No use case fields provided");
  }

  if (!contentPath) {
    const nextFilename = contentFilename(id);
    const nextAbsolutePath = resolveContentPath("usecases", nextFilename);
    const nextStoredPath = buildStoredContentPath("usecases", nextFilename);

    writeContent(nextAbsolutePath, "");
    contentPath = nextStoredPath;
    values.contentPath = nextStoredPath;
  }

  if (input.content !== undefined) {
    if (!contentPath) {
      throw badRequest("Use case content path is missing");
    }
    writeContent(resolveStoredContentPath(contentPath), input.content);
  }

  const updated = database.transaction((tx) => {
    const useCase = useCaseRepository.update(tx, id, input.expectedVersion ?? 0, values, actor?.actorUserId ?? undefined);
    if (!useCase) {
      throw notFound(`Use case with id ${id} not found`);
    }
    const featureField: JournalFieldDefinition<UseCaseRecord> = {
      key: "featureId",
      label: "Feature",
      format: (value) => (typeof value === "number" ? getFeatureJournalObject(database, value).label : null)
    };
    const nextContent = input.content ?? previousContent;
    const journalObject = useCaseJournalObject(useCase);
    const changes = [...buildJournalChanges(current, useCase, [featureField, ...useCaseJournalFields]), ...buildContentChange(previousContent, nextContent)];
    recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes,
      contexts: [makeJournalContext(getFeatureJournalObject(database, useCase.featureId), "owner")]
    });
    return useCase;
  });
  if (!updated) {
    throw notFound(`Use case with id ${id} not found`);
  }
  const supportCounts = getUseCaseSupportCounts(database, [id]).get(id) ?? emptyUseCaseSupportCounts;
  return mapUseCase(updated, input.content ?? readUseCaseContent(updated), supportCounts);
}

export function deleteUseCase(database: DbClient, id: number, actor?: JournalActor | null): void {
  const useCase = getUseCaseRecord(database, id);
  const featureObject = getFeatureJournalObject(database, useCase.featureId);
  database.transaction((tx) => {
    const journalObject = useCaseJournalObject(useCase);
    recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: [makeJournalContext(featureObject, "owner")]
    });
    useCaseRepository.delete(tx, id);
  });

  if (useCase.contentPath) {
    deleteContent(resolveStoredContentPath(useCase.contentPath));
  }
}
