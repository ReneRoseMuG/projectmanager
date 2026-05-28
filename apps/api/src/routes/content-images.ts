import type { FastifyInstance, FastifyRequest } from "fastify";
import { createContentImage, getContentImage } from "../services/content-images.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { badRequest } from "../utils/errors.js";
import { objectResponseSchema } from "../utils/route-schemas.js";

interface MultipartFileField {
  filename?: string;
  mimetype?: string;
  toBuffer?: () => Promise<Buffer>;
}

interface UploadBody {
  file?: MultipartFileField | MultipartFileField[];
}

const uploadBodySchema = {
  consumes: ["multipart/form-data"],
  body: {
    type: "object",
    required: ["file"],
    additionalProperties: false,
    properties: {
      file: { $ref: "#multipartFile" }
    }
  }
} as const;

const contentImageParamsSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 }
  }
} as const;

async function readUpload(request: FastifyRequest) {
  const file = (request.body as UploadBody | undefined)?.file;
  if (!file || Array.isArray(file) || typeof file.toBuffer !== "function") {
    throw badRequest("A file upload is required");
  }

  return {
    mimetype: file.mimetype ?? "application/octet-stream",
    buffer: await file.toBuffer()
  };
}

export async function registerContentImageRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/content/images",
    { config: { auth: { resource: "contentImages", action: "write" } }, schema: { ...uploadBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const response = createContentImage(app.db, await readUpload(request), createJournalActor(request.currentUser));
      return reply.status(201).send(response);
    }
  );

  app.get<{ Params: { id: string } }>(
    "/content/images/:id",
    { config: { auth: { resource: "contentImages", action: "read" } }, schema: { params: contentImageParamsSchema } },
    async (request, reply) => {
      const image = getContentImage(app.db, request.params.id);
      return reply.header("Content-Type", image.mimeType).send(image.data);
    }
  );
}
