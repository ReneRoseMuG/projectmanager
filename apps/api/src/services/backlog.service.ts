import { eq } from "drizzle-orm";
import type { UserSummary, VisibleParentContext } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { features, projects, useCases } from "../db/schema.js";
import { firstRow } from "../db/query-utils.js";
import { backlogItemRepository, type BacklogItemRecord, type BacklogItemUpdateData } from "../repositories/backlog-item.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
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

type BacklogStatus = BacklogItemRecord["status"];

export interface BacklogInput {
  title?: string;
  description?: string | null;
  status?: BacklogStatus;
  importKey?: string | null;
  featureId?: number | null;
  useCaseId?: number | null;
  sortOrder?: number;
  responsibleUserId?: number | null;
  expectedVersion?: number;
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
  importKey: string | null;
  sortOrder: number;
  responsibleUserId: number | null;
  responsibleUser: UserSummary | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  parentContexts?: VisibleParentContext[];
}

const backlogJournalFields: Array<JournalFieldDefinition<BacklogItemRecord>> = [
  { key: "title", label: "Titel" },
  { key: "description", label: "Beschreibung" },
  { key: "status", label: "Status" },
  { key: "importKey", label: "Import-Schlüssel" },
  { key: "sortOrder", label: "Sortierung" },
  { key: "responsibleUserId", label: "Verantwortlich" }
];

async function backlogParentContexts(database: DbClient, record: BacklogItemRecord): Promise<VisibleParentContext[]> {
  const contexts: VisibleParentContext[] = [];
  const project = firstRow(await database.select({ id: projects.id, label: projects.name }).from(projects).where(eq(projects.id, record.projectId)));
  if (project) {
    contexts.push({ type: "project", id: project.id, label: project.label, origin: "direct" });
  }
  if (record.featureId) {
    const feature = firstRow(await database.select({ id: features.id, label: features.title }).from(features).where(eq(features.id, record.featureId)));
    if (feature) {
      contexts.push({ type: "feature", id: feature.id, label: feature.label, origin: "direct" });
    }
  }
  if (record.useCaseId) {
    const useCase = firstRow(await database.select({ id: useCases.id, label: useCases.title }).from(useCases).where(eq(useCases.id, record.useCaseId)));
    if (useCase) {
      contexts.push({ type: "useCase", id: useCase.id, label: useCase.label, origin: "direct" });
    }
  }
  return contexts;
}

