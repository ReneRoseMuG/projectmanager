import type {
  DumpBackupApplyRequest,
  DumpBackupApplyResult,
  DumpBackupPreviewResult,
  DumpBackupSaveResult,
  DumpBackupStatus
} from "@taskmanager/shared-types";
import { api } from "./client";

export async function getLocalDumpStatus(): Promise<DumpBackupStatus> {
  return api.get("dumps/local/status").json<DumpBackupStatus>();
}

export async function saveLocalDump(): Promise<DumpBackupSaveResult> {
  return api.post("dumps/local/save").json<DumpBackupSaveResult>();
}

export async function previewLatestLocalDump(): Promise<DumpBackupPreviewResult> {
  return api.get("dumps/local/latest/preview").json<DumpBackupPreviewResult>();
}

export async function applyLatestLocalDump(input: DumpBackupApplyRequest): Promise<DumpBackupApplyResult> {
  return api.post("dumps/local/latest/apply", { json: input }).json<DumpBackupApplyResult>();
}
