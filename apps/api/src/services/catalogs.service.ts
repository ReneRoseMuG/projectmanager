import type { CatalogEntry, CatalogEntryInput, CatalogEntryUpdate, CatalogKind } from "@taskmanager/shared-types";
import { CATALOG_KINDS } from "@taskmanager/shared-types";
import { eq, sql } from "drizzle-orm";
import type { DbClient, DbSession } from "../db/client.js";
import { backlogItems, features, milestones, projects, tasks, tickets, useCases } from "../db/schema.js";
import { catalogRepository, type CatalogEntryRecord, type CatalogEntryUpdateData } from "../repositories/catalog.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { requireNonEmpty } from "./helpers.js";

const keyPattern = /^[a-z][a-z0-9_]*$/;
const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const themeColorPattern = /^var\(--color-[a-z0-9-]+\)$/;

const defaultCatalogColors: Record<CatalogKind, Record<string, string>> = {
  workStatus: {
    active: "var(--color-fern)",
    todo: "var(--color-fern)",
    open: "var(--color-fern)",
    in_progress: "var(--color-tangerine)",
    in_review: "var(--color-mustard)",
    on_hold: "var(--color-steel-500)",
    completed: "var(--color-steel-500)",
    archived: "var(--color-steel-500)",
    done: "var(--color-steel-500)",
    resolved: "var(--color-steel-500)",
    closed: "var(--color-steel-500)",
    rejected: "var(--color-steel-500)"
  },
  featureStatus: {
    draft: "var(--color-violet)",
    active: "var(--color-tangerine)",
    done: "var(--color-steel-500)",
    archived: "var(--color-steel-500)"
  },
  priority: {
    low: "var(--color-steel-400)",
    medium: "var(--color-mustard)",
    high: "var(--color-tangerine)",
    urgent: "var(--color-crimson)"
  },
  ticketType: {
    bug: "var(--color-crimson)",
    improvement: "var(--color-teal)",
    question: "var(--color-violet)",
    task: "var(--color-steel-500)"
  }
};

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
    color: record.color,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function isStatusCatalog(kind: CatalogKind): boolean {
  return kind === "workStatus" || kind === "featureStatus";
}

function defaultCatalogColor(kind: CatalogKind, key: string): string {
  return defaultCatalogColors[kind][key] ?? "var(--color-steel-700)";
}

function normalizeCatalogColor(value: string | undefined, kind: CatalogKind, key: string): string {
  const color = value?.trim() || defaultCatalogColor(kind, key);
  if (!hexColorPattern.test(color) && !themeColorPattern.test(color)) {
    throw badRequest("Catalog color must be a hex color or a var(--color-...) theme token");
  }
  return color;
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

function setWorkStatusFallback(database: DbSession, fromKey: string, fallback: CatalogEntryRecord): void {
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

function setFeatureStatusFallback(database: DbSession, fromKey: string, fallback: CatalogEntryRecord): void {
  const now = nowIso();
  database.update(features).set({ status: fallback.key, updatedAt: now, version: sql`${features.version} + 1` }).where(eq(features.status, fromKey)).run();
  database.update(useCases).set({ status: fallback.key, updatedAt: now, version: sql`${useCases.version} + 1` }).where(eq(useCases.status, fromKey)).run();
}

function setPriorityFallback(database: DbSession, fromKey: string, fallback: CatalogEntryRecord): void {
  const now = nowIso();
  database.update(tasks).set({ priority: fallback.key, updatedAt: now, version: sql`${tasks.version} + 1` }).where(eq(tasks.priority, fromKey)).run();
  database.update(tickets).set({ priority: fallback.key, updatedAt: now, version: sql`${tickets.version} + 1` }).where(eq(tickets.priority, fromKey)).run();
}

function setTicketTypeFallback(database: DbSession, fromKey: string, fallback: CatalogEntryRecord): void {
  const now = nowIso();
  database.update(tickets).set({ type: fallback.key, updatedAt: now, version: sql`${tickets.version} + 1` }).where(eq(tickets.type, fromKey)).run();
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

export function listClosedCatalogEntryKeys(database: DbClient, kind: CatalogKind): Set<string> {
  return new Set(catalogRepository.findByKind(database, kind).filter((entry) => entry.isClosed).map((entry) => entry.key));
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
    isClosed: isStatusCatalog(kind) ? input.isClosed ?? false : false,
    color: normalizeCatalogColor(input.color, kind, key)
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
  if (input.isClosed !== undefined && isStatusCatalog(kind)) {
    values.isClosed = input.isClosed;
  }
  if (input.color !== undefined) {
    values.color = normalizeCatalogColor(input.color, kind, current.key);
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
    } else if (kind === "priority") {
      setPriorityFallback(tx, entry.key, fallback);
    } else {
      setTicketTypeFallback(tx, entry.key, fallback);
    }
    catalogRepository.delete(tx, id);
  });
}
