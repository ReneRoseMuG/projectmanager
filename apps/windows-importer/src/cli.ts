import { readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDmsTag, importBatch, loadImportOptions, progressFileWriter, type ImportRequest, type ImporterConfig } from "./importer.js";

function parseEnvFile(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function loadConfig(): Promise<ImporterConfig> {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "..", "..", "..");
  let fileEnv: Record<string, string> = {};
  try {
    fileEnv = parseEnvFile(await readFile(path.join(repoRoot, "apps", "api", ".env"), "utf8"));
  } catch {
    // Environment-only installations do not need a repository .env file.
  }
  const apiKey = process.env.API_KEY?.trim() || fileEnv.API_KEY?.trim();
  if (!apiKey) {
    throw new Error("API_KEY fehlt. Bitte in apps/api/.env konfigurieren.");
  }
  const port = process.env.PORT?.trim() || fileEnv.PORT?.trim() || "3001";
  const apiBaseUrl = process.env.PROJECT_MANAGER_API_BASE_URL?.trim() || fileEnv.PROJECT_MANAGER_API_BASE_URL?.trim() || `http://localhost:${port}/api`;
  return { apiBaseUrl, apiKey };
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const config = await loadConfig();
  if (command === "options") {
    process.stdout.write(JSON.stringify(await loadImportOptions(config)));
    return;
  }
  if (command === "create-tag") {
    const requestPath = argumentValue("--request");
    if (!requestPath) {
      throw new Error("Tag-Erstellung benötigt --request.");
    }
    const requestJson = (await readFile(requestPath, "utf8")).replace(/^\uFEFF/, "");
    const request = JSON.parse(requestJson) as { name?: string };
    process.stdout.write(JSON.stringify(await createDmsTag(config, request.name ?? "")));
    return;
  }
  if (command === "import") {
    const requestPath = argumentValue("--request");
    const resultPath = argumentValue("--result");
    const progressPath = argumentValue("--progress");
    if (!requestPath || !resultPath || !progressPath) {
      throw new Error("Import benötigt --request, --result und --progress.");
    }
    const requestJson = (await readFile(requestPath, "utf8")).replace(/^\uFEFF/, "");
    const request = JSON.parse(requestJson) as ImportRequest;
    const summary = await importBatch(config, request, {
      fetch,
      readFile,
      removeFile: rm,
      stat,
      writeProgress: progressFileWriter(progressPath)
    });
    await writeFile(resultPath, JSON.stringify(summary), "utf8");
    return;
  }
  throw new Error("Erwarteter Befehl: options, create-tag oder import.");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
