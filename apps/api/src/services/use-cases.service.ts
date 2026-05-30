import type { JsonValue, UserSummary, VisibleParentContext } from "@taskmanager/shared-types";
import { eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import { features, useCaseComments } from "../db/schema.js";
import { assertVersion } from "../repositories/base.repository.js";
import type { JournalChangeCreateData } from "../repositories/journal.repository.js";
import { useCaseRepository, type UseCaseRecord, type UseCaseUpdateData } from "../repositories/use-case.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { deleteUseCaseCommentsForIds } from "./comments.service.js";
import { readContentFromDb } from "./content.service.js";
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
import { getUserOption, normalizeAssignableUserId } from "./users.service.js";

type UseCaseStatus = UseCaseRecord["status"];

export interface UseCaseInput {
  featureId?: number;
  title?: string;
  status?: UseCaseStatus;
  description?: string | null;
  content?: string;
  sortOrder?: number;
  responsibleUserId?: number | null;
  expectedVersion?: number;
}

export interface UseCaseDto {
  id: number;
  featureId: number;
  title: string;
  status: UseCaseStatus;
  description: string | null;
  content?: string;
  sortOrder: number;
  responsibleUserId: number | null;
  responsibleUser: UserSummary | null;
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  parentContexts?: VisibleParentContext[];
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
  { key: "sortOrder", label: "Sortierung" },
  { key: "responsibleUserId", label: "Verantwortlich" }
];

async function mapUseCase(database: DbClient, record: UseCaseRecord, content?: string, supportCounts = emptyUseCaseSupportCounts, parentContexts?: VisibleParentContext[]): Promise<UseCaseDto> {
  return {
    id: record.id,
    featureId: record.featureId,
    title: record.title,
    status: record.status,
    description: record.description,
    content,
    sortOrder: record.sortOrder,
    responsibleUserId: record.responsibleUserId,
    responsibleUser: await getUserOption(database, record.responsibleUserId),
    attachmentCount: supportCounts.attachmentCount,
    noteCount: supportCounts.noteCount,
    commentCount: supportCounts.commentCount,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    parentContexts
  };
}

async function useCaseParentContexts(database: DbClient, featureId: number): Promise<VisibleParentContext[]> {
  const feature = firstRow(await database.select({ id: features.id, label: features.title }).from(features).where(eq(features.id, featureId)));
  return feature ? [{ type: "feature", id: feature.id, label: feature.label, origin: "direct" }] : [];
}

async function getUseCaseSupportCounts(database: DbClient, useCaseIds: number[]): Promise<Map<number, UseCaseSupportCounts>> {
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

  const commentRows = await database.select({ useCaseId: useCaseComments.useCaseId }).from(useCaseComments).where(inArray(useCaseComments.useCaseId, useCaseIds));
  for (const row of commentRows) {
    ensureCounts(row.useCaseId).commentCount += 1;
  }

  return counts;
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

async function getUseCaseRecord(database: DbClient, id: number): Promise<UseCaseRecord> {
  const useCase = await useCaseRepository.findById(database, id);
  if (!useCase) {
    throw notFound(`Use case with id ${id} not found`);
  }
  return useCase;
}

async function readUseCaseContent(database: DbClient, record: UseCaseRecord): Promise<string> {
  return readContentFromDb(database, record.id, "usecases");
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

export async function listUseCases(database: DbClient, featureId: number): Promise<UseCaseDto[]> {
  await ensureFeatureExists(database, featureId);
  const rows = await useCaseRepository.findByFeatureId(database, featureId);
  const ids = rows.map((useCase) => useCase.id);
  const supportCounts = await getUseCaseSupportCounts(database, ids);
  return Promise.all(rows.map((useCase) => mapUseCase(database, useCase, undefined, supportCounts.get(useCase.id) ?? emptyUseCaseSupportCounts)));
}

export async function getUseCase(database: DbClient, id: number): Promise<UseCaseDto> {
  const useCase = await getUseCaseRecord(database, id);
  const supportCounts = (await getUseCaseSupportCounts(database, [id])).get(id) ?? emptyUseCaseSupportCounts;
  return mapUseCase(database, useCase, await readUseCaseContent(database, useCase), supportCounts, await useCaseParentContexts(database, useCase.featureId));
}

export async function createUseCase(database: DbClient, featureId: number, input: UseCaseInput, actor?: JournalActor | null): Promise<UseCaseDto> {
  const targetFeatureId = input.featureId ?? featureId;
  const featureObject = await getFeatureJournalObject(database, targetFeatureId);
  const title = requireNonEmpty(input.title, "title");
  const status = input.status ?? await resolveDefaultCatalogEntryKey(database, "featureStatus", "draft");
  await ensureCatalogEntryExists(database, "featureStatus", status);

  const content = input.content ?? "";
  const created = await database.transaction(async (tx) => {
    const useCase = await useCaseRepository.create(
      tx,
      {
        featureId: targetFeatureId,
        title,
        status,
        description: cleanNullable(input.description) ?? null,
        content,
        sortOrder: input.sortOrder ?? 0,
        responsibleUserId: await normalizeAssignableUserId(tx, input.responsibleUserId ?? actor?.actorUserId ?? null, "responsibleUserId")
      },
      actor?.actorUserId ?? undefined
    );
      const journalObject = useCaseJournalObject(useCase);
      await recordJournalEntry(tx, {
        operation: "create",
        object: journalObject,
        summary: buildCreateSummary(journalObject),
        actor,
        contexts: [makeJournalContext(featureObject, "owner")]
      });
    return useCase;
  });

  return mapUseCase(database, created, content);
}

export async function updateUseCase(database: DbClient, id: number, input: UseCaseInput, actor?: JournalActor | null): Promise<UseCaseDto> {
  const current = await getUseCaseRecord(database, id);
  const previousContent = await readUseCaseContent(database, current);
  assertVersion(current.version, input.expectedVersion ?? 0);
  const values: UseCaseUpdateData = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.featureId !== undefined) {
    await ensureFeatureExists(database, input.featureId);
    values.featureId = input.featureId;
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
    throw badRequest("No use case fields provided");
  }

  if (input.content !== undefined) {
    values.content = input.content;
  }

  const updated = await database.transaction(async (tx) => {
    const useCase = await useCaseRepository.update(tx, id, input.expectedVersion ?? 0, values, actor?.actorUserId ?? undefined);
    if (!useCase) {
      throw notFound(`Use case with id ${id} not found`);
    }
    const featureField: JournalFieldDefinition<UseCaseRecord> = {
      key: "featureId",
      label: "Feature",
      format: (value) => (typeof value === "number" ? `Feature ${value}` : null)
    };
    const nextContent = input.content ?? previousContent;
    const journalObject = useCaseJournalObject(useCase);
    const changes = [...buildJournalChanges(current, useCase, [featureField, ...useCaseJournalFields]), ...buildContentChange(previousContent, nextContent)];
    await recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes,
      contexts: [makeJournalContext(await getFeatureJournalObject(database, useCase.featureId), "owner")]
    });
    return useCase;
  });
  if (!updated) {
    throw notFound(`Use case with id ${id} not found`);
  }
  const supportCounts = (await getUseCaseSupportCounts(database, [id])).get(id) ?? emptyUseCaseSupportCounts;
  return mapUseCase(database, updated, input.content ?? await readUseCaseContent(database, updated), supportCounts);
}

export async function deleteUseCase(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const useCase = await getUseCaseRecord(database, id);
  await deleteUseCaseCommentsForIds(database, [id]);
  const featureObject = await getFeatureJournalObject(database, useCase.featureId);
  await database.transaction(async (tx) => {
    const journalObject = useCaseJournalObject(useCase);
    await recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: [makeJournalContext(featureObject, "owner")]
    });
    await useCaseRepository.delete(tx, id);
  });
}
