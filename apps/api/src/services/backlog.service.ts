import { eq } from "drizzle-orm";
import type { UserSummary } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { features, projects, useCases } from "../db/schema.js";
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
}

const backlogJournalFields: Array<JournalFieldDefinition<BacklogItemRecord>> = [
  { key: "title", label: "Titel" },
  { key: "description", label: "Beschreibung" },
  { key: "status", label: "Status" },
  { key: "importKey", label: "Import-Schlüssel" },
  { key: "sortOrder", label: "Sortierung" },
  { key: "responsibleUserId", label: "Verantwortlich" }
];

function mapBacklogItem(database: DbClient, record: BacklogItemRecord): BacklogDto {
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
    responsibleUser: getUserOption(database, record.responsibleUserId),
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
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

function getFeatureJournalObject(database: DbClient, featureId: number): JournalObjectRef {
  const feature = database.select({ id: features.id, title: features.title }).from(features).where(eq(features.id, featureId)).get();
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
  return makeJournalObject("feature", feature.id, feature.title);
}

function getUseCaseJournalObject(database: DbClient, useCaseId: number): JournalObjectRef {
  const useCase = database.select({ id: useCases.id, title: useCases.title }).from(useCases).where(eq(useCases.id, useCaseId)).get();
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
  return makeJournalObject("useCase", useCase.id, useCase.title);
}

function optionalObjectLabel(getObject: () => JournalObjectRef, id: number | null): string | null {
  return id === null ? null : getObject().label;
}

function backlogJournalObject(record: BacklogItemRecord): JournalObjectRef {
  return makeJournalObject("backlogItem", record.id, record.title);
}

function backlogContexts(database: DbClient, record: BacklogItemRecord) {
  return [
    makeJournalContext(getProjectJournalObject(database, record.projectId), "owner"),
    ...(record.featureId ? [makeJournalContext(getFeatureJournalObject(database, record.featureId), "related" as const)] : []),
    ...(record.useCaseId ? [makeJournalContext(getUseCaseJournalObject(database, record.useCaseId), "related" as const)] : [])
  ];
}

function ensureFeatureExists(database: DbClient, featureId: number | null | undefined): void {
  if (featureId === undefined || featureId === null) {
    return;
  }

  const feature = database.select({ id: features.id }).from(features).where(eq(features.id, featureId)).get();
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

function ensureUseCaseExists(database: DbClient, useCaseId: number | null | undefined): void {
  if (useCaseId === undefined || useCaseId === null) {
    return;
  }

  const useCase = database.select({ id: useCases.id }).from(useCases).where(eq(useCases.id, useCaseId)).get();
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
}

function getBacklogRecord(database: DbClient, id: number): BacklogItemRecord {
  const item = backlogItemRepository.findById(database, id);
  if (!item) {
    throw notFound(`Backlog item with id ${id} not found`);
  }
  return item;
}

export function listBacklogItems(database: DbClient, projectId: number, filters: BacklogFilters): BacklogDto[] {
  ensureProjectExists(database, projectId);

  return backlogItemRepository.findByProject(database, projectId, filters).map((item) => mapBacklogItem(database, item));
}

export function createBacklogItem(database: DbClient, projectId: number, input: BacklogInput, actor?: JournalActor | null): BacklogDto {
  getProjectJournalObject(database, projectId);
  ensureFeatureExists(database, input.featureId);
  ensureUseCaseExists(database, input.useCaseId);
  const status = input.status ?? resolveDefaultCatalogEntryKey(database, "workStatus", "open");
  ensureCatalogEntryExists(database, "workStatus", status);

  const created = database.transaction((tx) => {
    const item = backlogItemRepository.create(
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
        responsibleUserId: normalizeAssignableUserId(tx, input.responsibleUserId ?? actor?.actorUserId ?? null, "responsibleUserId")
      },
      actor?.actorUserId ?? undefined
    );
    const journalObject = backlogJournalObject(item);
    recordJournalEntry(tx, {
      operation: "create",
      object: journalObject,
      summary: buildCreateSummary(journalObject),
      actor,
      contexts: backlogContexts(database, item)
    });
    return item;
  });

  return mapBacklogItem(database, created);
}

export function getBacklogItem(database: DbClient, id: number): BacklogDto {
  return mapBacklogItem(database, getBacklogRecord(database, id));
}

export function updateBacklogItem(database: DbClient, id: number, input: BacklogInput, actor?: JournalActor | null): BacklogDto {
  const current = getBacklogRecord(database, id);
  const values: BacklogItemUpdateData = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.status !== undefined) {
    ensureCatalogEntryExists(database, "workStatus", input.status);
    values.status = input.status;
  }
  if (input.importKey !== undefined) {
    values.importKey = cleanNullable(input.importKey) ?? null;
  }
  if (input.featureId !== undefined) {
    ensureFeatureExists(database, input.featureId);
    values.featureId = input.featureId;
  }
  if (input.useCaseId !== undefined) {
    ensureUseCaseExists(database, input.useCaseId);
    values.useCaseId = input.useCaseId;
  }
  if (input.sortOrder !== undefined) {
    values.sortOrder = input.sortOrder;
  }
  if (input.responsibleUserId !== undefined) {
    values.responsibleUserId = normalizeAssignableUserId(database, input.responsibleUserId, "responsibleUserId");
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No backlog item fields provided");
  }

  const updated = database.transaction((tx) => {
    const item = backlogItemRepository.update(tx, id, input.expectedVersion ?? 0, values, actor?.actorUserId ?? undefined);
    if (!item) {
      throw notFound(`Backlog item with id ${id} not found`);
    }
    const relationFields: Array<JournalFieldDefinition<BacklogItemRecord>> = [
      {
        key: "featureId",
        label: "Feature",
        format: (value) => (typeof value === "number" ? optionalObjectLabel(() => getFeatureJournalObject(database, value), value) : null)
      },
      {
        key: "useCaseId",
        label: "Use Case",
        format: (value) => (typeof value === "number" ? optionalObjectLabel(() => getUseCaseJournalObject(database, value), value) : null)
      }
    ];
    const journalObject = backlogJournalObject(item);
    const changes = buildJournalChanges(current, item, [...relationFields, ...backlogJournalFields]);
    recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes,
      contexts: backlogContexts(database, item)
    });
    return item;
  });
  if (!updated) {
    throw notFound(`Backlog item with id ${id} not found`);
  }
  return mapBacklogItem(database, updated);
}

export function deleteBacklogItem(database: DbClient, id: number, actor?: JournalActor | null): void {
  const current = getBacklogRecord(database, id);
  database.transaction((tx) => {
    const journalObject = backlogJournalObject(current);
    recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: backlogContexts(database, current)
    });
    if (backlogItemRepository.delete(tx, id) === 0) {
      throw notFound(`Backlog item with id ${id} not found`);
    }
  });
}
