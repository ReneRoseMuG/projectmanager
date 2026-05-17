import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";

export type ContentSubdir = "features" | "usecases" | "wiki";

let contentBaseDir = config.contentDir;

function ensureInsideBase(baseDir: string, targetPath: string): void {
  const relative = path.relative(baseDir, targetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Content path must stay inside the configured content directory");
  }
}

function sanitizeSegment(value: string): string {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "content";
}

export function setContentBaseDir(dir: string): void {
  assertSafeTestDirectoryPath(dir, "CONTENT_DIR");
  contentBaseDir = path.resolve(dir);
}

export function getContentBaseDir(): string {
  return contentBaseDir;
}

export function resolveContentPath(subdir: ContentSubdir, filename: string): string {
  const subdirPath = path.resolve(contentBaseDir, subdir);
  assertSafeTestDirectoryPath(contentBaseDir, "CONTENT_DIR");
  const absolutePath = path.resolve(subdirPath, filename);

  ensureInsideBase(subdirPath, absolutePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  return absolutePath;
}

export function buildStoredContentPath(subdir: ContentSubdir, filename: string): string {
  return path.posix.join("content", subdir, filename.replace(/\\/g, "/"));
}

export function resolveStoredContentPath(contentPath: string): string {
  const normalizedPath = contentPath.replace(/\\/g, "/").replace(/^content\//, "");
  const [subdir, ...filenameParts] = normalizedPath.split("/");

  if (subdir !== "features" && subdir !== "usecases" && subdir !== "wiki") {
    throw new Error("Stored content path must include a known content subdirectory");
  }

  return resolveContentPath(subdir, filenameParts.join("/"));
}

export function buildFilename(prefix: string, id: number, slug: string): string {
  return `${sanitizeSegment(prefix)}-${id}-${sanitizeSegment(slug)}.md`;
}

export function writeContent(absolutePath: string, markdown: string): void {
  assertSafeTestDirectoryPath(path.dirname(absolutePath), "CONTENT_DIR");
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, markdown, "utf8");
}

export function readContent(absolutePath: string): string {
  assertSafeTestDirectoryPath(path.dirname(absolutePath), "CONTENT_DIR");
  try {
    return fs.readFileSync(absolutePath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

export function deleteContent(absolutePath: string): void {
  assertSafeTestDirectoryPath(path.dirname(absolutePath), "CONTENT_DIR");
  try {
    fs.rmSync(absolutePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

export function renameContent(oldPath: string, newPath: string): string {
  assertSafeTestDirectoryPath(path.dirname(oldPath), "CONTENT_DIR");
  assertSafeTestDirectoryPath(path.dirname(newPath), "CONTENT_DIR");
  fs.mkdirSync(path.dirname(newPath), { recursive: true });
  fs.renameSync(oldPath, newPath);
  return newPath;
}
