import type { FastifyInstance } from "fastify";
import {
  getAttachmentSyncReadiness,
  getLastSyncStats,
  isSyncInProgress,
  syncAttachmentsOnStartup,
} from "../services/attachment-sync.service.js";
import { objectResponseSchema } from "../utils/route-schemas.js";

export async function registerAttachmentSyncRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/attachment-sync/status",
    { schema: { response: { 200: objectResponseSchema } } },
    async () => ({
      readiness: getAttachmentSyncReadiness(),
      inProgress: isSyncInProgress(),
      lastSync: getLastSyncStats(),
    })
  );

  app.post(
    "/attachment-sync/run",
    { schema: { response: { 200: objectResponseSchema } } },
    async () => syncAttachmentsOnStartup()
  );
}