async function mapBacklogItem(database: DbClient, record: BacklogItemRecord): Promise<BacklogDto> {
  return {
    id: record.id,
    projectId: record.projectId,
    featureId: record.featureId,
    useCaseId: record.useCaseId,
    title: record.title,
    description: record.description,
    status: record.status,
    importKey: record.importKey,
    sortOrder: record.sortOrder,
    responsibleUserId: record.responsibleUserId,
    responsibleUser: await getUserOption(database, record.responsibleUserId),
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    parentContexts: await backlogParentContexts(database, record)
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

async function getFeatureJournalObject(database: DbClient, featureId: number): Promise<JournalObjectRef> {
  const feature = firstRow(await database.select({ id: features.id, title: features.title }).from(features).where(eq(features.id, featureId)));
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
  return makeJournalObject("feature", feature.id, feature.title);
}

async function getUseCaseJournalObject(database: DbClient, useCaseId: number): Promise<JournalObjectRef> {
  const useCase = firstRow(await database.select({ id: useCases.id, title: useCases.title }).from(useCases).where(eq(useCases.id, useCaseId)));
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
  return makeJournalObject("useCase", useCase.id, useCase.title);
}

async function optionalObjectLabel(getObject: () => Promise<JournalObjectRef>, id: number | null): Promise<string | null> {
  return id === null ? null : (await getObject()).label;
}

function backlogJournalObject(record: BacklogItemRecord): JournalObjectRef {
  return makeJournalObject("backlogItem", record.id, record.title);
}

async function backlogContexts(database: DbClient, record: BacklogItemRecord) {
  return [
    makeJournalContext(await getProjectJournalObject(database, record.projectId), "owner"),
    ...(record.featureId ? [makeJournalContext(await getFeatureJournalObject(database, record.featureId), "related" as const)] : []),
    ...(record.useCaseId ? [makeJournalContext(await getUseCaseJournalObject(database, record.useCaseId), "related" as const)] : [])
  ];
}

async function ensureFeatureExists(database: DbClient, featureId: number | null | undefined): Promise<void> {
  if (featureId === undefined || featureId === null) {
    return;
  }

  const feature = firstRow(await database.select({ id: features.id }).from(features).where(eq(features.id, featureId)));
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

async function ensureUseCaseExists(database: DbClient, useCaseId: number | null | undefined): Promise<void> {
  if (useCaseId === undefined || useCaseId === null) {
    return;
  }

  const useCase = firstRow(await database.select({ id: useCases.id }).from(useCases).where(eq(useCases.id, useCaseId)));
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
}

async function getBacklogRecord(database: DbClient, id: number): Promise<BacklogItemRecord> {
  const item = await backlogItemRepository.findById(database, id);
  if (!item) {
    throw notFound(`Backlog item with id ${id} not found`);
  }
  return item;
}

export async function listBacklogItems(database: DbClient, projectId: number, filters: BacklogFilters): Promise<BacklogDto[]> {
  await ensureProjectExists(database, projectId);

  const items = await backlogItemRepository.findByProject(database, projectId, filters);
  return Promise.all(items.map((item) => mapBacklogItem(database, item)));
}

export async function createBacklogItem(database: DbClient, projectId: number, input: BacklogInput, actor?: JournalActor | null): Promise<BacklogDto> {
  await getProjectJournalObject(database, projectId);
  await ensureFeatureExists(database, input.featureId);
  await ensureUseCaseExists(database, input.useCaseId);
  const status = input.status ?? await resolveDefaultCatalogEntryKey(database, "workStatus", "open");
  await ensureCatalogEntryExists(database, "workStatus", status);

  const created = await database.transaction(async (tx) => {
    const item = await backlogItemRepository.create(
      tx,
      {
        projectId,
        featureId: input.featureId ?? null,
        useCaseId: input.useCaseId ?? null,
        title: requireNonEmpty(input.title, "title"),
        description: cleanNullable(input.description) ?? null,
        status,
        importKey: cleanNullable(input.importKey) ?? null,
        sortOrder: input.sortOrder ?? 0,
        responsibleUserId: await normalizeAssignableUserId(tx, input.responsibleUserId ?? actor?.actorUserId ?? null, "responsibleUserId")
      },
      actor?.actorUserId ?? undefined
    );
    const journalObject = backlogJournalObject(item);
    await recordJournalEntry(tx, {
      operation: "create",
      object: journalObject,
      summary: buildCreateSummary(journalObject),
      actor,
      contexts: await backlogContexts(database, item)
    });
    return item;
  });

  return mapBacklogItem(database, created);
}

export async function getBacklogItem(database: DbClient, id: number): Promise<BacklogDto> {
  return mapBacklogItem(database, await getBacklogRecord(database, id));
}

export async function updateBacklogItem(database: DbClient, id: number, input: BacklogInput, actor?: JournalActor | null): Promise<BacklogDto> {
  const current = await getBacklogRecord(database, id);
  const values: BacklogItemUpdateData = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.status !== undefined) {
    await ensureCatalogEntryExists(database, "workStatus", input.status);
    values.status = input.status;
  }
  if (input.importKey !== undefined) {
    values.importKey = cleanNullable(input.importKey) ?? null;
  }
  if (input.featureId !== undefined) {
    await ensureFeatureExists(database, input.featureId);
    values.featureId = input.featureId;
  }
  if (input.useCaseId !== undefined) {
    await ensureUseCaseExists(database, input.useCaseId);
    values.useCaseId = input.useCaseId;
  }
  if (input.sortOrder !== undefined) {
    values.sortOrder = input.sortOrder;
  }
  if (input.responsibleUserId !== undefined) {
    values.responsibleUserId = await normalizeAssignableUserId(database, input.responsibleUserId, "responsibleUserId");
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No backlog item fields provided");
  }

  const updated = await database.transaction(async (tx) => {
    const item = await backlogItemRepository.update(tx, id, input.expectedVersion ?? 0, values, actor?.actorUserId ?? undefined);
    if (!item) {
      throw notFound(`Backlog item with id ${id} not found`);
    }
    const journalObject = backlogJournalObject(item);
    const changes = buildJournalChanges(current, item, backlogJournalFields);
    await recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes,
      contexts: await backlogContexts(database, item)
    });
    return item;
  });
  if (!updated) {
    throw notFound(`Backlog item with id ${id} not found`);
  }
  return mapBacklogItem(database, updated);
}

export async function deleteBacklogItem(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const current = await getBacklogRecord(database, id);
  await database.transaction(async (tx) => {
    const journalObject = backlogJournalObject(current);
    await recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: await backlogContexts(database, current)
    });
    if (await backlogItemRepository.delete(tx, id) === 0) {
      throw notFound(`Backlog item with id ${id} not found`);
    }
  });
}
