import type { AttachmentSyncStatus, AttachmentSyncStats } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getAttachmentSyncStatus(): Promise<AttachmentSyncStatus> {
  return api.get("attachment-sync/status").json<AttachmentSyncStatus>();
}

export async function runAttachmentSync(): Promise<AttachmentSyncStats> {
  return api.post("attachment-sync/run").json<AttachmentSyncStats>();
}
