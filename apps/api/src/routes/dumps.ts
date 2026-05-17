import type { DumpDriveApplyRequest, DumpDriveConfigUpdateRequest } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { getDriveBackupConfig, updateDriveBackupConfig } from "../services/drive-config.service.js";
import { applyDriveDump, previewLatestDriveDump, saveDumpToDrive } from "../services/dump.service.js";
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

const driveConfigBodySchema = {
  type: "object",
  required: ["folderInput"],
  additionalProperties: false,
  properties: {
    folderInput: { type: "string", minLength: 1 }
  }
} as const;

export async function registerDumpRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/dumps/drive/config",
    { schema: { response: { 200: objectResponseSchema } } },
    async () => getDriveBackupConfig(app.db)
  );

  app.put<{ Body: DumpDriveConfigUpdateRequest }>(
    "/dumps/drive/config",
    { schema: { body: driveConfigBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => updateDriveBackupConfig(app.db, request.body)
  );

  app.post(
    "/dumps/drive/save",
    { schema: { response: { 200: objectResponseSchema } } },
    async () => saveDumpToDrive(app.sqlite, app.driveClient)
  );

  app.post(
    "/dumps/drive/latest/preview",
    { schema: { response: { 200: objectResponseSchema } } },
    async () => previewLatestDriveDump(app.driveClient)
  );

  app.post<{ Body: DumpDriveApplyRequest }>(
    "/dumps/drive/latest/apply",
    { schema: { body: applyBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => applyDriveDump(app.sqlite, app.driveClient, request.body)
  );
}
