import path from "node:path";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import type { DbClient } from "../db/client.js";
import { features, useCases, wikiPages } from "../db/schema.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";

export type ContentSubdir = "features" | "usecases" | "wiki";

let contentBaseDir = config.contentDir;

export function setContentBaseDir(dir: string): void {
  assertSafeTestDirectoryPath(dir, "CONTENT_DIR");
  contentBaseDir = path.resolve(dir);
}

export function getContentBaseDir(): string {
  return contentBaseDir;
}

export function readContentFromDb(database: DbClient, id: number, table: ContentSubdir): string {
  const record =
    table === "features"
      ? database.select({ content: features.content }).from(features).where(eq(features.id, id)).get()
      : table === "usecases"
        ? database.select({ content: useCases.content }).from(useCases).where(eq(useCases.id, id)).get()
        : database.select({ content: wikiPages.content }).from(wikiPages).where(eq(wikiPages.id, id)).get();

  return record?.content ?? "";
}

export function writeContentToDb(database: DbClient, id: number, table: ContentSubdir, html: string): void {
  const updatedAt = new Date().toISOString();
  if (table === "features") {
    database.update(features).set({ content: html, updatedAt }).where(eq(features.id, id)).run();
    return;
  }
  if (table === "usecases") {
    database.update(useCases).set({ content: html, updatedAt }).where(eq(useCases.id, id)).run();
    return;
  }
  database.update(wikiPages).set({ content: html, updatedAt }).where(eq(wikiPages.id, id)).run();
}
