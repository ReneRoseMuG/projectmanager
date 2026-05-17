import { eq, isNull } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { projects, wikiPages } from "../db/schema.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { deleteCommentsForEntity } from "./comments.service.js";
import {
  buildStoredContentPath,
  deleteContent,
  readContent,
  renameContent,
  resolveContentPath,
  resolveStoredContentPath,
  writeContent
} from "./content.service.js";
import { nowIso, requireNonEmpty } from "./helpers.js";

type WikiPageRecord = typeof wikiPages.$inferSelect;

export interface WikiPageInput {
  parentId?: number | null;
  projectId?: number | null;
  title?: string;
  slug?: string;
  content?: string;
  sortOrder?: number;
}

export interface WikiPageDto {
  id: number;
  parentId: number | null;
  projectId: number | null;
  title: string;
  slug: string;
  content?: string;
  contentPath: string | null;
  sortOrder: number;
  childCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WikiBreadcrumbDto {
  id: number;
  title: string;
  slug: string;
}

function mapWikiPage(record: WikiPageRecord, childCount: number, content?: string): WikiPageDto {
  return {
    id: record.id,
    parentId: record.parentId,
    projectId: record.projectId,
    title: record.title,
    slug: record.slug,
    content,
    contentPath: record.contentPath,
    sortOrder: record.sortOrder,
    childCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function wikiFilename(slug: string): string {
  const segments = slug.split("/").map((segment) => requireNonEmpty(segment, "slug"));
  const file = `${segments.pop()}.md`;
  return [...segments, file].join("/");
}

function getWikiPageRecord(database: DbClient, id: number): WikiPageRecord {
  const page = database.select().from(wikiPages).where(eq(wikiPages.id, id)).get();
  if (!page) {
    throw notFound(`Wiki page with id ${id} not found`);
  }
  return page;
}

function childCount(database: DbClient, id: number): number {
  return database.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.parentId, id)).all().length;
}

function ensureSlugIsUnique(database: DbClient, slug: string, exceptId?: number): void {
  const existing = database.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.slug, slug)).all().find((row) => row.id !== exceptId);
  if (existing) {
    throw conflict(`Wiki slug "${slug}" already exists`);
  }
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

function ensureProjectExists(database: DbClient, projectId: number | null | undefined): void {
  if (projectId === undefined || projectId === null) {
    return;
  }

  const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

function readWikiContent(record: WikiPageRecord): string {
  return record.contentPath ? readContent(resolveStoredContentPath(record.contentPath)) : "";
}

export function listRootWikiPages(database: DbClient): WikiPageDto[] {
  return database
    .select()
    .from(wikiPages)
    .where(isNull(wikiPages.parentId))
    .orderBy(wikiPages.sortOrder, wikiPages.title)
    .all()
    .map((page) => mapWikiPage(page, childCount(database, page.id)));
}

export function listWikiChildren(database: DbClient, id: number): WikiPageDto[] {
  getWikiPageRecord(database, id);
  return database
    .select()
    .from(wikiPages)
    .where(eq(wikiPages.parentId, id))
    .orderBy(wikiPages.sortOrder, wikiPages.title)
    .all()
    .map((page) => mapWikiPage(page, childCount(database, page.id)));
}

export function getWikiPage(database: DbClient, id: number): WikiPageDto {
  const page = getWikiPageRecord(database, id);
  return mapWikiPage(page, childCount(database, id), readWikiContent(page));
}

export function createWikiPage(database: DbClient, input: WikiPageInput): WikiPageDto {
  const title = requireNonEmpty(input.title, "title");
  const slug = requireNonEmpty(input.slug, "slug");
  ensureSlugIsUnique(database, slug);
  ensureParentExists(database, input.parentId);
  ensureProjectExists(database, input.projectId);

  const now = nowIso();
  const filename = wikiFilename(slug);
  const absolutePath = resolveContentPath("wiki", filename);
  const storedPath = buildStoredContentPath("wiki", filename);

  const created = database
    .insert(wikiPages)
    .values({
      parentId: input.parentId ?? null,
      projectId: input.projectId ?? null,
      title,
      slug,
      contentPath: storedPath,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now
    })
    .returning()
    .get();

  try {
    writeContent(absolutePath, input.content ?? "");
    return mapWikiPage(created, 0, input.content ?? "");
  } catch (error) {
    database.delete(wikiPages).where(eq(wikiPages.id, created.id)).run();
    deleteContent(absolutePath);
    throw error;
  }
}

export function updateWikiPage(database: DbClient, id: number, input: WikiPageInput): WikiPageDto {
  const current = getWikiPageRecord(database, id);
  const values: Partial<typeof wikiPages.$inferInsert> = {};
  let contentPath = current.contentPath;

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.slug !== undefined) {
    values.slug = requireNonEmpty(input.slug, "slug");
    ensureSlugIsUnique(database, values.slug, id);
  }
  if (input.parentId !== undefined) {
    ensureParentExists(database, input.parentId, id);
    values.parentId = input.parentId;
  }
  if (input.projectId !== undefined) {
    ensureProjectExists(database, input.projectId);
    values.projectId = input.projectId;
  }
  if (input.sortOrder !== undefined) {
    values.sortOrder = input.sortOrder;
  }

  if (Object.keys(values).length === 0 && input.content === undefined) {
    throw badRequest("No wiki page fields provided");
  }

  const nextSlug = values.slug ?? current.slug;
  if (nextSlug !== current.slug || !contentPath) {
    const nextFilename = wikiFilename(nextSlug);
    const nextAbsolutePath = resolveContentPath("wiki", nextFilename);
    const nextStoredPath = buildStoredContentPath("wiki", nextFilename);

    if (contentPath) {
      renameContent(resolveStoredContentPath(contentPath), nextAbsolutePath);
    } else {
      writeContent(nextAbsolutePath, "");
    }

    contentPath = nextStoredPath;
    values.contentPath = nextStoredPath;
  }

  if (input.content !== undefined) {
    if (!contentPath) {
      throw badRequest("Wiki page content path is missing");
    }
    writeContent(resolveStoredContentPath(contentPath), input.content);
  }

  values.updatedAt = nowIso();

  const updated = database.update(wikiPages).set(values).where(eq(wikiPages.id, id)).returning().get();
  return mapWikiPage(updated, childCount(database, id), input.content ?? readWikiContent(updated));
}

export function deleteWikiPage(database: DbClient, id: number): void {
  const page = getWikiPageRecord(database, id);
  if (childCount(database, id) > 0) {
    throw conflict("Wiki page has child pages");
  }

  deleteCommentsForEntity(database, "wikiPage", id);
  database.delete(wikiPages).where(eq(wikiPages.id, id)).run();

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
    breadcrumb.unshift({ id: current.id, title: current.title, slug: current.slug });
    current = current.parentId === null ? undefined : getWikiPageRecord(database, current.parentId);
  }

  return breadcrumb;
}
