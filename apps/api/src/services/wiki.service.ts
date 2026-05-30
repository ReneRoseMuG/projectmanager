import type { JsonValue, WikiPageRelationSummary } from "@taskmanager/shared-types";
import { and, eq, inArray, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { wikiPageAttachments, wikiPageRelations, wikiPageTasks, wikiPageTickets } from "../db/schema.js";
import { firstRow } from "../db/query-utils.js";
import { assertVersion } from "../repositories/base.repository.js";
import type { JournalChangeCreateData } from "../repositories/journal.repository.js";
import { wikiPageRepository, type WikiPageRecord, type WikiPageUpdateData } from "../repositories/wiki-page.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { readContentFromDb } from "./content.service.js";
import { requireNonEmpty } from "./helpers.js";
import { deleteWikiPageCommentsForIds } from "./comments.service.js";
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

async function getWikiPageRecord(database: DbClient, id: number): Promise<WikiPageRecord> {
  const page = await wikiPageRepository.findById(database, id);
  if (!page) {
    throw notFound(`Wiki page with id ${id} not found`);
  }
  return page;
}

async function childCount(database: DbClient, id: number): Promise<number> {
  return (await wikiPageRepository.findChildren(database, id)).length;
}

async function getWikiPageSupportCounts(database: DbClient, wikiPageIds: number[]): Promise<Map<number, WikiPageSupportCounts>> {
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

  const [attachmentRows, taskRows, ticketRows] = await Promise.all([
    database.select({ wikiPageId: wikiPageAttachments.wikiPageId }).from(wikiPageAttachments).where(inArray(wikiPageAttachments.wikiPageId, wikiPageIds)),
    database.select({ wikiPageId: wikiPageTasks.ownerId }).from(wikiPageTasks).where(inArray(wikiPageTasks.ownerId, wikiPageIds)),
    database.select({ wikiPageId: wikiPageTickets.ownerId }).from(wikiPageTickets).where(inArray(wikiPageTickets.ownerId, wikiPageIds))
  ]);

  for (const row of attachmentRows) {
    ensureCounts(row.wikiPageId).attachmentCount += 1;
  }
  for (const row of taskRows) {
    ensureCounts(row.wikiPageId).taskCount += 1;
  }
  for (const row of ticketRows) {
    ensureCounts(row.wikiPageId).ticketCount += 1;
  }

  return counts;
}

async function ensureParentExists(database: DbClient, parentId: number | null | undefined, pageId?: number): Promise<void> {
  if (parentId === undefined || parentId === null) {
    return;
  }
  if (parentId === pageId) {
    throw badRequest("A wiki page cannot be its own parent");
  }
  await getWikiPageRecord(database, parentId);
}

async function readWikiContent(database: DbClient, record: WikiPageRecord): Promise<string> {
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

async function findWikiPageRelation(database: DbClient, sourceWikiPageId: number, targetWikiPageId: number) {
  const [normalizedSourceId, normalizedTargetId] = normalizeWikiPageRelationIds(sourceWikiPageId, targetWikiPageId);
  return firstRow(await database
    .select()
    .from(wikiPageRelations)
    .where(and(eq(wikiPageRelations.sourceWikiPageId, normalizedSourceId), eq(wikiPageRelations.targetWikiPageId, normalizedTargetId))));
}

function relatedPageSummary(record: WikiPageRecord): WikiPageRelationSummary {
  return {
    id: record.id,
    title: record.title,
    parentId: record.parentId
  };
}

async function readWikiPageRelations(database: DbClient, wikiPageId: number): Promise<WikiPageRelationSummary[]> {
  const rows = await database
    .select({
      sourceWikiPageId: wikiPageRelations.sourceWikiPageId,
      targetWikiPageId: wikiPageRelations.targetWikiPageId
    })
    .from(wikiPageRelations)
    .where(or(eq(wikiPageRelations.sourceWikiPageId, wikiPageId), eq(wikiPageRelations.targetWikiPageId, wikiPageId)));

  const relatedIds = rows.map((row) => (row.sourceWikiPageId === wikiPageId ? row.targetWikiPageId : row.sourceWikiPageId));
  const result: WikiPageRelationSummary[] = [];
  for (const relatedWikiPageId of relatedIds) {
    const record = await wikiPageRepository.findById(database, relatedWikiPageId);
    if (record) {
      result.push(relatedPageSummary(record));
    }
  }
  return result;
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

async function wikiContexts(database: DbClient, record: WikiPageRecord) {
  if (!record.parentId) {
    return [];
  }
  return [makeJournalContext(wikiJournalObject(await getWikiPageRecord(database, record.parentId)), "parent" as const)];
}

export async function listRootWikiPages(database: DbClient): Promise<WikiPageDto[]> {
  const pages = await wikiPageRepository.findRootPages(database);
  const supportCounts = await getWikiPageSupportCounts(database, pages.map((page) => page.id));
  return Promise.all(pages.map(async (page) => mapWikiPage(page, await childCount(database, page.id), undefined, supportCounts.get(page.id) ?? emptyWikiPageSupportCounts)));
}

export async function listWikiChildren(database: DbClient, id: number): Promise<WikiPageDto[]> {
  await getWikiPageRecord(database, id);
  const pages = await wikiPageRepository.findChildren(database, id);
  const supportCounts = await getWikiPageSupportCounts(database, pages.map((page) => page.id));
  return Promise.all(pages.map(async (page) => mapWikiPage(page, await childCount(database, page.id), undefined, supportCounts.get(page.id) ?? emptyWikiPageSupportCounts)));
}

export async function getWikiPage(database: DbClient, id: number): Promise<WikiPageDto> {
  const page = await getWikiPageRecord(database, id);
  const [cnt, supportCounts, content, relatedPages] = await Promise.all([
    childCount(database, id),
    getWikiPageSupportCounts(database, [id]).then((m) => m.get(id) ?? emptyWikiPageSupportCounts),
    readWikiContent(database, page),
    readWikiPageRelations(database, id)
  ]);
  return mapWikiPage(page, cnt, content, supportCounts, relatedPages);
}

export async function createWikiPage(database: DbClient, input: WikiPageInput, actor?: JournalActor | null): Promise<WikiPageDto> {
  const title = requireNonEmpty(input.title, "title");
  await ensureParentExists(database, input.parentId);

  const content = input.content ?? "";
  const created = await database.transaction(async (tx) => {
    const page = await wikiPageRepository.create(
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
    await recordJournalEntry(tx, {
      operation: "create",
      object: journalObject,
      summary: buildCreateSummary(journalObject),
      actor,
      contexts: await wikiContexts(database, page)
    });
    return page;
  });
  return mapWikiPage(created, 0, content);
}

export async function updateWikiPage(database: DbClient, id: number, input: WikiPageInput, actor?: JournalActor | null): Promise<WikiPageDto> {
  const current = await getWikiPageRecord(database, id);
  const previousContent = await readWikiContent(database, current);
  assertVersion(current.version, input.expectedVersion ?? 0);
  const values: WikiPageUpdateData = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.parentId !== undefined) {
    await ensureParentExists(database, input.parentId, id);
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

  const updated = await database.transaction(async (tx) => {
    const page = await wikiPageRepository.update(tx, id, input.expectedVersion ?? 0, values, actor?.actorUserId ?? undefined);
    if (!page) {
      throw notFound(`Wiki page with id ${id} not found`);
    }
    const relationFields: Array<JournalFieldDefinition<WikiPageRecord>> = [
      {
        key: "parentId",
        label: "Übergeordnete Wiki-Seite",
        format: (value) => (typeof value === "number" ? `Wiki-Seite ${value}` : null)
      }
    ];
    const nextContent = input.content ?? previousContent;
    const journalObject = wikiJournalObject(page);
    const changes = [...buildJournalChanges(current, page, [...relationFields, ...wikiJournalFields]), ...buildContentChange(previousContent, nextContent)];
    await recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes,
      contexts: await wikiContexts(database, page)
    });
    return page;
  });
  if (!updated) {
    throw notFound(`Wiki page with id ${id} not found`);
  }
  const [cnt, supportCounts, content, relatedPages] = await Promise.all([
    childCount(database, id),
    getWikiPageSupportCounts(database, [id]).then((m) => m.get(id) ?? emptyWikiPageSupportCounts),
    input.content !== undefined ? Promise.resolve(input.content) : readWikiContent(database, updated),
    readWikiPageRelations(database, id)
  ]);
  return mapWikiPage(updated, cnt, content, supportCounts, relatedPages);
}

export async function deleteWikiPage(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const page = await getWikiPageRecord(database, id);
  if (await childCount(database, id) > 0) {
    throw conflict("Wiki page has child pages");
  }

  await deleteWikiPageNotesForIds(database, [id]);
  await deleteWikiPageCommentsForIds(database, [id]);

  await database.transaction(async (tx) => {
    const journalObject = wikiJournalObject(page);
    await recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: await wikiContexts(database, page)
    });
    await wikiPageRepository.delete(tx, id);
  });
}

