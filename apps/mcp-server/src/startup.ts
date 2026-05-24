import fs from "node:fs";
import path from "node:path";

export type ProjectManagerStartMode = "dev" | "production";

export interface ProjectManagerStartPlan {
  names: string[];
  commands: string[];
  env: Record<string, string>;
  warnings: string[];
  publicUrl: string | null;
}

export type StartupEnv = Record<string, string | undefined>;

export function parseEnvFile(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const normalizedLine = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const separatorIndex = normalizedLine.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }
    const key = normalizedLine.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }
    values[key] = stripEnvQuotes(normalizedLine.slice(separatorIndex + 1).trim());
  }
  return values;
}

export function loadLocalEnv(repoRoot: string): Record<string, string> {
  const envPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envPath)) {
    return {};
  }
  return parseEnvFile(fs.readFileSync(envPath, "utf8"));
}

export function createProjectManagerStartPlan(mode: ProjectManagerStartMode, env: StartupEnv): ProjectManagerStartPlan {
  const runtimeEnv = compactEnv(env);
  const names = ["API", "WEB"];
  const commands = mode === "production"
    ? ["npm run start -w apps/api", "npm run preview -w apps/web -- --host 0.0.0.0 --port 5173"]
    : ["npm run dev -w apps/api", "npm run dev -w apps/web"];
  const warnings: string[] = [];
  const mcpAutostart = booleanEnv(env.PROJECT_MANAGER_MCP_AUTOSTART);
  const tunnelCommand = stringEnv(env.MCP_TUNNEL_COMMAND);
  const tunnelAutostart = booleanEnv(env.PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART);

  if (tunnelAutostart && !mcpAutostart) {
    throw new Error("PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART requires PROJECT_MANAGER_MCP_AUTOSTART=true");
  }

  if (mcpAutostart) {
    configureMcpEnvironment(env, runtimeEnv, warnings);
    names.push("MCP");
    commands.push("npm run start:http -w apps/mcp-server");
  }

  if (tunnelAutostart) {
    if (!tunnelCommand) {
      throw new Error("PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART requires MCP_TUNNEL_COMMAND");
    }
    names.push("TUNNEL");
    commands.push(tunnelCommand);
    if (!stringEnv(env.MCP_PUBLIC_URL)) {
      warnings.push("MCP_PUBLIC_URL is not set; keep the stable tunnel URL documented in ChatGPT.");
    }
  }

  return {
    names,
    commands,
    env: runtimeEnv,
    warnings,
    publicUrl: stringEnv(env.MCP_PUBLIC_URL) ?? null
  };
}

function configureMcpEnvironment(sourceEnv: StartupEnv, targetEnv: Record<string, string>, warnings: string[]): void {
  const apiKey = stringEnv(sourceEnv.PROJECT_MANAGER_API_KEY) ?? stringEnv(sourceEnv.API_KEY);
  if (!apiKey) {
    throw new Error("PROJECT_MANAGER_MCP_AUTOSTART requires PROJECT_MANAGER_API_KEY or API_KEY");
  }

  const authMode = stringEnv(sourceEnv.MCP_HTTP_AUTH_MODE) ?? "bearer";
  if (authMode !== "bearer" && authMode !== "none") {
    throw new Error("MCP_HTTP_AUTH_MODE must be either bearer or none");
  }
  if (authMode === "bearer" && !stringEnv(sourceEnv.MCP_HTTP_BEARER_TOKEN)) {
    throw new Error("MCP_HTTP_BEARER_TOKEN is required when MCP_HTTP_AUTH_MODE is bearer");
  }
  if (authMode === "none") {
    warnings.push("MCP HTTP auth is disabled. Use only with a private local tunnel for ChatGPT testing.");
  }

  targetEnv.API_KEY = apiKey;
  targetEnv.PROJECT_MANAGER_API_KEY = apiKey;
  targetEnv.PROJECT_MANAGER_API_BASE_URL = stringEnv(sourceEnv.PROJECT_MANAGER_API_BASE_URL) ?? stringEnv(sourceEnv.VITE_API_URL) ?? "http://localhost:3001/api";
  targetEnv.MCP_HTTP_AUTH_MODE = authMode;
  targetEnv.MCP_HTTP_HOST = stringEnv(sourceEnv.MCP_HTTP_HOST) ?? "127.0.0.1";
  targetEnv.MCP_HTTP_PORT = stringEnv(sourceEnv.MCP_HTTP_PORT) ?? "3010";
  targetEnv.MCP_HTTP_PATH = stringEnv(sourceEnv.MCP_HTTP_PATH) ?? "/mcp";
}

function compactEnv(env: StartupEnv): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      values[key] = value;
    }
  }
  return values;
}

function stripEnvQuotes(value: string): string {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function stringEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function booleanEnv(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}
