import type { DumpDriveFile } from "@taskmanager/shared-types";
import crypto from "node:crypto";
import { config } from "../config.js";
import { badRequest } from "../utils/errors.js";

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface GoogleDriveFileResponse {
  id?: string;
  name?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
}

interface GoogleDriveListResponse {
  files?: GoogleDriveFileResponse[];
}

export interface GoogleDriveBackupClient {
  listDumpFiles(): Promise<DumpDriveFile[]>;
  uploadDump(filename: string, content: Buffer): Promise<DumpDriveFile>;
  downloadFile(fileId: string): Promise<Buffer>;
}

type GoogleDriveFolderIdProvider = () => string | null;

function requireDriveConfig(folderId: string | null): {
  folderId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
} {
  if (
    !folderId ||
    !config.googleDriveClientId ||
    !config.googleDriveClientSecret ||
    !config.googleDriveRefreshToken
  ) {
    throw badRequest("Google Drive backup configuration is incomplete");
  }

  return {
    folderId,
    clientId: config.googleDriveClientId,
    clientSecret: config.googleDriveClientSecret,
    refreshToken: config.googleDriveRefreshToken
  };
}

function mapDriveFile(file: GoogleDriveFileResponse): DumpDriveFile {
  if (!file.id || !file.name || !file.createdTime) {
    throw badRequest("Google Drive returned an incomplete file record");
  }

  return {
    id: file.id,
    name: file.name,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime ?? null,
    sizeBytes: Number(file.size ?? 0)
  };
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export class GoogleDriveApiBackupClient implements GoogleDriveBackupClient {
  private accessToken: string | null = null;

  constructor(private readonly getFolderId: GoogleDriveFolderIdProvider = () => config.googleDriveBackupFolderId) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    const driveConfig = requireDriveConfig(this.getFolderId());
    const body = new URLSearchParams({
      client_id: driveConfig.clientId,
      client_secret: driveConfig.clientSecret,
      refresh_token: driveConfig.refreshToken,
      grant_type: "refresh_token"
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    });

    if (!response.ok) {
      throw badRequest("Google Drive token refresh failed");
    }

    const payload = (await response.json()) as GoogleTokenResponse;
    if (!payload.access_token) {
      throw badRequest("Google Drive token response did not include an access token");
    }

    this.accessToken = payload.access_token;
    return this.accessToken;
  }

  private async authorizedFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  }

  async listDumpFiles(): Promise<DumpDriveFile[]> {
    const driveConfig = requireDriveConfig(this.getFolderId());
    const query = [
      `'${escapeDriveQueryValue(driveConfig.folderId)}' in parents`,
      "trashed = false",
      "mimeType = 'application/zip'",
      "name contains 'taskmanager_dump_'"
    ].join(" and ");

    const params = new URLSearchParams({
      q: query,
      orderBy: "createdTime desc",
      fields: "files(id,name,createdTime,modifiedTime,size)",
      pageSize: "50"
    });
    const response = await this.authorizedFetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
    if (!response.ok) {
      throw badRequest("Google Drive dump list could not be loaded");
    }

    const payload = (await response.json()) as GoogleDriveListResponse;
    return (payload.files ?? []).map(mapDriveFile);
  }

  async uploadDump(filename: string, content: Buffer): Promise<DumpDriveFile> {
    const driveConfig = requireDriveConfig(this.getFolderId());
    const boundary = `taskmanager-${crypto.randomUUID()}`;
    const metadata = {
      name: filename,
      parents: [driveConfig.folderId],
      mimeType: "application/zip"
    };
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`, "utf8"),
      Buffer.from(`--${boundary}\r\ncontent-type: application/zip\r\n\r\n`, "utf8"),
      content,
      Buffer.from(`\r\n--${boundary}--\r\n`, "utf8")
    ]);
    const params = new URLSearchParams({
      uploadType: "multipart",
      fields: "id,name,createdTime,modifiedTime,size"
    });

    const response = await this.authorizedFetch(`https://www.googleapis.com/upload/drive/v3/files?${params.toString()}`, {
      method: "POST",
      headers: { "content-type": `multipart/related; boundary=${boundary}` },
      body
    });
    if (!response.ok) {
      throw badRequest("Google Drive dump upload failed");
    }

    return mapDriveFile((await response.json()) as GoogleDriveFileResponse);
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const params = new URLSearchParams({ alt: "media" });
    const response = await this.authorizedFetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`
    );
    if (!response.ok) {
      throw badRequest("Google Drive dump download failed");
    }

    return Buffer.from(await response.arrayBuffer());
  }
}

export function createGoogleDriveBackupClient(getFolderId?: GoogleDriveFolderIdProvider): GoogleDriveBackupClient {
  return new GoogleDriveApiBackupClient(getFolderId);
}
