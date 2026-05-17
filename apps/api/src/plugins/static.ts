import staticFiles from "@fastify/static";
import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import { config } from "../config.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";

export async function registerStatic(app: FastifyInstance): Promise<void> {
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  assertSafeTestDirectoryPath(config.previewCacheDir, "PREVIEW_CACHE_DIR");
  fs.mkdirSync(config.uploadDir, { recursive: true });
  fs.mkdirSync(config.previewCacheDir, { recursive: true });
  await app.register(staticFiles, {
    root: config.uploadDir,
    prefix: "/uploads/"
  });
  await app.register(staticFiles, {
    root: config.previewCacheDir,
    prefix: "/previews/",
    decorateReply: false
  });
}
