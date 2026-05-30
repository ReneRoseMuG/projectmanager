import type { AttachmentPreviewInfo, AttachmentPreviewKind, AttachmentTextPreview } from "@taskmanager/shared-types";
import { eq } from "drizzle-orm";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { config } from "../config.js";
import type { DbClient } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import { attachments } from "../db/schema.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";
import { badRequest, notFound } from "../utils/errors.js";

type AttachmentRecord = typeof attachments.$inferSelect;

interface AttachmentPreviewProfile {
  kind: AttachmentPreviewKind;
  label: string;
  mode: "asset" | "text" | "office" | "unsupported";
}

const execFileAsync = promisify(execFile);

const textExtensions = new Set([
  "txt",
  "md",
  "markdown",
  "log",
  "json",
  "xml",
  "html",
  "htm",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "sql",
  "yaml",
  "yml",
  "ini",
  "env"
]);

const csvExtensions = new Set(["csv", "tsv"]);

const officeExtensions = new Set([
  "doc",
  "docx",
  "dot",
  "dotx",
  "rtf",
  "xls",
  "xlsx",
  "xlt",
  "xltx",
  "ppt",
  "pptx",
  "pot",
  "potx",
  "pps",
  "ppsx",
  "odt",
  "ott",
  "ods",
  "ots",
  "odp",
  "otp",
  "odg",
  "otg",
  "odf",
  "fodt",
  "fods",
  "fodp"
]);

function extensionOf(filename: string): string {
  const extension = path.extname(filename).replace(/^\./, "").toLowerCase();
  return extension;
}

function isSameOrInside(targetPath: string, rootPath: string): boolean {
  const relative = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function attachmentDiskPath(record: AttachmentRecord): string {
  const diskPath = path.resolve(config.uploadDir, record.filename);
  if (!isSameOrInside(diskPath, config.uploadDir)) {
    throw badRequest("Attachment filename points outside the upload directory");
  }
  return diskPath;
}

function previewProfile(record: AttachmentRecord): AttachmentPreviewProfile {
  const mimetype = record.mimetype.toLowerCase();
  const extension = extensionOf(record.originalName || record.filename);

  if (mimetype.startsWith("image/")) {
    return { kind: "image", label: "Bild", mode: "asset" };
  }
  if (mimetype === "application/pdf" || extension === "pdf") {
    return { kind: "pdf", label: "PDF", mode: "asset" };
  }
  if (mimetype.startsWith("audio/")) {
    return { kind: "audio", label: "Audio", mode: "asset" };
  }
  if (mimetype.startsWith("video/")) {
    return { kind: "video", label: "Video", mode: "asset" };
  }
  if (mimetype === "text/csv" || mimetype === "text/tab-separated-values" || csvExtensions.has(extension)) {
    return { kind: "csv", label: extension === "tsv" ? "TSV" : "CSV", mode: "text" };
  }
  if (
    mimetype.startsWith("text/") ||
    mimetype === "application/json" ||
    mimetype === "application/xml" ||
    mimetype === "application/x-yaml" ||
    mimetype === "application/yaml" ||
    textExtensions.has(extension)
  ) {
    return { kind: "text", label: extension ? extension.toUpperCase().slice(0, 8) : "Text", mode: "text" };
  }
  if (isOfficeMimeType(mimetype) || officeExtensions.has(extension)) {
    return { kind: "generatedPdf", label: extension ? extension.toUpperCase().slice(0, 8) : "Dokument", mode: "office" };
  }

  return { kind: "unsupported", label: extension ? extension.toUpperCase().slice(0, 8) : "Datei", mode: "unsupported" };
}

function isOfficeMimeType(mimetype: string): boolean {
  return (
    mimetype === "application/msword" ||
    mimetype === "application/rtf" ||
    mimetype === "application/vnd.ms-excel" ||
    mimetype === "application/vnd.ms-powerpoint" ||
    mimetype.startsWith("application/vnd.openxmlformats-officedocument.") ||
    mimetype.startsWith("application/vnd.oasis.opendocument.")
  );
}

function assetUrl(record: AttachmentRecord): string {
  return `/uploads/${record.filename.replaceAll("\\", "/")}`;
}

async function readTextPreview(filePath: string): Promise<AttachmentTextPreview> {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(config.previewTextMaxBytes + 1);
    const result = await handle.read(buffer, 0, buffer.length, 0);
    const contentBytes = Math.min(result.bytesRead, config.previewTextMaxBytes);
    return {
      content: buffer.subarray(0, contentBytes).toString("utf8"),
      encoding: "utf-8",
      truncated: result.bytesRead > config.previewTextMaxBytes,
      bytesRead: contentBytes
    };
  } finally {
    await handle.close();
  }
}

function previewFilename(record: AttachmentRecord): string {
  const hash = crypto.createHash("sha256").update(record.filename).digest("hex").slice(0, 12);
  return `attachment-${record.id}-${hash}.pdf`;
}

