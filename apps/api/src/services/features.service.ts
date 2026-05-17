import { eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { features, useCases } from "../db/schema.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { deleteFeatureAttachmentsForIds } from "./attachments.service.js";
import { deleteCommentsForEntities, deleteCommentsForEntity } from "./comments.service.js";
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
import { cleanNullable, nowIso, requireNonEmpty } from "./helpers.js";

type FeatureRecord = typeof features.$inferSelect;
type FeatureStatus = FeatureRecord["status"];

export interface FeatureInput {
  title?: string;
  slug?: string;
  status?: FeatureStatus;
  description?: string | null;
  content?: string;
  sortOrder?: number;
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
  const feature = database.select().from(features).where(eq(features.id, id)).get();
  if (!feature) {
    throw notFound(`Feature with id ${id} not found`);
  }
  return feature;
}

function ensureSlugIsUnique(database: DbClient, slug: string, exceptId?: number): void {
  const existing = exceptId
    ? database.select({ id: features.id }).from(features).where(eq(features.slug, slug)).all().find((row) => row.id !== exceptId)
    : database.select({ id: features.id }).from(features).where(eq(features.slug, slug)).get();

  if (existing) {
    throw conflict(`Feature slug "${slug}" already exists`);
  }
}

function readFeatureContent(record: FeatureRecord): string {
  return record.contentPath ? readContent(resolveStoredContentPath(record.contentPath)) : "";
}

export function listFeatures(database: DbClient): FeatureDto[] {
  const rows = database.select().from(features).orderBy(features.sortOrder, features.title).all();
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

  const now = nowIso();
  const created = database
    .insert(features)
    .values({
      title,
      slug,
      status: input.status ?? "draft",
      description: cleanNullable(input.description) ?? null,
      contentPath: null,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now
    })
    .returning()
    .get();

  const filename = contentFilename(created.id, slug);
  const absolutePath = resolveContentPath("features", filename);
  const storedPath = buildStoredContentPath("features", filename);

  try {
    writeContent(absolutePath, input.content ?? "");
    const updated = database
      .update(features)
      .set({ contentPath: storedPath, updatedAt: nowIso() })
      .where(eq(features.id, created.id))
      .returning()
      .get();

    return mapFeature(updated, 0, input.content ?? "");
  } catch (error) {
    database.delete(features).where(eq(features.id, created.id)).run();
    deleteContent(absolutePath);
    throw error;
  }
}

export function updateFeature(database: DbClient, id: number, input: FeatureInput): FeatureDto {
  const current = getFeatureRecord(database, id);
  const values: Partial<typeof features.$inferInsert> = {};
  let contentPath = current.contentPath;

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }

  if (input.slug !== undefined) {
    values.slug = requireNonEmpty(input.slug, "slug");
    ensureSlugIsUnique(database, values.slug, id);
  }

  if (input.status !== undefined) {
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

  values.updatedAt = nowIso();

  const updated = database.update(features).set(values).where(eq(features.id, id)).returning().get();
  return mapFeature(updated, countUseCases(database, id), input.content ?? readFeatureContent(updated));
}

export async function deleteFeature(database: DbClient, id: number): Promise<void> {
  const feature = getFeatureRecord(database, id);
  const linkedUseCases = database.select({ id: useCases.id, contentPath: useCases.contentPath }).from(useCases).where(eq(useCases.featureId, id)).all();
  const linkedUseCaseIds = linkedUseCases.map((useCase) => useCase.id);

  await deleteFeatureAttachmentsForIds(database, [id]);
  deleteCommentsForEntity(database, "feature", id);
  deleteCommentsForEntities(database, "useCase", linkedUseCaseIds);
  database.delete(features).where(eq(features.id, id)).run();

  if (feature.contentPath) {
    deleteContent(resolveStoredContentPath(feature.contentPath));
  }

  for (const useCase of linkedUseCases) {
    if (useCase.contentPath) {
      deleteContent(resolveStoredContentPath(useCase.contentPath));
    }
  }
}
