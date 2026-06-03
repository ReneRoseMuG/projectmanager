import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

// ─── Wiki Export ──────────────────────────────────────────────────────────────

export interface WikiExportResult {
  filesWritten: number;
  exportPath: string;
}

function toSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "seite";
}

function resolveExportPath(rawPath: string): string {
  if (rawPath.startsWith("~")) {
    return path.join(os.homedir(), rawPath.slice(1));
  }
  return path.resolve(rawPath);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildSlugMap(pages: WikiPageRecord[]): Map<number, string> {
  const slugCounts = new Map<string, number>();
  const slugMap = new Map<number, string>();
  for (const page of pages) {
    const base = toSlug(page.title);
    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);
    slugMap.set(page.id, count === 0 ? base : `${base}-${page.id}`);
  }
  return slugMap;
}

function buildPathMap(pages: WikiPageRecord[], slugMap: Map<number, string>): Map<number, string> {
  const idMap = new Map(pages.map((p) => [p.id, p]));
  const pathMap = new Map<number, string>();

  function getRelPath(id: number): string {
    const cached = pathMap.get(id);
    if (cached !== undefined) return cached;
    const page = idMap.get(id);
    if (!page) return String(id);
    const slug = slugMap.get(id) ?? String(id);
    const result = page.parentId !== null && idMap.has(page.parentId)
      ? `${getRelPath(page.parentId)}/${slug}`
      : slug;
    pathMap.set(id, result);
    return result;
  }

  for (const page of pages) getRelPath(page.id);
  return pathMap;
}

function resolveWikiLinks(html: string, currentRelPath: string, pathMap: Map<number, string>): string {
  const depth = currentRelPath.split("/").length;
  const prefix = depth > 1 ? Array(depth).fill("..").join("/") + "/" : "";
  return html.replace(/href="wiki:\/\/(\d+)"/g, (_m, idStr: string) => {
    const targetPath = pathMap.get(Number(idStr));
    return targetPath ? `href="${prefix}${targetPath}/index.html"` : `href="#"`;
  });
}

const EXPORT_CSS = `
body { font-family: Inter, system-ui, sans-serif; margin: 0; background: #F4F7FA; color: #0F2542; }
main { max-width: 860px; margin: 2rem auto; background: #fff; border-radius: 0.5rem; padding: 2rem 2.5rem; box-shadow: 0 10px 28px rgba(15,37,66,0.08); }
h1.page-title { font-size: 1.75rem; font-weight: 800; margin: 0 0 1.5rem; padding-bottom: 0.6rem; border-bottom: 2px solid #D5DEE9; color: #0F2542; }
.rich-text-surface { color: #0F2542; font-size: 0.95rem; line-height: 1.7; }
.rich-text-surface > *:first-child { margin-top: 0; }
.rich-text-surface > *:last-child { margin-bottom: 0; }
.rich-text-surface h1,.rich-text-surface h2,.rich-text-surface h3,.rich-text-surface h4 { color: #0F2542; font-weight: 700; line-height: 1.25; }
.rich-text-surface h1 { margin: 1.25rem 0 0.75rem; border-bottom: 1px solid #D5DEE9; padding-bottom: 0.45rem; font-size: 1.5rem; }
.rich-text-surface h2 { margin: 1.1rem 0 0.6rem; font-size: 1.2rem; }
.rich-text-surface h3 { margin: 1rem 0 0.45rem; font-size: 1.05rem; }
.rich-text-surface h4 { margin: 0.85rem 0 0.35rem; color: #1B355C; font-size: 0.95rem; }
.rich-text-surface p { margin: 0.65rem 0; }
.rich-text-surface ul,.rich-text-surface ol { margin: 0.65rem 0; padding-left: 1.35rem; }
.rich-text-surface ul { list-style: disc; }
.rich-text-surface ol { list-style: decimal; }
.rich-text-surface li { margin: 0.25rem 0; }
.rich-text-surface code { border-radius: 0.3rem; background: #E8EFF5; padding: 0.1rem 0.3rem; color: #1B355C; font-size: 0.86em; }
.rich-text-surface blockquote { margin: 0.8rem 0; border-left: 3px solid #BACDE3; padding-left: 0.9rem; color: #4682B4; }
.rich-text-surface hr { margin: 1rem 0; border: 0; border-top: 1px solid #D5DEE9; }
.rich-text-surface a { color: #2F8E96; text-decoration: underline; }
.rich-text-column-block { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(14rem,100%),1fr)); gap: 1rem; margin: 0.9rem 0; }
.rich-text-column { min-width: 0; border-left: 2px solid #D5DEE9; padding-left: 0.75rem; }
.tiptap-img { max-width: 100%; border-radius: 0.25rem; }
.tiptap-img-float-left { float: left; margin: 0 1rem 0.5rem 0; }
.tiptap-img-float-right { float: right; margin: 0 0 0.5rem 1rem; }
.tiptap-img-center { display: block; margin-left: auto; margin-right: auto; }
.rich-text-surface::after { content: ""; display: table; clear: both; }
`;

function buildHtmlDocument(title: string, resolvedContent: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>${EXPORT_CSS}</style>
</head>
<body>
<main>
<h1 class="page-title">${escapeHtml(title)}</h1>
<div class="rich-text-surface">${resolvedContent}</div>
</main>
</body>
</html>`;
}

export async function exportAllWikiPages(database: DbClient, rawExportPath: string): Promise<WikiExportResult> {
  const exportPath = resolveExportPath(rawExportPath);
  const allPages = await wikiPageRepository.findAll(database);

  const pagesWithContent = await Promise.all(
    allPages.map(async (page) => ({
      ...page,
      content: await readContentFromDb(database, page.id, "wiki")
    }))
  );

  const slugMap = buildSlugMap(allPages);
  const pathMap = buildPathMap(allPages, slugMap);

  let filesWritten = 0;
  for (const page of pagesWithContent) {
    const relPath = pathMap.get(page.id) ?? String(page.id);
    const resolvedContent = resolveWikiLinks(page.content, relPath, pathMap);
    const html = buildHtmlDocument(page.title, resolvedContent);
    const filePath = path.join(exportPath, relPath, "index.html");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, html, "utf-8");
    filesWritten++;
  }

  return { filesWritten, exportPath };
}
