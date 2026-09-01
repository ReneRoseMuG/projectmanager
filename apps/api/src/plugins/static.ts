import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import { config } from "../config.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";

export async function registerStatic(app: FastifyInstance): Promise<void> {
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  assertSafeTestDirectoryPath(config.previewCacheDir, "PREVIEW_CACHE_DIR");
  fs.mkdirSync(config.uploadDir, { recursive: true });
  fs.mkdirSync(config.previewCacheDir, { recursive: true });
  // Uploaded files and generated previews are served only through authenticated
  // attachment routes. Static directories would bypass the API permission boundary.
  void app;
}