export async function listWikiPageRelations(database: DbClient, id: number): Promise<WikiPageRelationSummary[]> {
  await getWikiPageRecord(database, id);
  return readWikiPageRelations(database, id);
}

export async function addWikiPageRelation(database: DbClient, id: number, targetWikiPageId: number, actor?: JournalActor | null): Promise<WikiPageRelationSummary[]> {
  const sourcePage = await getWikiPageRecord(database, id);
  const targetPage = await getWikiPageRecord(database, targetWikiPageId);
  const [normalizedSourceId, normalizedTargetId] = normalizeWikiPageRelationIds(id, targetWikiPageId);
  if (await findWikiPageRelation(database, id, targetWikiPageId)) {
    throw conflict("Wiki page relation already exists");
  }

  await database.transaction(async (tx) => {
    await tx.insert(wikiPageRelations)
      .values({
        sourceWikiPageId: normalizedSourceId,
        targetWikiPageId: normalizedTargetId
      });
    const sourceObject = wikiJournalObject(sourcePage);
    const targetObject = wikiJournalObject(targetPage);
    await recordJournalEntry(tx, {
      operation: "link",
      object: sourceObject,
      summary: buildLinkSummary(sourceObject, targetObject),
      actor,
      contexts: [makeJournalContext(targetObject, "related")]
    });
  });

  return readWikiPageRelations(database, id);
}

