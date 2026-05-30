import type { CatalogEntry, CatalogEntryInput, CatalogEntryUpdate, CatalogKind } from "@taskmanager/shared-types";
import { CATALOG_KINDS } from "@taskmanager/shared-types";
import { eq, sql } from "drizzle-orm";
import type { DbClient, DbSession } from "../db/client.js";
import { backlogItems, catalogEntries, features, milestones, projects, tasks, tickets, useCases } from "../db/schema.js";
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

async function resolveSortOrder(database: DbClient, kind: CatalogKind, sortOrder: number | undefined): Promise<number> {
  if (sortOrder !== undefined) {
    return sortOrder;
  }
  const entries = await catalogRepository.findByKind(database, kind);
  const highest = entries.reduce((current, entry) => Math.max(current, entry.sortOrder), 0);
  return highest + 100;
}

async function setWorkStatusFallback(database: DbSession, fromKey: string, fallback: CatalogEntryRecord): Promise<void> {
  const now = nowIso();
  await database.update(projects).set({ status: fallback.key, updatedAt: now, version: sql`${projects.version} + 1` }).where(eq(projects.status, fromKey));
  await database.update(milestones).set({ status: fallback.key, updatedAt: now, version: sql`${milestones.version} + 1` }).where(eq(milestones.status, fromKey));
  await database.update(tasks).set({ status: fallback.key, updatedAt: now, version: sql`${tasks.version} + 1` }).where(eq(tasks.status, fromKey));
  await database.update(backlogItems).set({ status: fallback.key, updatedAt: now, version: sql`${backlogItems.version} + 1` }).where(eq(backlogItems.status, fromKey));
  await database
    .update(tickets)
    .set({
      status: fallback.key,
      resolvedAt: fallback.isClosed ? sql`coalesce(${tickets.resolvedAt}, ${now})` : null,
      updatedAt: now,
      version: sql`${tickets.version} + 1`
    })
    .where(eq(tickets.status, fromKey));
}

async function setFeatureStatusFallback(database: DbSession, fromKey: string, fallback: CatalogEntryRecord): Promise<void> {
  const now = nowIso();
  await database.update(features).set({ status: fallback.key, updatedAt: now, version: sql`${features.version} + 1` }).where(eq(features.status, fromKey));
  await database.update(useCases).set({ status: fallback.key, updatedAt: now, version: sql`${useCases.version} + 1` }).where(eq(useCases.status, fromKey));
}

async function setPriorityFallback(database: DbSession, fromKey: string, fallback: CatalogEntryRecord): Promise<void> {
  const now = nowIso();
  await database.update(tasks).set({ priority: fallback.key, updatedAt: now, version: sql`${tasks.version} + 1` }).where(eq(tasks.priority, fromKey));
  await database.update(tickets).set({ priority: fallback.key, updatedAt: now, version: sql`${tickets.version} + 1` }).where(eq(tickets.priority, fromKey));
}

async function setTicketTypeFallback(database: DbSession, fromKey: string, fallback: CatalogEntryRecord): Promise<void> {
  const now = nowIso();
  await database.update(tickets).set({ type: fallback.key, updatedAt: now, version: sql`${tickets.version} + 1` }).where(eq(tickets.type, fromKey));
}

const DEFAULT_CATALOG_ENTRIES: Array<[CatalogKind, string, string, number, boolean, string]> = [
  ["workStatus", "active", "Aktiv", 100, false, "var(--color-fern)"],
  ["workStatus", "on_hold", "Pausiert", 200, false, "var(--color-steel-500)"],
  ["workStatus", "completed", "Abgeschlossen", 300, true, "var(--color-steel-500)"],
  ["workStatus", "archived", "Archiviert", 400, true, "var(--color-steel-500)"],
  ["workStatus", "todo", "Offen", 500, false, "var(--color-fern)"],
  ["workStatus", "open", "Offen", 600, false, "var(--color-fern)"],
  ["workStatus", "in_progress", "In Arbeit", 700, false, "var(--color-tangerine)"],
  ["workStatus", "in_review", "In Prüfung", 800, false, "var(--color-mustard)"],
  ["workStatus", "done", "Erledigt", 900, true, "var(--color-steel-500)"],
  ["workStatus", "resolved", "Gelöst", 1000, true, "var(--color-steel-500)"],
  ["workStatus", "closed", "Geschlossen", 1100, true, "var(--color-steel-500)"],
  ["workStatus", "rejected", "Verworfen", 1200, true, "var(--color-steel-500)"],
  ["featureStatus", "draft", "Entwurf", 100, false, "var(--color-violet)"],
  ["featureStatus", "active", "Aktiv", 200, false, "var(--color-tangerine)"],
  ["featureStatus", "done", "Erledigt", 300, true, "var(--color-steel-500)"],
  ["featureStatus", "archived", "Archiviert", 400, true, "var(--color-steel-500)"],
  ["priority", "low", "Niedrig", 100, false, "var(--color-steel-400)"],
  ["priority", "medium", "Mittel", 200, false, "var(--color-mustard)"],
  ["priority", "high", "Hoch", 300, false, "var(--color-tangerine)"],
  ["priority", "urgent", "Dringend", 400, false, "var(--color-crimson)"],
  ["ticketType", "bug", "Bug", 100, false, "var(--color-crimson)"],
  ["ticketType", "improvement", "Verbesserung", 200, false, "var(--color-teal)"],
  ["ticketType", "question", "Frage", 300, false, "var(--color-violet)"],
  ["ticketType", "task", "Aufgabe", 400, false, "var(--color-steel-500)"]
];

