import { eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { projects } from "../db/schema.js";
import { assertVersion } from "../repositories/base.repository.js";
import { wikiPageRepository, type WikiPageRecord, type WikiPageUpdateData } from "../repositories/wiki-page.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import {
  buildStoredContentPath,
  deleteContent,
  readContent,
  renameContent,
  resolveContentPath,
  resolveStoredContentPath,
  writeContent
} from "./content.service.js";
import { requireNonEmpty } from "./helpers.js";

export interface WikiPageInput {
  parentId?: number | null;
  projectId?: number | null;
  title?: string;
  slug?: string;
  content?: string;
  sortOrder?: number;
  expectedVersion?: number;
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
  version: number;
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
    version: record.version,
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
  const page = wikiPageRepository.findById(database, id);
  if (!page) {
    throw notFound(`Wiki page with id ${id} not found`);
  }
  return page;
}

function childCount(database: DbClient, id: number): number {
  return wikiPageRepository.findChildren(database, id).length;
}

function ensureSlugIsUnique(database: DbClient, slug: string, exceptId?: number): void {
  const existing = wikiPageRepository.findBySlug(database, slug).find((row) => row.id !== exceptId);
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

export function createWikiPage(database: DbClient, input: WikiPageInput): WikiPageDto {
  const title = requireNonEmpty(input.title, "title");
  const slug = requireNonEmpty(input.slug, "slug");
  ensureSlugIsUnique(database, slug);
  ensureParentExists(database, input.parentId);
  ensureProjectExists(database, input.projectId);

  const filename = wikiFilename(slug);
  const absolutePath = resolveContentPath("wiki", filename);
  const storedPath = buildStoredContentPath("wiki", filename);

  const created = wikiPageRepository.create(database, {
    parentId: input.parentId ?? null,
    projectId: input.projectId ?? null,
    title,
    slug,
    contentPath: storedPath,
    sortOrder: input.sortOrder ?? 0
  });

  try {
    writeContent(absolutePath, input.content ?? "");
    return mapWikiPage(created, 0, input.content ?? "");
  } catch (error) {
    wikiPageRepository.delete(database, created.id);
    deleteContent(absolutePath);
    throw error;
  }
}

export function updateWikiPage(database: DbClient, id: number, input: WikiPageInput): WikiPageDto {
  const current = getWikiPageRecord(database, id);
  assertVersion(current.version, input.expectedVersion ?? 0);
  const values: WikiPageUpdateData = {};
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

  const updated = wikiPageRepository.update(database, id, input.expectedVersion ?? 0, values);
  if (!updated) {
    throw notFound(`Wiki page with id ${id} not found`);
  }
  return mapWikiPage(updated, childCount(database, id), input.content ?? readWikiContent(updated));
}

export function deleteWikiPage(database: DbClient, id: number): void {
  const page = getWikiPageRecord(database, id);
  if (childCount(database, id) > 0) {
    throw conflict("Wiki page has child pages");
  }

  wikiPageRepository.delete(database, id);

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
