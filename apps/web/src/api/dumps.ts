import type {
  DumpBackupApplyRequest,
  DumpBackupApplyResult,
  DumpBackupPreviewResult,
  DumpBackupSaveResult,
  DumpBackupStatus,
  DumpIncrementalSyncApplyRequest,
  DumpIncrementalSyncApplyResult,
  DumpIncrementalSyncPreviewResult,
  DumpIncrementalSyncResult,
  DumpRemoteBackupApplyRequest,
  DumpRemoteBackupPreviewRequest,
  DumpRemoteBackupStatus
} from "@taskmanager/shared-types";
import { api } from "./client";

const BACKUP_OPERATION_TIMEOUT_MS = 10 * 60 * 1000;

export async function getLocalDumpStatus(): Promise<DumpBackupStatus> {
  return api.get("dumps/local/status").json<DumpBackupStatus>();
}

export async function saveLocalDump(): Promise<DumpBackupSaveResult> {
  return api.post("dumps/local/save", { timeout: BACKUP_OPERATION_TIMEOUT_MS }).json<DumpBackupSaveResult>();
}

export async function previewLatestLocalDump(): Promise<DumpBackupPreviewResult> {
  return api.get("dumps/local/latest/preview").json<DumpBackupPreviewResult>();
}

export async function applyLatestLocalDump(input: DumpBackupApplyRequest): Promise<DumpBackupApplyResult> {
  return api.post("dumps/local/latest/apply", { json: input }).json<DumpBackupApplyResult>();
}

export async function getRemoteDumpStatus(): Promise<DumpRemoteBackupStatus> {
  return api.get("dumps/remote/status").json<DumpRemoteBackupStatus>();
}

export async function previewRemoteDump(input: DumpRemoteBackupPreviewRequest = {}): Promise<DumpBackupPreviewResult> {
  return api.post("dumps/remote/preview", { json: input, timeout: BACKUP_OPERATION_TIMEOUT_MS }).json<DumpBackupPreviewResult>();
}

export async function applyRemoteDump(input: DumpRemoteBackupApplyRequest): Promise<DumpBackupApplyResult> {
  return api.post("dumps/remote/apply", { json: input, timeout: BACKUP_OPERATION_TIMEOUT_MS }).json<DumpBackupApplyResult>();
}

export async function runIncrementalRemoteSync(): Promise<DumpIncrementalSyncResult> {
  return api.post("dumps/remote/sync", { timeout: BACKUP_OPERATION_TIMEOUT_MS }).json<DumpIncrementalSyncResult>();
}

export async function previewIncrementalRemoteSync(): Promise<DumpIncrementalSyncPreviewResult> {
  return api.get("dumps/remote/sync/preview", { timeout: BACKUP_OPERATION_TIMEOUT_MS }).json<DumpIncrementalSyncPreviewResult>();
}

export async function applyIncrementalRemoteSync(input: DumpIncrementalSyncApplyRequest): Promise<DumpIncrementalSyncApplyResult> {
  return api.post("dumps/remote/sync/apply", { json: input, timeout: BACKUP_OPERATION_TIMEOUT_MS }).json<DumpIncrementalSyncApplyResult>();
}
