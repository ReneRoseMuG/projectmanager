import { eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { features } from "../db/schema.js";
import { assertVersion } from "../repositories/base.repository.js";
import { useCaseRepository, type UseCaseRecord, type UseCaseUpdateData } from "../repositories/use-case.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
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

type UseCaseStatus = UseCaseRecord["status"];

export interface UseCaseInput {
  featureId?: number;
  title?: string;
  slug?: string;
  status?: UseCaseStatus;
  description?: string | null;
  content?: string;
  sortOrder?: number;
  expectedVersion?: number;
}

export interface UseCaseDto {
  id: number;
  featureId: number;
  title: string;
  slug: string;
  status: UseCaseStatus;
  description: string | null;
  content?: string;
  contentPath: string | null;
  sortOrder: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

function contentFilename(id: number, slug: string): string {
  return buildFilename("usecase", id, slug);
}

function mapUseCase(record: UseCaseRecord, content?: string): UseCaseDto {
  return {
    id: record.id,
    featureId: record.featureId,
    title: record.title,
    slug: record.slug,
    status: record.status,
    description: record.description,
    content,
    contentPath: record.contentPath,
    sortOrder: record.sortOrder,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function ensureFeatureExists(database: DbClient, featureId: number): void {
  const feature = database.select({ id: features.id }).from(features).where(eq(features.id, featureId)).get();
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

function getUseCaseRecord(database: DbClient, id: number): UseCaseRecord {
  const useCase = useCaseRepository.findById(database, id);
  if (!useCase) {
    throw notFound(`Use case with id ${id} not found`);
  }
  return useCase;
}

function ensureSlugIsUnique(database: DbClient, slug: string, exceptId?: number): void {
  const existing = useCaseRepository.findBySlug(database, slug).find((row) => row.id !== exceptId);
  if (existing) {
    throw conflict(`Use case slug "${slug}" already exists`);
  }
}

function readUseCaseContent(record: UseCaseRecord): string {
  return record.contentPath ? readContent(resolveStoredContentPath(record.contentPath)) : "";
}

export function listUseCases(database: DbClient, featureId: number): UseCaseDto[] {
  ensureFeatureExists(database, featureId);
  return useCaseRepository.findByFeatureId(database, featureId).map((useCase) => mapUseCase(useCase));
}

export function getUseCase(database: DbClient, id: number): UseCaseDto {
  const useCase = getUseCaseRecord(database, id);
  return mapUseCase(useCase, readUseCaseContent(useCase));
}

export function createUseCase(database: DbClient, featureId: number, input: UseCaseInput): UseCaseDto {
  const targetFeatureId = input.featureId ?? featureId;
  ensureFeatureExists(database, targetFeatureId);
  const title = requireNonEmpty(input.title, "title");
  const slug = requireNonEmpty(input.slug, "slug");
  ensureSlugIsUnique(database, slug);

  const created = useCaseRepository.create(database, {
    featureId: targetFeatureId,
    title,
    slug,
    status: input.status ?? "draft",
    description: cleanNullable(input.description) ?? null,
    contentPath: null,
    sortOrder: input.sortOrder ?? 0
  });

  const filename = contentFilename(created.id, slug);
  const absolutePath = resolveContentPath("usecases", filename);
  const storedPath = buildStoredContentPath("usecases", filename);

  try {
    writeContent(absolutePath, input.content ?? "");
    const updated = useCaseRepository.setContentPath(database, created.id, storedPath);
    if (!updated) {
      throw notFound(`Use case with id ${created.id} not found`);
    }

    return mapUseCase(updated, input.content ?? "");
  } catch (error) {
    useCaseRepository.delete(database, created.id);
    deleteContent(absolutePath);
    throw error;
  }
}

export function updateUseCase(database: DbClient, id: number, input: UseCaseInput): UseCaseDto {
  const current = getUseCaseRecord(database, id);
  assertVersion(current.version, input.expectedVersion ?? 0);
  const values: UseCaseUpdateData = {};
  let contentPath = current.contentPath;

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.featureId !== undefined) {
    ensureFeatureExists(database, input.featureId);
    values.featureId = input.featureId;
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
    throw badRequest("No use case fields provided");
  }

  const nextSlug = values.slug ?? current.slug;
  if (nextSlug !== current.slug || !contentPath) {
    const nextFilename = contentFilename(id, nextSlug);
    const nextAbsolutePath = resolveContentPath("usecases", nextFilename);
    const nextStoredPath = buildStoredContentPath("usecases", nextFilename);

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
      throw badRequest("Use case content path is missing");
    }
    writeContent(resolveStoredContentPath(contentPath), input.content);
  }

  const updated = useCaseRepository.update(database, id, input.expectedVersion ?? 0, values);
  if (!updated) {
    throw notFound(`Use case with id ${id} not found`);
  }
  return mapUseCase(updated, input.content ?? readUseCaseContent(updated));
}

export function deleteUseCase(database: DbClient, id: number): void {
  const useCase = getUseCaseRecord(database, id);
  useCaseRepository.delete(database, id);

  if (useCase.contentPath) {
    deleteContent(resolveStoredContentPath(useCase.contentPath));
  }
}
