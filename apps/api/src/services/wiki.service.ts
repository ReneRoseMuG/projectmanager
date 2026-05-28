import type { JsonValue, WikiPageRelationSummary } from "@taskmanager/shared-types";
import { and, eq, inArray, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { wikiPageAttachments, wikiPageRelations, wikiPageTasks, wikiPageTickets } from "../db/schema.js";
import { assertVersion } from "../repositories/base.repository.js";
import type { JournalChangeCreateData } from "../repositories/journal.repository.js";
import { wikiPageRepository, type WikiPageRecord, type WikiPageUpdateData } from "../repositories/wiki-page.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { readContentFromDb } from "./content.service.js";
import { requireNonEmpty } from "./helpers.js";
import { deleteWikiPageNotesForIds } from "./notes.service.js";
import {
  buildLinkSummary,
  buildCreateSummary,
  buildDeleteSummary,
  buildJournalChanges,
  buildUnlinkSummary,
  buildUpdateSummary,
  makeJournalContext,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor,
  type JournalFieldDefinition,
  type JournalObjectRef
} from "./journal.service.js";

export interface WikiPageInput {
  parentId?: number | null;
  title?: string;
  content?: string;
  sortOrder?: number;
  expectedVersion?: number;
}

export interface WikiPageDto {
  id: number;
  parentId: number | null;
  title: string;
  content?: string;
  sortOrder: number;
  version: number;
  childCount: number;
  attachmentCount: number;
  taskCount: number;
  ticketCount: number;
  relatedPages: WikiPageRelationSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface WikiBreadcrumbDto {
  id: number;
  title: string;
}

const wikiJournalFields: Array<JournalFieldDefinition<WikiPageRecord>> = [
  { key: "title", label: "Titel" },
  { key: "sortOrder", label: "Sortierung" }
];

interface WikiPageSupportCounts {
  attachmentCount: number;
  taskCount: number;
  ticketCount: number;
}

const emptyWikiPageSupportCounts: WikiPageSupportCounts = {
  attachmentCount: 0,
  taskCount: 0,
  ticketCount: 0
};

function mapWikiPage(
  record: WikiPageRecord,
  childCount: number,
  content?: string,
  supportCounts = emptyWikiPageSupportCounts,
  relatedPages: WikiPageRelationSummary[] = []
): WikiPageDto {
  return {
    id: record.id,
    parentId: record.parentId,
    title: record.title,
    content,
    sortOrder: record.sortOrder,
    version: record.version,
    childCount,
    attachmentCount: supportCounts.attachmentCount,
    taskCount: supportCounts.taskCount,
    ticketCount: supportCounts.ticketCount,
    relatedPages,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function getWikiPageRecord(database: DbClient, id: number): WikiPageRecord {
  const page = wikiPageRepository.findById(database, id);
  if (!page) {
    throw notFound(`Wiki page with id ${id} not found`);
  }
  return page;
}

function childCount(database: DbClient, id: number): number {
  return wikiPageRepository.findChildren(database, id).length;
}

function getWikiPageSupportCounts(database: DbClient, wikiPageIds: number[]): Map<number, WikiPageSupportCounts> {
  const counts = new Map<number, WikiPageSupportCounts>();
  if (wikiPageIds.length === 0) {
    return counts;
  }

  const ensureCounts = (wikiPageId: number): WikiPageSupportCounts => {
    const current = counts.get(wikiPageId);
    if (current) {
      return current;
    }
    const nextCounts = { ...emptyWikiPageSupportCounts };
    counts.set(wikiPageId, nextCounts);
    return nextCounts;
  };

  const attachmentRows = database
    .select({ wikiPageId: wikiPageAttachments.wikiPageId })
    .from(wikiPageAttachments)
    .where(inArray(wikiPageAttachments.wikiPageId, wikiPageIds))
    .all();
  for (const row of attachmentRows) {
    ensureCounts(row.wikiPageId).attachmentCount += 1;
  }

  const taskRows = database
    .select({ wikiPageId: wikiPageTasks.ownerId })
    .from(wikiPageTasks)
    .where(inArray(wikiPageTasks.ownerId, wikiPageIds))
    .all();
  for (const row of taskRows) {
    ensureCounts(row.wikiPageId).taskCount += 1;
  }

  const ticketRows = database
    .select({ wikiPageId: wikiPageTickets.ownerId })
    .from(wikiPageTickets)
    .where(inArray(wikiPageTickets.ownerId, wikiPageIds))
    .all();
  for (const row of ticketRows) {
    ensureCounts(row.wikiPageId).ticketCount += 1;
  }

  return counts;
}

function ensureParentExists(database: DbClient, parentId: number | null | undefined, pageId?: number): void {
  if (parentId === undefined || parentId === null) {
    return;
  }
  if (parentId === pageId) {
    throw badRequest("A wiki page cannot be its own parent");
  }
  getWikiPageRecord(database, parentId);
}

function readWikiContent(database: DbClient, record: WikiPageRecord): string {
  return readContentFromDb(database, record.id, "wiki");
}

function wikiJournalObject(record: WikiPageRecord): JournalObjectRef {
  return makeJournalObject("wikiPage", record.id, record.title);
}

function normalizeWikiPageRelationIds(sourceWikiPageId: number, targetWikiPageId: number): [number, number] {
  if (sourceWikiPageId === targetWikiPageId) {
    throw badRequest("A wiki page cannot be related to itself");
  }
  return sourceWikiPageId < targetWikiPageId ? [sourceWikiPageId, targetWikiPageId] : [targetWikiPageId, sourceWikiPageId];
}

function findWikiPageRelation(database: DbClient, sourceWikiPageId: number, targetWikiPageId: number) {
  const [normalizedSourceId, normalizedTargetId] = normalizeWikiPageRelationIds(sourceWikiPageId, targetWikiPageId);
  return database
    .select()
    .from(wikiPageRelations)
    .where(and(eq(wikiPageRelations.sourceWikiPageId, normalizedSourceId), eq(wikiPageRelations.targetWikiPageId, normalizedTargetId)))
    .get();
}

function relatedPageSummary(record: WikiPageRecord): WikiPageRelationSummary {
  return {
    id: record.id,
    title: record.title,
    parentId: record.parentId
  };
}

function readWikiPageRelations(database: DbClient, wikiPageId: number): WikiPageRelationSummary[] {
  const rows = database
    .select({
      sourceWikiPageId: wikiPageRelations.sourceWikiPageId,
      targetWikiPageId: wikiPageRelations.targetWikiPageId
    })
    .from(wikiPageRelations)
    .where(or(eq(wikiPageRelations.sourceWikiPageId, wikiPageId), eq(wikiPageRelations.targetWikiPageId, wikiPageId)))
    .all();

  return rows
    .map((row) => (row.sourceWikiPageId === wikiPageId ? row.targetWikiPageId : row.sourceWikiPageId))
    .map((relatedWikiPageId) => wikiPageRepository.findById(database, relatedWikiPageId))
    .filter((record): record is WikiPageRecord => Boolean(record))
    .map(relatedPageSummary);
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

function wikiContexts(database: DbClient, record: WikiPageRecord) {
  return [...(record.parentId ? [makeJournalContext(wikiJournalObject(getWikiPageRecord(database, record.parentId)), "parent" as const)] : [])];
}

export function listRootWikiPages(database: DbClient): WikiPageDto[] {
  const pages = wikiPageRepository.findRootPages(database);
  const supportCounts = getWikiPageSupportCounts(database, pages.map((page) => page.id));
  return pages.map((page) => mapWikiPage(page, childCount(database, page.id), undefined, supportCounts.get(page.id) ?? emptyWikiPageSupportCounts));
}

export function listWikiChildren(database: DbClient, id: number): WikiPageDto[] {
  getWikiPageRecord(database, id);
  const pages = wikiPageRepository.findChildren(database, id);
  const supportCounts = getWikiPageSupportCounts(database, pages.map((page) => page.id));
  return pages.map((page) => mapWikiPage(page, childCount(database, page.id), undefined, supportCounts.get(page.id) ?? emptyWikiPageSupportCounts));
}

export function getWikiPage(database: DbClient, id: number): WikiPageDto {
  const page = getWikiPageRecord(database, id);
  const supportCounts = getWikiPageSupportCounts(database, [id]).get(id) ?? emptyWikiPageSupportCounts;
  return mapWikiPage(page, childCount(database, id), readWikiContent(database, page), supportCounts, readWikiPageRelations(database, id));
}

export function createWikiPage(database: DbClient, input: WikiPageInput, actor?: JournalActor | null): WikiPageDto {
  const title = requireNonEmpty(input.title, "title");
  ensureParentExists(database, input.parentId);

  const content = input.content ?? "";
  const created = database.transaction((tx) => {
    const page = wikiPageRepository.create(
      tx,
      {
        parentId: input.parentId ?? null,
        title,
        content,
        sortOrder: input.sortOrder ?? 0
      },
      actor?.actorUserId ?? undefined
    );
      const journalObject = wikiJournalObject(page);
      recordJournalEntry(tx, {
        operation: "create",
        object: journalObject,
        summary: buildCreateSummary(journalObject),
        actor,
        contexts: wikiContexts(database, page)
      });
    return page;
  });
  return mapWikiPage(created, 0, content);
}

export function updateWikiPage(database: DbClient, id: number, input: WikiPageInput, actor?: JournalActor | null): WikiPageDto {
  const current = getWikiPageRecord(database, id);
  const previousContent = readWikiContent(database, current);
  assertVersion(current.version, input.expectedVersion ?? 0);
  const values: WikiPageUpdateData = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.parentId !== undefined) {
    ensureParentExists(database, input.parentId, id);
    values.parentId = input.parentId;
  }
  if (input.sortOrder !== undefined) {
    values.sortOrder = input.sortOrder;
  }

  if (Object.keys(values).length === 0 && input.content === undefined) {
    throw badRequest("No wiki page fields provided");
  }

  if (input.content !== undefined) {
    values.content = input.content;
  }

  const updated = database.transaction((tx) => {
    const page = wikiPageRepository.update(tx, id, input.expectedVersion ?? 0, values, actor?.actorUserId ?? undefined);
    if (!page) {
      throw notFound(`Wiki page with id ${id} not found`);
    }
    const relationFields: Array<JournalFieldDefinition<WikiPageRecord>> = [
      {
        key: "parentId",
        label: "Übergeordnete Wiki-Seite",
        format: (value) => (typeof value === "number" ? wikiJournalObject(getWikiPageRecord(database, value)).label : null)
      }
    ];
    const nextContent = input.content ?? previousContent;
    const journalObject = wikiJournalObject(page);
    const changes = [...buildJournalChanges(current, page, [...relationFields, ...wikiJournalFields]), ...buildContentChange(previousContent, nextContent)];
    recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes,
      contexts: wikiContexts(database, page)
    });
    return page;
  });
  if (!updated) {
    throw notFound(`Wiki page with id ${id} not found`);
  }
  const supportCounts = getWikiPageSupportCounts(database, [id]).get(id) ?? emptyWikiPageSupportCounts;
  return mapWikiPage(updated, childCount(database, id), input.content ?? readWikiContent(database, updated), supportCounts, readWikiPageRelations(database, id));
}

export function deleteWikiPage(database: DbClient, id: number, actor?: JournalActor | null): void {
  const page = getWikiPageRecord(database, id);
  if (childCount(database, id) > 0) {
    throw conflict("Wiki page has child pages");
  }

  deleteWikiPageNotesForIds(database, [id]);

  database.transaction((tx) => {
    const journalObject = wikiJournalObject(page);
    recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: wikiContexts(database, page)
    });
    wikiPageRepository.delete(tx, id);
  });
}