export async function seedDefaultCatalogEntries(database: DbClient): Promise<void> {
  const now = nowIso();
  for (const [kind, key, label, sortOrder, isClosed, color] of DEFAULT_CATALOG_ENTRIES) {
    await database.insert(catalogEntries)
      .ignore()
      .values({ kind, key, label, sortOrder, isClosed, color, version: 1, createdAt: now, updatedAt: now });
  }
}

export async function listCatalogEntries(database: DbClient, kind?: string): Promise<CatalogEntry[]> {
  if (kind !== undefined) {
    assertCatalogKind(kind);
    return (await catalogRepository.findByKind(database, kind)).map(mapCatalogEntry);
  }
  return (await catalogRepository.findAll(database)).map(mapCatalogEntry);
}

export async function ensureCatalogEntryExists(database: DbClient, kind: CatalogKind, key: string): Promise<void> {
  if (!(await catalogRepository.findByKindAndKey(database, kind, key))) {
    throw badRequest(`Catalog entry "${key}" does not exist in ${kind}`);
  }
}

export async function resolveDefaultCatalogEntryKey(database: DbClient, kind: CatalogKind, preferredKey: string): Promise<string> {
  const preferred = await catalogRepository.findByKindAndKey(database, kind, preferredKey);
  if (preferred) {
    return preferred.key;
  }
  const fallback = await catalogRepository.findLowestByKind(database, kind);
  if (!fallback) {
    throw badRequest(`Catalog ${kind} has no entries`);
  }
  return fallback.key;
}

export async function isCatalogEntryClosed(database: DbClient, kind: CatalogKind, key: string): Promise<boolean> {
  return (await catalogRepository.findByKindAndKey(database, kind, key))?.isClosed ?? false;
}

export async function listClosedCatalogEntryKeys(database: DbClient, kind: CatalogKind): Promise<Set<string>> {
  return new Set((await catalogRepository.findByKind(database, kind)).filter((entry) => entry.isClosed).map((entry) => entry.key));
}

export async function createCatalogEntry(database: DbClient, kind: string, input: CatalogEntryInput): Promise<CatalogEntry> {
  assertCatalogKind(kind);
  const key = normalizeCatalogKey(input.key);
  const label = requireNonEmpty(input.label, "label");
  if (await catalogRepository.findByKindAndKey(database, kind, key)) {
    throw conflict(`Catalog entry "${key}" already exists in ${kind}`);
  }

  const created = await catalogRepository.create(database, {
    kind,
    key,
    label,
    sortOrder: await resolveSortOrder(database, kind, input.sortOrder),
    isClosed: isStatusCatalog(kind) ? input.isClosed ?? false : false,
    color: normalizeCatalogColor(input.color, kind, key)
  });

  return mapCatalogEntry(created);
}

export async function updateCatalogEntry(database: DbClient, kind: string, id: number, input: CatalogEntryUpdate): Promise<CatalogEntry> {
  assertCatalogKind(kind);
  const current = await catalogRepository.findById(database, id);
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

  const updated = await catalogRepository.update(database, id, input.expectedVersion, values);
  if (!updated) {
    throw notFound(`Catalog entry with id ${id} not found`);
  }
  return mapCatalogEntry(updated);
}

export async function deleteCatalogEntry(database: DbClient, kind: string, id: number): Promise<void> {
  assertCatalogKind(kind);
  const entry = await catalogRepository.findById(database, id);
  if (!entry || entry.kind !== kind) {
    throw notFound(`Catalog entry with id ${id} not found`);
  }

  const fallback = await catalogRepository.findLowestByKind(database, kind, id);
  if (!fallback) {
    throw badRequest("Cannot delete the last catalog entry");
  }

  await database.transaction(async (tx) => {
    if (kind === "workStatus") {
      await setWorkStatusFallback(tx, entry.key, fallback);
    } else if (kind === "featureStatus") {
      await setFeatureStatusFallback(tx, entry.key, fallback);
    } else if (kind === "priority") {
      await setPriorityFallback(tx, entry.key, fallback);
    } else {
      await setTicketTypeFallback(tx, entry.key, fallback);
    }
    await catalogRepository.delete(tx, id);
  });
}
