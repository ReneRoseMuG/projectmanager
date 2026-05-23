export interface McpConfig {
  apiBaseUrl: string;
  apiKey: string;
  httpHost: string;
  httpPort: number;
  httpPath: string;
  httpBearerToken: string | null;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(): McpConfig {
  return {
    apiBaseUrl: process.env.PROJECT_MANAGER_API_BASE_URL?.trim() || "http://localhost:3001/api",
    apiKey: requiredEnv("PROJECT_MANAGER_API_KEY"),
    httpHost: process.env.MCP_HTTP_HOST?.trim() || "127.0.0.1",
    httpPort: optionalNumber("MCP_HTTP_PORT", 3010),
    httpPath: process.env.MCP_HTTP_PATH?.trim() || "/mcp",
    httpBearerToken: process.env.MCP_HTTP_BEARER_TOKEN?.trim() || null
  };
}

export function requireHttpBearerToken(config: Pick<McpConfig, "httpBearerToken">): string {
  if (!config.httpBearerToken) {
    throw new Error("MCP_HTTP_BEARER_TOKEN is required for HTTP transport");
  }
  return config.httpBearerToken;
}