export function listWikiPageRelations(database: DbClient, id: number): WikiPageRelationSummary[] {
  getWikiPageRecord(database, id);
  return readWikiPageRelations(database, id);
}

export function addWikiPageRelation(database: DbClient, id: number, targetWikiPageId: number, actor?: JournalActor | null): WikiPageRelationSummary[] {
  const sourcePage = getWikiPageRecord(database, id);
  const targetPage = getWikiPageRecord(database, targetWikiPageId);
  const [normalizedSourceId, normalizedTargetId] = normalizeWikiPageRelationIds(id, targetWikiPageId);
  if (findWikiPageRelation(database, id, targetWikiPageId)) {
    throw conflict("Wiki page relation already exists");
  }

  database.transaction((tx) => {
    tx.insert(wikiPageRelations)
      .values({
        sourceWikiPageId: normalizedSourceId,
        targetWikiPageId: normalizedTargetId
      })
      .run();
    const sourceObject = wikiJournalObject(sourcePage);
    const targetObject = wikiJournalObject(targetPage);
    recordJournalEntry(tx, {
      operation: "link",
      object: sourceObject,
      summary: buildLinkSummary(sourceObject, targetObject),
      actor,
      contexts: [makeJournalContext(targetObject, "related")]
    });
  });

  return readWikiPageRelations(database, id);
}

