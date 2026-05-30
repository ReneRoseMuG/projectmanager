import { config as loadDotenv } from "dotenv";
import mysql from "mysql2/promise";
import path from "node:path";

import { fileURLToPath } from "node:url";
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const testEnv = loadDotenv({ path: path.join(repoRoot, ".env.test"), processEnv: {} }).parsed ?? {};

function dbConfig() {
  return {
    host: process.env.DB_HOST ?? testEnv.TEST_DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? testEnv.TEST_DB_PORT ?? 3306),
    user: process.env.DB_USER ?? testEnv.TEST_DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? testEnv.TEST_DB_PASSWORD ?? "",
  };
}

export default async function globalTeardown() {
  const conn = await mysql.createConnection(dbConfig());
  await conn.execute("DROP DATABASE IF EXISTS `taskmanager_e2e`");
  await conn.end();
  console.log("[e2e] taskmanager_e2e dropped");
}
