import multipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";

export async function registerMultipart(app: FastifyInstance): Promise<void> {
  await app.register(multipart, {
    attachFieldsToBody: true,
    sharedSchemaId: "#multipartFile",
    limits: {
      fileSize: 25 * 1024 * 1024
    }
  });
}
