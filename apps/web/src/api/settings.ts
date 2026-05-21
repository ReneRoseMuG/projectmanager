import type { DeleteSettingValueRequest, SettingsResolvedResponse, SetSettingValueRequest } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getResolvedSettings(): Promise<SettingsResolvedResponse> {
  return api.get("settings/resolved").json<SettingsResolvedResponse>();
}

export async function setSettingValue(input: SetSettingValueRequest): Promise<SettingsResolvedResponse> {
  return api.put("settings/values", { json: input }).json<SettingsResolvedResponse>();
}

export async function deleteSettingValue(input: DeleteSettingValueRequest): Promise<SettingsResolvedResponse> {
  return api.delete("settings/values", { json: input }).json<SettingsResolvedResponse>();
}
