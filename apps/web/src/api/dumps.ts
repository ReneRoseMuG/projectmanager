import type {
  DumpDriveApplyRequest,
  DumpDriveApplyResult,
  DumpDriveConfig,
  DumpDriveConfigUpdateRequest,
  DumpDrivePreviewResult,
  DumpDriveSaveResult
} from "@taskmanager/shared-types";
import { api } from "./client";

export async function getDriveDumpConfig(): Promise<DumpDriveConfig> {
  return api.get("dumps/drive/config").json<DumpDriveConfig>();
}

export async function updateDriveDumpConfig(input: DumpDriveConfigUpdateRequest): Promise<DumpDriveConfig> {
  return api.put("dumps/drive/config", { json: input }).json<DumpDriveConfig>();
}

export async function saveDriveDump(): Promise<DumpDriveSaveResult> {
  return api.post("dumps/drive/save").json<DumpDriveSaveResult>();
}

export async function previewLatestDriveDump(): Promise<DumpDrivePreviewResult> {
  return api.post("dumps/drive/latest/preview").json<DumpDrivePreviewResult>();
}

export async function applyLatestDriveDump(input: DumpDriveApplyRequest): Promise<DumpDriveApplyResult> {
  return api.post("dumps/drive/latest/apply", { json: input }).json<DumpDriveApplyResult>();
}
