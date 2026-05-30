import crypto from "node:crypto";
import type { ContentImageUploadResponse } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { contentImageRepository, type ContentImageRecord } from "../repositories/content-image.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import type { JournalActor } from "./journal.service.js";

const maxContentImageBytes = 10 * 1024 * 1024;

export interface ContentImageUpload {
  mimetype: string;
  buffer: Buffer;
}

function normalizeMimeType(value: string | undefined): string {
  const mimetype = value?.trim().toLowerCase() ?? "";
  if (!mimetype.startsWith("image/")) {
    throw badRequest("Only image uploads are allowed");
  }
  return mimetype;
}

export async function createContentImage(database: DbClient, upload: ContentImageUpload, actor?: JournalActor | null): Promise<ContentImageUploadResponse> {
  const mimeType = normalizeMimeType(upload.mimetype);
  if (upload.buffer.byteLength === 0) {
    throw badRequest("Image upload must not be empty");
  }
  if (upload.buffer.byteLength > maxContentImageBytes) {
    throw badRequest("Image upload exceeds the 10 MB limit");
  }

  const image = await contentImageRepository.create(
    database,
    {
      id: crypto.randomUUID(),
      mimeType,
      data: upload.buffer,
      size: upload.buffer.byteLength
    },
    actor?.actorUserId ?? undefined
  );

  return { url: `/api/content/images/${image.id}` };
}

export async function getContentImage(database: DbClient, id: string): Promise<ContentImageRecord> {
  const image = await contentImageRepository.findById(database, id);
  if (!image) {
    throw notFound(`Content image with id ${id} not found`);
  }
  return image;
}