export async function removeWikiPageRelation(database: DbClient, id: number, targetWikiPageId: number, actor?: JournalActor | null): Promise<WikiPageRelationSummary[]> {
  const sourcePage = await getWikiPageRecord(database, id);
  const targetPage = await getWikiPageRecord(database, targetWikiPageId);
  const [normalizedSourceId, normalizedTargetId] = normalizeWikiPageRelationIds(id, targetWikiPageId);
  if (!await findWikiPageRelation(database, id, targetWikiPageId)) {
    throw notFound(`Wiki page relation between ${id} and ${targetWikiPageId} not found`);
  }

  await database.transaction(async (tx) => {
    await tx.delete(wikiPageRelations)
      .where(and(eq(wikiPageRelations.sourceWikiPageId, normalizedSourceId), eq(wikiPageRelations.targetWikiPageId, normalizedTargetId)));
    const sourceObject = wikiJournalObject(sourcePage);
    const targetObject = wikiJournalObject(targetPage);
    await recordJournalEntry(tx, {
      operation: "unlink",
      object: sourceObject,
      summary: buildUnlinkSummary(sourceObject, targetObject),
      actor,
      contexts: [makeJournalContext(targetObject, "related")]
    });
  });

  return readWikiPageRelations(database, id);
}

export async function getWikiBreadcrumb(database: DbClient, id: number): Promise<WikiBreadcrumbDto[]> {
  const breadcrumb: WikiBreadcrumbDto[] = [];
  let current: WikiPageRecord | undefined = await getWikiPageRecord(database, id);
  const visited = new Set<number>();

  while (current) {
    if (visited.has(current.id)) {
      throw badRequest("Wiki parent chain contains a cycle");
    }
    visited.add(current.id);
    breadcrumb.unshift({ id: current.id, title: current.title });
    current = current.parentId === null ? undefined : await getWikiPageRecord(database, current.parentId);
  }

  return breadcrumb;
}
