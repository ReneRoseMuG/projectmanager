import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, describe, expect, it } from "vitest";
import type { McpConfig } from "./config.js";
import { createMcpHttpServer } from "./http-server.js";

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echter Node-HTTP-Server und echter Streamable-HTTP-MCP-Client.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; die Tests nutzen die echte MCP-Transport-Schicht.
 *
 * Isolation:
 * - Ephemerer localhost-Port, keine Datenbank und kein Dateisystem.
 *
 * Abgedeckte Regeln:
 * - Bearer-Modus schützt den HTTP-MCP-Endpunkt.
 * - Expliziter No-Auth-Modus erlaubt ChatGPT-Developer-Mode über einen lokalen Tunnel.
 * - Falsche Pfade liefern JSON-RPC-kompatible Fehlerantworten.
 *
 * Fehlerfälle:
 * - Fehlender oder falscher Authorization-Header wird abgelehnt.
 *
 * Ziel:
 * Der HTTP-Transport verhält sich für ChatGPT-kompatible Streamable-HTTP-Clients vorhersehbar und sicher.
 */

const openServers: Server[] = [];

afterEach(async () => {
  for (const server of openServers.splice(0)) {
    await closeServer(server);
  }
});

describe("MCP HTTP server", () => {
  it("rejects unauthenticated requests in bearer mode", async () => {
    const url = await startServer(testConfig({ httpAuthMode: "bearer", httpBearerToken: "secret-token" }));

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Unauthorized"
      },
      id: null
    });
  });

  it("lists tools over streamable HTTP with bearer auth", async () => {
    const url = await startServer(testConfig({ httpAuthMode: "bearer", httpBearerToken: "secret-token" }));

    await expectToolList(url, { Authorization: "Bearer secret-token" });
  });

  it("lists tools over streamable HTTP in local no-auth mode", async () => {
    const url = await startServer(testConfig({ httpAuthMode: "none", httpBearerToken: null }));

    await expectToolList(url);
  });

  it("returns JSON-RPC errors for wrong MCP paths", async () => {
    const url = await startServer(testConfig({ httpAuthMode: "none", httpBearerToken: null }), "/wrong");

    const response = await fetch(url, { method: "GET" });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      error: {
        code: -32004,
        message: "MCP endpoint not found"
      },
      id: null
    });
  });
});

async function expectToolList(url: URL, headers?: Record<string, string>): Promise<void> {
  const client = new Client({ name: "http-server-test-client", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(url, headers ? { requestInit: { headers } } : undefined);
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(expect.arrayContaining(["list_projects", "create_project", "resolve_reference"]));
  } finally {
    await client.close();
  }
}

async function startServer(config: McpConfig, path = "/mcp"): Promise<URL> {
  const server = createMcpHttpServer(config);
  openServers.push(server);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("MCP HTTP test server did not expose a TCP port");
  }
  return new URL(`http://127.0.0.1:${(address as AddressInfo).port}${path}`);
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function testConfig(overrides: Pick<McpConfig, "httpAuthMode" | "httpBearerToken">): McpConfig {
  return {
    apiBaseUrl: "http://127.0.0.1:1/api",
    apiKey: "api-key",
    httpHost: "127.0.0.1",
    httpPort: 0,
    httpPath: "/mcp",
    ...overrides
  };
}
