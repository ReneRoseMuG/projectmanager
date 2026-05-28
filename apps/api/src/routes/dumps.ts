import type { BackupProgressEvent, DumpBackupApplyRequest, DumpRemoteBackupApplyRequest, DumpRemoteBackupPreviewRequest } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import {
  applyLocalDump,
  applyRemoteDump,
  getLocalBackupStatus,
  getRemoteBackupStatus,
  previewLatestLocalDump,
  previewRemoteDump,
  saveDumpToLocalBackup
} from "../services/dump.service.js";
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

const remotePreviewBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    fileId: { type: "string", minLength: 1 }
  }
} as const;

const remoteApplyBodySchema = {
  type: "object",
  required: ["fileId", "fileHash", "previewToken", "confirmed"],
  additionalProperties: false,
  properties: {
    fileId: { type: "string", minLength: 1 },
    fileHash: { type: "string", minLength: 1 },
    previewToken: { type: "string", minLength: 1 },
    confirmed: { type: "boolean", const: true }
  }
} as const;

function backupProgressPublisher(app: FastifyInstance): (event: BackupProgressEvent) => void {
  return (event) => {
    try {
      app.realtimeBus.publish(event);
    } catch {
      // Progress publishing must not interrupt backup or import requests.
    }
  };
}

export async function registerDumpRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/dumps/local/status",
    { schema: { response: { 200: objectResponseSchema } } },
    async () => getLocalBackupStatus()
  );

  app.post(
    "/dumps/local/save",
    { schema: { response: { 200: objectResponseSchema } } },
    async () => saveDumpToLocalBackup(app.sqlite, { progressCallback: backupProgressPublisher(app) })
  );

  app.get(
    "/dumps/local/latest/preview",
    { schema: { response: { 200: objectResponseSchema } } },
    async () => previewLatestLocalDump()
  );

  app.post<{ Body: DumpBackupApplyRequest }>(
    "/dumps/local/latest/apply",
    { schema: { body: applyBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => applyLocalDump(app.sqlite, request.body, { progressCallback: backupProgressPublisher(app) })
  );

  app.get(
    "/dumps/remote/status",
    { schema: { response: { 200: objectResponseSchema } } },
    async () => getRemoteBackupStatus(app.sqlite)
  );

  app.post<{ Body: DumpRemoteBackupPreviewRequest }>(
    "/dumps/remote/preview",
    { config: { auth: { resource: "dumps", action: "read" } }, schema: { body: remotePreviewBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => previewRemoteDump(app.sqlite, request.body)
  );

  app.post<{ Body: DumpRemoteBackupApplyRequest }>(
    "/dumps/remote/apply",
    { schema: { body: remoteApplyBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => applyRemoteDump(app.sqlite, request.body, { progressCallback: backupProgressPublisher(app) })
  );
}
