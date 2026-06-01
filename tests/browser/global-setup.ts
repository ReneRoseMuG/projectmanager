import { chromium, expect } from "@playwright/test";
import { config as loadDotenv } from "dotenv";
import mysql from "mysql2/promise";
import fs from "node:fs/promises";
import path from "node:path";

import { fileURLToPath } from "node:url";
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const e2eRuntimeRoot = path.join(repoRoot, "tests/.runtime/e2e");
const testEnv = loadDotenv({ path: path.join(repoRoot, ".env.test"), processEnv: {} }).parsed ?? {};
const dbName = process.env.DB_NAME ?? "taskmanager_e2e";
const webBaseUrl = process.env.PLAYWRIGHT_WEB_BASE_URL ?? "http://127.0.0.1:5174";
const authFile = process.env.PLAYWRIGHT_AUTH_FILE ?? path.join(e2eRuntimeRoot, ".auth", "admin.json");

function dbConfig() {
  return {
    host: process.env.DB_HOST ?? testEnv.TEST_DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? testEnv.TEST_DB_PORT ?? 3306),
    user: process.env.DB_USER ?? testEnv.TEST_DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? testEnv.TEST_DB_PASSWORD ?? "",
  };
}

function quoteIdentifier(value: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Invalid E2E database name: ${value}`);
  }
  return `\`${value}\``;
}

export default async function globalSetup() {
  const cfg = dbConfig();
  console.log(`[e2e] Creating ${dbName} as ${cfg.user}@${cfg.host}:${cfg.port}`);
  const conn = await mysql.createConnection(cfg);
  await conn.execute(
    `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(dbName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.end();
  console.log(`[e2e] ${dbName} ready`);

  await fs.mkdir(path.dirname(authFile), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: webBaseUrl });
  try {
    await page.goto("/login");
    await page.getByRole("button", { name: "Als Rene anmelden" }).click();
    await expect(
      page.getByRole("heading", { name: "Startseite", exact: true }),
    ).toBeVisible();
    await page.context().storageState({ path: authFile });
    console.log(`[e2e] Auth storage state written to ${authFile}`);
  } finally {
    await browser.close();
  }
}
