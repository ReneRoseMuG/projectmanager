import type { BackupProgressEvent, DumpBackupApplyRequest, DumpIncrementalSyncApplyRequest, DumpRemoteBackupApplyRequest, DumpRemoteBackupPreviewRequest } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import {
  applyIncrementalRemoteSync,
  applyLocalDump,
  applyRemoteDump,
  getLocalBackupStatus,
  getRemoteBackupStatus,
  performIncrementalSftpSync,
  previewIncrementalRemoteSync,
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
  required: ["fileId", "fileHash", "confirmed"],
  additionalProperties: false,
  properties: {
    fileId: { type: "string", minLength: 1 },
    fileHash: { type: "string", minLength: 1 },
    confirmed: { type: "boolean", const: true }
  }
} as const;

const incrementalSyncApplyBodySchema = {
  type: "object",
  required: ["manifestHash", "confirmed"],
  additionalProperties: false,
  properties: {
    manifestHash: { type: "string", minLength: 1 },
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

  app.post(
    "/dumps/remote/sync",
    { config: { auth: { resource: "dumps", action: "write" } }, schema: { response: { 200: objectResponseSchema } } },
    async () => performIncrementalSftpSync(app.sqlite, { progressCallback: backupProgressPublisher(app) })
  );

  app.get(
    "/dumps/remote/sync/preview",
    { config: { auth: { resource: "dumps", action: "read" } }, schema: { response: { 200: objectResponseSchema } } },
    async () => previewIncrementalRemoteSync()
  );

  app.post<{ Body: DumpIncrementalSyncApplyRequest }>(
    "/dumps/remote/sync/apply",
    { config: { auth: { resource: "dumps", action: "write" } }, schema: { body: incrementalSyncApplyBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => applyIncrementalRemoteSync(app.sqlite, request.body, { progressCallback: backupProgressPublisher(app) })
  );
}
