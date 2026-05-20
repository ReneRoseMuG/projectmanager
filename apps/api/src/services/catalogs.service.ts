import type { CatalogEntry, CatalogEntryInput, CatalogEntryUpdate, CatalogKind } from "@taskmanager/shared-types";
import { CATALOG_KINDS } from "@taskmanager/shared-types";
import { eq, sql } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { backlogItems, features, milestones, projects, tasks, tickets, useCases } from "../db/schema.js";
import { catalogRepository, type CatalogEntryRecord, type CatalogEntryUpdateData } from "../repositories/catalog.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { requireNonEmpty } from "./helpers.js";

const keyPattern = /^[a-z][a-z0-9_]*$/;

function nowIso(): string {
  return new Date().toISOString();
}

function mapCatalogEntry(record: CatalogEntryRecord): CatalogEntry {
  return {
    id: record.id,
    kind: record.kind,
    key: record.key,
    label: record.label,
    sortOrder: record.sortOrder,
    isClosed: record.isClosed,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function normalizeCatalogKey(value: string | undefined): string {
  const key = requireNonEmpty(value, "key");
  if (!keyPattern.test(key)) {
    throw badRequest("Catalog key must start with a lowercase letter and contain only lowercase letters, numbers and underscores");
  }
  return key;
}

function assertCatalogKind(kind: string): asserts kind is CatalogKind {
  if (!(CATALOG_KINDS as readonly string[]).includes(kind)) {
    throw badRequest(`Catalog kind "${kind}" is invalid`);
  }
}

function resolveSortOrder(database: DbClient, kind: CatalogKind, sortOrder: number | undefined): number {
  if (sortOrder !== undefined) {
    return sortOrder;
  }
  const entries = catalogRepository.findByKind(database, kind);
  const highest = entries.reduce((current, entry) => Math.max(current, entry.sortOrder), 0);
  return highest + 100;
}

function setWorkStatusFallback(database: DbClient, fromKey: string, fallback: CatalogEntryRecord): void {
  const now = nowIso();
  database.update(projects).set({ status: fallback.key, updatedAt: now, version: sql`${projects.version} + 1` }).where(eq(projects.status, fromKey)).run();
  database.update(milestones).set({ status: fallback.key, updatedAt: now, version: sql`${milestones.version} + 1` }).where(eq(milestones.status, fromKey)).run();
  database.update(tasks).set({ status: fallback.key, updatedAt: now, version: sql`${tasks.version} + 1` }).where(eq(tasks.status, fromKey)).run();
  database.update(backlogItems).set({ status: fallback.key, updatedAt: now, version: sql`${backlogItems.version} + 1` }).where(eq(backlogItems.status, fromKey)).run();
  database
    .update(tickets)
    .set({
      status: fallback.key,
      resolvedAt: fallback.isClosed ? sql`coalesce(${tickets.resolvedAt}, datetime('now'))` : null,
      updatedAt: now,
      version: sql`${tickets.version} + 1`
    })
    .where(eq(tickets.status, fromKey))
    .run();
}

function setFeatureStatusFallback(database: DbClient, fromKey: string, fallback: CatalogEntryRecord): void {
  const now = nowIso();
  database.update(features).set({ status: fallback.key, updatedAt: now, version: sql`${features.version} + 1` }).where(eq(features.status, fromKey)).run();
  database.update(useCases).set({ status: fallback.key, updatedAt: now, version: sql`${useCases.version} + 1` }).where(eq(useCases.status, fromKey)).run();
}

function setPriorityFallback(database: DbClient, fromKey: string, fallback: CatalogEntryRecord): void {
  const now = nowIso();
  database.update(tasks).set({ priority: fallback.key, updatedAt: now, version: sql`${tasks.version} + 1` }).where(eq(tasks.priority, fromKey)).run();
  database.update(tickets).set({ priority: fallback.key, updatedAt: now, version: sql`${tickets.version} + 1` }).where(eq(tickets.priority, fromKey)).run();
}

export function listCatalogEntries(database: DbClient, kind?: string): CatalogEntry[] {
  if (kind !== undefined) {
    assertCatalogKind(kind);
    return catalogRepository.findByKind(database, kind).map(mapCatalogEntry);
  }
  return catalogRepository.findAll(database).map(mapCatalogEntry);
}

export function ensureCatalogEntryExists(database: DbClient, kind: CatalogKind, key: string): void {
  if (!catalogRepository.findByKindAndKey(database, kind, key)) {
    throw badRequest(`Catalog entry "${key}" does not exist in ${kind}`);
  }
}

export function resolveDefaultCatalogEntryKey(database: DbClient, kind: CatalogKind, preferredKey: string): string {
  const preferred = catalogRepository.findByKindAndKey(database, kind, preferredKey);
  if (preferred) {
    return preferred.key;
  }
  const fallback = catalogRepository.findLowestByKind(database, kind);
  if (!fallback) {
    throw badRequest(`Catalog ${kind} has no entries`);
  }
  return fallback.key;
}

export function isCatalogEntryClosed(database: DbClient, kind: CatalogKind, key: string): boolean {
  return catalogRepository.findByKindAndKey(database, kind, key)?.isClosed ?? false;
}

export function createCatalogEntry(database: DbClient, kind: string, input: CatalogEntryInput): CatalogEntry {
  assertCatalogKind(kind);
  const key = normalizeCatalogKey(input.key);
  const label = requireNonEmpty(input.label, "label");
  if (catalogRepository.findByKindAndKey(database, kind, key)) {
    throw conflict(`Catalog entry "${key}" already exists in ${kind}`);
  }

  const created = catalogRepository.create(database, {
    kind,
    key,
    label,
    sortOrder: resolveSortOrder(database, kind, input.sortOrder),
    isClosed: kind === "priority" ? false : input.isClosed ?? false
  });

  return mapCatalogEntry(created);
}

export function updateCatalogEntry(database: DbClient, kind: string, id: number, input: CatalogEntryUpdate): CatalogEntry {
  assertCatalogKind(kind);
  const current = catalogRepository.findById(database, id);
  if (!current || current.kind !== kind) {
    throw notFound(`Catalog entry with id ${id} not found`);
  }

  const values: CatalogEntryUpdateData = {};
  if (input.label !== undefined) {
    values.label = requireNonEmpty(input.label, "label");
  }
  if (input.sortOrder !== undefined) {
    values.sortOrder = input.sortOrder;
  }
  if (input.isClosed !== undefined && kind !== "priority") {
    values.isClosed = input.isClosed;
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No catalog entry fields provided");
  }

  const updated = catalogRepository.update(database, id, input.expectedVersion, values);
  if (!updated) {
    throw notFound(`Catalog entry with id ${id} not found`);
  }
  return mapCatalogEntry(updated);
}

export function deleteCatalogEntry(database: DbClient, kind: string, id: number): void {
  assertCatalogKind(kind);
  const entry = catalogRepository.findById(database, id);
  if (!entry || entry.kind !== kind) {
    throw notFound(`Catalog entry with id ${id} not found`);
  }

  const fallback = catalogRepository.findLowestByKind(database, kind, id);
  if (!fallback) {
    throw badRequest("Cannot delete the last catalog entry");
  }

  database.transaction((tx) => {
    if (kind === "workStatus") {
      setWorkStatusFallback(tx, entry.key, fallback);
    } else if (kind === "featureStatus") {
      setFeatureStatusFallback(tx, entry.key, fallback);
    } else {
      setPriorityFallback(tx, entry.key, fallback);
    }
    catalogRepository.delete(tx, id);
  });
}