function previewUrl(filename: string): string {
  return `/previews/${filename}`;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function conversionFailureMessage(error: unknown): string {
  const candidate = error as { code?: string; killed?: boolean; signal?: string } | null;
  if (candidate?.code === "ENOENT") {
    return "LibreOffice ist nicht verfügbar. Bitte LIBREOFFICE_PATH konfigurieren oder soffice in PATH bereitstellen.";
  }
  if (candidate?.killed || candidate?.signal === "SIGTERM") {
    return "Die Dokumentvorschau wurde wegen Zeitüberschreitung abgebrochen.";
  }
  return "Die Dokumentvorschau konnte nicht erzeugt werden.";
}

async function convertOfficePreview(record: AttachmentRecord, filePath: string): Promise<AttachmentPreviewInfo> {
  const profile = previewProfile(record);
  const stat = await fs.stat(filePath);
  if (stat.size > config.previewConversionMaxBytes) {
    return failedPreview(record, profile, "Die Datei ist zu groß für eine Dokumentvorschau.");
  }

  assertSafeTestDirectoryPath(config.previewCacheDir, "PREVIEW_CACHE_DIR");
  await fs.mkdir(config.previewCacheDir, { recursive: true });

  const cachedFilename = previewFilename(record);
  const cachedPath = path.join(config.previewCacheDir, cachedFilename);
  if (await fileExists(cachedPath)) {
    return availablePreview(record, profile, previewUrl(cachedFilename), null, null);
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "taskmanager-preview-"));
  try {
    const profileDir = path.join(workDir, "lo-profile");
    const extension = path.extname(record.originalName || record.filename) || ".bin";
    const sourcePath = path.join(workDir, `source${extension}`);
    const convertedPath = path.join(workDir, "source.pdf");

    await fs.mkdir(profileDir, { recursive: true });
    await fs.copyFile(filePath, sourcePath);
    await execFileAsync(
      config.libreOfficePath,
      ["--headless", "--nologo", "--nofirststartwizard", `-env:UserInstallation=${pathToFileURL(profileDir).href}`, "--convert-to", "pdf", "--outdir", workDir, sourcePath],
      {
        timeout: config.previewConversionTimeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024
      }
    );

    if (!(await fileExists(convertedPath))) {
      return failedPreview(record, profile, "LibreOffice hat keine PDF-Vorschau erzeugt.");
    }

    await fs.copyFile(convertedPath, cachedPath);
    return availablePreview(record, profile, previewUrl(cachedFilename), null, null);
  } catch (error) {
    return failedPreview(record, profile, conversionFailureMessage(error));
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

function availablePreview(record: AttachmentRecord, profile: AttachmentPreviewProfile, url: string | null, text: AttachmentTextPreview | null, message: string | null): AttachmentPreviewInfo {
  return {
    id: record.id,
    kind: profile.kind,
    status: "available",
    label: profile.label,
    previewUrl: url,
    text,
    message,
    generatedAt: new Date().toISOString()
  };
}

function unsupportedPreview(record: AttachmentRecord, profile: AttachmentPreviewProfile): AttachmentPreviewInfo {
  return {
    id: record.id,
    kind: "unsupported",
    status: "unsupported",
    label: profile.label,
    previewUrl: null,
    text: null,
    message: "Für diesen Dateityp ist keine sichere Vorschau verfügbar.",
    generatedAt: null
  };
}

function failedPreview(record: AttachmentRecord, profile: AttachmentPreviewProfile, message: string): AttachmentPreviewInfo {
  return {
    id: record.id,
    kind: profile.kind,
    status: "failed",
    label: profile.label,
    previewUrl: null,
    text: null,
    message,
    generatedAt: null
  };
}

export async function getAttachmentPreview(database: DbClient, id: number): Promise<AttachmentPreviewInfo> {
  const record = firstRow(await database.select().from(attachments).where(eq(attachments.id, id)));
  if (!record) {
    throw notFound(`Attachment with id ${id} not found`);
  }

  const profile = previewProfile(record);
  if (profile.mode === "unsupported") {
    return unsupportedPreview(record, profile);
  }

  const filePath = attachmentDiskPath(record);
  if (!(await fileExists(filePath))) {
    return failedPreview(record, profile, "Die Datei wurde im Upload-Verzeichnis nicht gefunden.");
  }

  if (profile.mode === "asset") {
    return availablePreview(record, profile, assetUrl(record), null, null);
  }
  if (profile.mode === "text") {
    return availablePreview(record, profile, null, await readTextPreview(filePath), null);
  }

  return convertOfficePreview(record, filePath);
}

export async function removeAttachmentPreviews(id: number): Promise<void> {
  assertSafeTestDirectoryPath(config.previewCacheDir, "PREVIEW_CACHE_DIR");
  const prefix = `attachment-${id}-`;
  let entries: string[];
  try {
    entries = await fs.readdir(config.previewCacheDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.startsWith(prefix)) {
      await fs.rm(path.join(config.previewCacheDir, entry), { force: true });
    }
  }
}
