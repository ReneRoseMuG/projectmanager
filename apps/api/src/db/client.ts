import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { assertSafeTestDatabasePath } from "../runtime-safety.js";
import * as schema from "./schema.js";

assertSafeTestDatabasePath(config.databasePath);
fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

export const sqlite = new Database(config.databasePath);
sqlite.pragma("foreign_keys = ON");

export const db = drizzle({ client: sqlite, schema });
export type DbClient = typeof db;
export type DbSession = Omit<DbClient, "$client">;
