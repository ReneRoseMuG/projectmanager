import type { DumpBackupApplyRequest } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { applyLocalDump, getLocalBackupStatus, previewLatestLocalDump, saveDumpToLocalBackup } from "../services/dump.service.js";
import { objectResponseSchema } from "../utils/route-schemas.js";

const applyBodySchema = {
  type: "object",
  required: ["fileId", "fileHash", "confirmationPhrase"],
  additionalProperties: false,
  properties: {
    fileId: { type: "string", minLength: 1 },
    fileHash: { type: "string", minLength: 1 },
    confirmationPhrase: { type: "string", minLength: 1 }
  }
} as const;

export async function registerDumpRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/dumps/local/status",
    { schema: { response: { 200: objectResponseSchema } } },
    async () => getLocalBackupStatus()
  );

  app.post(
    "/dumps/local/save",
    { schema: { response: { 200: objectResponseSchema } } },
    async () => saveDumpToLocalBackup(app.sqlite)
  );

  app.get(
    "/dumps/local/latest/preview",
    { schema: { response: { 200: objectResponseSchema } } },
    async () => previewLatestLocalDump()
  );

  app.post<{ Body: DumpBackupApplyRequest }>(
    "/dumps/local/latest/apply",
    { schema: { body: applyBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => applyLocalDump(app.sqlite, request.body)
  );
}