export function removeWikiPageRelation(database: DbClient, id: number, targetWikiPageId: number, actor?: JournalActor | null): WikiPageRelationSummary[] {
  const sourcePage = getWikiPageRecord(database, id);
  const targetPage = getWikiPageRecord(database, targetWikiPageId);
  const [normalizedSourceId, normalizedTargetId] = normalizeWikiPageRelationIds(id, targetWikiPageId);
  if (!findWikiPageRelation(database, id, targetWikiPageId)) {
    throw notFound(`Wiki page relation between ${id} and ${targetWikiPageId} not found`);
  }

  database.transaction((tx) => {
    tx.delete(wikiPageRelations)
      .where(and(eq(wikiPageRelations.sourceWikiPageId, normalizedSourceId), eq(wikiPageRelations.targetWikiPageId, normalizedTargetId)))
      .run();
    const sourceObject = wikiJournalObject(sourcePage);
    const targetObject = wikiJournalObject(targetPage);
    recordJournalEntry(tx, {
      operation: "unlink",
      object: sourceObject,
      summary: buildUnlinkSummary(sourceObject, targetObject),
      actor,
      contexts: [makeJournalContext(targetObject, "related")]
    });
  });

  return readWikiPageRelations(database, id);
}

export function getWikiBreadcrumb(database: DbClient, id: number): WikiBreadcrumbDto[] {
  const breadcrumb: WikiBreadcrumbDto[] = [];
  let current: WikiPageRecord | undefined = getWikiPageRecord(database, id);
  const visited = new Set<number>();

  while (current) {
    if (visited.has(current.id)) {
      throw badRequest("Wiki parent chain contains a cycle");
    }
    visited.add(current.id);
    breadcrumb.unshift({ id: current.id, title: current.title });
    current = current.parentId === null ? undefined : getWikiPageRecord(database, current.parentId);
  }

  return breadcrumb;
}
