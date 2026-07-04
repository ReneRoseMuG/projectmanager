import { deleteBacklogItemCommentsForIds } from "./comments.service.js";
import { eq, inArray } from "drizzle-orm";
import type { Paginated, UserOption, UserSummary, VisibleParentContext } from "@taskmanager/shared-types";
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
import { getUserOption, getUserOptionsMap, normalizeAssignableUserId } from "./users.service.js";

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
  // Case-insensitive Titelsuche; bildet die bisherige clientseitige Suche serverseitig nach.
  q?: string;
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

// Bündelt die Parent-Label-Lookups für mehrere Backlog-Items in je eine Query pro Ebene.
interface BacklogParentLabelMaps {
  projects: Map<number, string>;
  features: Map<number, string>;
  useCases: Map<number, string>;
}

async function loadBacklogParentLabelMaps(database: DbClient, records: BacklogItemRecord[]): Promise<BacklogParentLabelMaps> {
  const projectIds = [...new Set(records.map((record) => record.projectId))];
  const featureIds = [...new Set(records.map((record) => record.featureId).filter((id): id is number => id !== null))];
  const useCaseIds = [...new Set(records.map((record) => record.useCaseId).filter((id): id is number => id !== null))];

  const projectMap = new Map<number, string>();
  if (projectIds.length > 0) {
    const rows = await database.select({ id: projects.id, label: projects.name }).from(projects).where(inArray(projects.id, projectIds));
    for (const row of rows) {
      projectMap.set(row.id, row.label);
    }
  }

  const featureMap = new Map<number, string>();
  if (featureIds.length > 0) {
    const rows = await database.select({ id: features.id, label: features.title }).from(features).where(inArray(features.id, featureIds));
    for (const row of rows) {
      featureMap.set(row.id, row.label);
    }
  }

  const useCaseMap = new Map<number, string>();
  if (useCaseIds.length > 0) {
    const rows = await database.select({ id: useCases.id, label: useCases.title }).from(useCases).where(inArray(useCases.id, useCaseIds));
    for (const row of rows) {
      useCaseMap.set(row.id, row.label);
    }
  }

  return { projects: projectMap, features: featureMap, useCases: useCaseMap };
}

// Baut die Parent-Kontexte aus den vorgeladenen Maps — gleiche Reihenfolge und null-Fälle wie backlogParentContexts.
function buildBacklogParentContexts(record: BacklogItemRecord, labels: BacklogParentLabelMaps): VisibleParentContext[] {
  const contexts: VisibleParentContext[] = [];
  const projectLabel = labels.projects.get(record.projectId);
  if (projectLabel !== undefined) {
    contexts.push({ type: "project", id: record.projectId, label: projectLabel, origin: "direct" });
  }
  if (record.featureId) {
    const featureLabel = labels.features.get(record.featureId);
    if (featureLabel !== undefined) {
      contexts.push({ type: "feature", id: record.featureId, label: featureLabel, origin: "direct" });
    }
  }
  if (record.useCaseId) {
    const useCaseLabel = labels.useCases.get(record.useCaseId);
    if (useCaseLabel !== undefined) {
      contexts.push({ type: "useCase", id: record.useCaseId, label: useCaseLabel, origin: "direct" });
    }
  }
  return contexts;
}

// Map-basierte Variante von mapBacklogItem für Listen — User-Option und Parent-Kontexte aus vorgeladenen Maps.
function mapBacklogItemFromMaps(record: BacklogItemRecord, userOptions: Map<number, UserOption>, labels: BacklogParentLabelMaps): BacklogDto {
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
    responsibleUser: record.responsibleUserId !== null ? userOptions.get(record.responsibleUserId) ?? null : null,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    parentContexts: buildBacklogParentContexts(record, labels)
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
  // Alle abhängigen Daten (User-Optionen + Parent-Labels) für die gesamte Liste gebündelt vorladen —
  // statt bis zu 4 Einzelqueries pro Item.
  const userOptions = await getUserOptionsMap(database, items.map((item) => item.responsibleUserId));
  const parentLabels = await loadBacklogParentLabelMaps(database, items);
  return items.map((item) => mapBacklogItemFromMaps(item, userOptions, parentLabels));
}

// Seitenbasierte Variante von listBacklogItems (MS-75 Pagination). Echte SQL-Pagination:
// `total` per COUNT(*) über die gefilterte Menge (vor Pagination), dann nur die Seiten-Records
// (WHERE + ORDER BY + LIMIT/OFFSET) laden. Die abhängigen Daten (User-Optionen + Parent-Labels)
// werden ausschließlich für die Seite gebündelt vorgeladen — Filter-Semantik und DTO identisch
// zum Alt-Pfad.
export async function listBacklogItemsPaginated(
  database: DbClient,
  projectId: number,
  filters: BacklogFilters,
  page: number,
  pageSize: number
): Promise<Paginated<BacklogDto>> {
  await ensureProjectExists(database, projectId);

  const total = await backlogItemRepository.countFiltered(database, projectId, filters);
  const items = await backlogItemRepository.findPage(database, projectId, filters, page, pageSize);
  const userOptions = await getUserOptionsMap(database, items.map((item) => item.responsibleUserId));
  const parentLabels = await loadBacklogParentLabelMaps(database, items);
  const data = items.map((item) => mapBacklogItemFromMaps(item, userOptions, parentLabels));
  return { data, total, page, pageSize };
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
  await deleteBacklogItemCommentsForIds(database, [id]);
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
