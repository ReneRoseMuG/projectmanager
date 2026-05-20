import { eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { useCases } from "../db/schema.js";
import { assertVersion } from "../repositories/base.repository.js";
import { featureRepository, type FeatureRecord, type FeatureUpdateData } from "../repositories/feature.repository.js";
import { useCaseRepository } from "../repositories/use-case.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { deleteFeatureAttachmentsForIds } from "./attachments.service.js";
import { ensureCatalogEntryExists, resolveDefaultCatalogEntryKey } from "./catalogs.service.js";
import {
  buildFilename,
  buildStoredContentPath,
  deleteContent,
  readContent,
  renameContent,
  resolveContentPath,
  resolveStoredContentPath,
  writeContent
} from "./content.service.js";
import { cleanNullable, requireNonEmpty } from "./helpers.js";

type FeatureStatus = FeatureRecord["status"];

export interface FeatureInput {
  title?: string;
  slug?: string;
  status?: FeatureStatus;
  description?: string | null;
  content?: string;
  sortOrder?: number;
  expectedVersion?: number;
}

export interface FeatureDto {
  id: number;
  title: string;
  slug: string;
  status: FeatureStatus;
  description: string | null;
  content?: string;
  contentPath: string | null;
  sortOrder: number;
  version: number;
  useCaseCount: number;
  createdAt: string;
  updatedAt: string;
}

function contentFilename(id: number, slug: string): string {
  return buildFilename("feature", id, slug);
}

function mapFeature(record: FeatureRecord, useCaseCount: number, content?: string): FeatureDto {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    status: record.status,
    description: record.description,
    content,
    contentPath: record.contentPath,
    sortOrder: record.sortOrder,
    version: record.version,
    useCaseCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function countUseCases(database: DbClient, featureId: number): number {
  return database.select({ id: useCases.id }).from(useCases).where(eq(useCases.featureId, featureId)).all().length;
}

function getUseCaseCounts(database: DbClient): Map<number, number> {
  const counts = new Map<number, number>();
  const rows = database.select({ featureId: useCases.featureId }).from(useCases).all();

  for (const row of rows) {
    counts.set(row.featureId, (counts.get(row.featureId) ?? 0) + 1);
  }

  return counts;
}

function getFeatureRecord(database: DbClient, id: number): FeatureRecord {
  const feature = featureRepository.findById(database, id);
  if (!feature) {
    throw notFound(`Feature with id ${id} not found`);
  }
  return feature;
}

function ensureSlugIsUnique(database: DbClient, slug: string, exceptId?: number): void {
  const existing = featureRepository.findBySlug(database, slug).find((row) => row.id !== exceptId);

  if (existing) {
    throw conflict(`Feature slug "${slug}" already exists`);
  }
}

function readFeatureContent(record: FeatureRecord): string {
  return record.contentPath ? readContent(resolveStoredContentPath(record.contentPath)) : "";
}

export function listFeatures(database: DbClient): FeatureDto[] {
  const rows = featureRepository.findAll(database);
  const counts = getUseCaseCounts(database);

  return rows.map((feature) => mapFeature(feature, counts.get(feature.id) ?? 0));
}

export function getFeature(database: DbClient, id: number): FeatureDto {
  const feature = getFeatureRecord(database, id);
  return mapFeature(feature, countUseCases(database, id), readFeatureContent(feature));
}

export function createFeature(database: DbClient, input: FeatureInput): FeatureDto {
  const title = requireNonEmpty(input.title, "title");
  const slug = requireNonEmpty(input.slug, "slug");
  ensureSlugIsUnique(database, slug);
  const status = input.status ?? resolveDefaultCatalogEntryKey(database, "featureStatus", "draft");
  ensureCatalogEntryExists(database, "featureStatus", status);

  const created = featureRepository.create(database, {
    title,
    slug,
    status,
    description: cleanNullable(input.description) ?? null,
    contentPath: null,
    sortOrder: input.sortOrder ?? 0
  });

  const filename = contentFilename(created.id, slug);
  const absolutePath = resolveContentPath("features", filename);
  const storedPath = buildStoredContentPath("features", filename);

  try {
    writeContent(absolutePath, input.content ?? "");
    const updated = featureRepository.setContentPath(database, created.id, storedPath);
    if (!updated) {
      throw notFound(`Feature with id ${created.id} not found`);
    }

    return mapFeature(updated, 0, input.content ?? "");
  } catch (error) {
    featureRepository.delete(database, created.id);
    deleteContent(absolutePath);
    throw error;
  }
}

export function updateFeature(database: DbClient, id: number, input: FeatureInput): FeatureDto {
  const current = getFeatureRecord(database, id);
  assertVersion(current.version, input.expectedVersion ?? 0);
  const values: FeatureUpdateData = {};
  let contentPath = current.contentPath;

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }

  if (input.slug !== undefined) {
    values.slug = requireNonEmpty(input.slug, "slug");
    ensureSlugIsUnique(database, values.slug, id);
  }

  if (input.status !== undefined) {
    ensureCatalogEntryExists(database, "featureStatus", input.status);
    values.status = input.status;
  }

  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }

  if (input.sortOrder !== undefined) {
    values.sortOrder = input.sortOrder;
  }

  if (Object.keys(values).length === 0 && input.content === undefined) {
    throw badRequest("No feature fields provided");
  }

  const nextSlug = values.slug ?? current.slug;
  if (nextSlug !== current.slug || !contentPath) {
    const nextFilename = contentFilename(id, nextSlug);
    const nextAbsolutePath = resolveContentPath("features", nextFilename);
    const nextStoredPath = buildStoredContentPath("features", nextFilename);

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
      throw badRequest("Feature content path is missing");
    }
    writeContent(resolveStoredContentPath(contentPath), input.content);
  }

  const updated = featureRepository.update(database, id, input.expectedVersion ?? 0, values);
  if (!updated) {
    throw notFound(`Feature with id ${id} not found`);
  }
  return mapFeature(updated, countUseCases(database, id), input.content ?? readFeatureContent(updated));
}

export async function deleteFeature(database: DbClient, id: number): Promise<void> {
  const feature = getFeatureRecord(database, id);
  const linkedUseCases = useCaseRepository.findByFeatureId(database, id);

  await deleteFeatureAttachmentsForIds(database, [id]);
  featureRepository.delete(database, id);

  if (feature.contentPath) {
    deleteContent(resolveStoredContentPath(feature.contentPath));
  }

  for (const useCase of linkedUseCases) {
    if (useCase.contentPath) {
      deleteContent(resolveStoredContentPath(useCase.contentPath));
    }
  }
}
