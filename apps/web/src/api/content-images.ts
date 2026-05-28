import type { ContentImageUploadResponse } from "@taskmanager/shared-types";
import { api, assetUrl } from "./client";

export async function uploadContentImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("content/images", { body: formData }).json<ContentImageUploadResponse>();
  return assetUrl(response.url);
}
