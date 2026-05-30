import path from "node:path";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import type { DbSession } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
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

export async function readContentFromDb(database: DbSession, id: number, table: ContentSubdir): Promise<string> {
  const record =
    table === "features"
      ? firstRow(await database.select({ content: features.content }).from(features).where(eq(features.id, id)))
      : table === "usecases"
        ? firstRow(await database.select({ content: useCases.content }).from(useCases).where(eq(useCases.id, id)))
        : firstRow(await database.select({ content: wikiPages.content }).from(wikiPages).where(eq(wikiPages.id, id)));

  return record?.content ?? "";
}

export async function writeContentToDb(database: DbSession, id: number, table: ContentSubdir, html: string): Promise<void> {
  const updatedAt = new Date().toISOString();
  if (table === "features") {
    await database.update(features).set({ content: html, updatedAt }).where(eq(features.id, id));
    return;
  }
  if (table === "usecases") {
    await database.update(useCases).set({ content: html, updatedAt }).where(eq(useCases.id, id));
    return;
  }
  await database.update(wikiPages).set({ content: html, updatedAt }).where(eq(wikiPages.id, id));
}
