import staticFiles from "@fastify/static";
import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import { config } from "../config.js";

export async function registerStatic(app: FastifyInstance): Promise<void> {
  fs.mkdirSync(config.uploadDir, { recursive: true });
  await app.register(staticFiles, {
    root: config.uploadDir,
    prefix: "/uploads/"
  });
}
