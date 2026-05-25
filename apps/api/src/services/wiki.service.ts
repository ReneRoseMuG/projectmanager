import type { JsonValue } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { assertVersion } from "../repositories/base.repository.js";
import type { JournalChangeCreateData } from "../repositories/journal.repository.js";
import { wikiPageRepository, type WikiPageRecord, type WikiPageUpdateData } from "../repositories/wiki-page.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import {
  buildFilename,
  buildStoredContentPath,
  deleteContent,
  readContent,
  resolveContentPath,
  resolveStoredContentPath,
  writeContent
} from "./content.service.js";
import { requireNonEmpty } from "./helpers.js";
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
  contentPath: string | null;
  sortOrder: number;
  version: number;
  childCount: number;
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

function mapWikiPage(record: WikiPageRecord, childCount: number, content?: string): WikiPageDto {
  return {
    id: record.id,
    parentId: record.parentId,
    title: record.title,
    content,
    contentPath: record.contentPath,
    sortOrder: record.sortOrder,
    version: record.version,
    childCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function wikiFilename(id: number): string {
  return buildFilename("wiki-page", id);
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

function ensureParentExists(database: DbClient, parentId: number | null | undefined, pageId?: number): void {
  if (parentId === undefined || parentId === null) {
    return;
  }
  if (parentId === pageId) {
    throw badRequest("A wiki page cannot be its own parent");
  }
  getWikiPageRecord(database, parentId);
}

function readWikiContent(record: WikiPageRecord): string {
  return record.contentPath ? readContent(resolveStoredContentPath(record.contentPath)) : "";
}

function wikiJournalObject(record: WikiPageRecord): JournalObjectRef {
  return makeJournalObject("wikiPage", record.id, record.title);
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
  return wikiPageRepository.findRootPages(database).map((page) => mapWikiPage(page, childCount(database, page.id)));
}

export function listWikiChildren(database: DbClient, id: number): WikiPageDto[] {
  getWikiPageRecord(database, id);
  return wikiPageRepository.findChildren(database, id).map((page) => mapWikiPage(page, childCount(database, page.id)));
}

export function getWikiPage(database: DbClient, id: number): WikiPageDto {
  const page = getWikiPageRecord(database, id);
  return mapWikiPage(page, childCount(database, id), readWikiContent(page));
}

export function createWikiPage(database: DbClient, input: WikiPageInput, actor?: JournalActor | null): WikiPageDto {
  const title = requireNonEmpty(input.title, "title");
  ensureParentExists(database, input.parentId);

  const created = wikiPageRepository.create(
    database,
    {
      parentId: input.parentId ?? null,
      title,
      contentPath: null,
      sortOrder: input.sortOrder ?? 0
    },
    actor?.actorUserId ?? undefined
  );

  const filename = wikiFilename(created.id);
  const absolutePath = resolveContentPath("wiki", filename);
  const storedPath = buildStoredContentPath("wiki", filename);

  try {
    writeContent(absolutePath, input.content ?? "");
    const updated = database.transaction((tx) => {
      const page = wikiPageRepository.setContentPath(tx, created.id, storedPath);
      if (!page) {
        throw notFound(`Wiki page with id ${created.id} not found`);
      }
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
    if (!updated) {
      throw notFound(`Wiki page with id ${created.id} not found`);
    }
    return mapWikiPage(updated, 0, input.content ?? "");
  } catch (error) {
    wikiPageRepository.delete(database, created.id);
    deleteContent(absolutePath);
    throw error;
  }
}

export function updateWikiPage(database: DbClient, id: number, input: WikiPageInput, actor?: JournalActor | null): WikiPageDto {
  const current = getWikiPageRecord(database, id);
  const previousContent = readWikiContent(current);
  assertVersion(current.version, input.expectedVersion ?? 0);
  const values: WikiPageUpdateData = {};
  let contentPath = current.contentPath;

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

  if (!contentPath) {
    const nextFilename = wikiFilename(id);
    const nextAbsolutePath = resolveContentPath("wiki", nextFilename);
    const nextStoredPath = buildStoredContentPath("wiki", nextFilename);

    writeContent(nextAbsolutePath, "");
    contentPath = nextStoredPath;
    values.contentPath = nextStoredPath;
  }

  if (input.content !== undefined) {
    if (!contentPath) {
      throw badRequest("Wiki page content path is missing");
    }
    writeContent(resolveStoredContentPath(contentPath), input.content);
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
  return mapWikiPage(updated, childCount(database, id), input.content ?? readWikiContent(updated));
}

export function deleteWikiPage(database: DbClient, id: number, actor?: JournalActor | null): void {
  const page = getWikiPageRecord(database, id);
  if (childCount(database, id) > 0) {
    throw conflict("Wiki page has child pages");
  }

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

  if (page.contentPath) {
    deleteContent(resolveStoredContentPath(page.contentPath));
  }
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
