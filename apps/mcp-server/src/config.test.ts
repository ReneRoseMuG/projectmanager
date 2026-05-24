import { afterEach, describe, expect, it } from "vitest";
import { loadConfig, requireHttpBearerToken } from "./config.js";

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte Prozess-Umgebungsvariablen werden kontrolliert gesetzt.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Prozess-Environment wird nach jedem Test wiederhergestellt.
 *
 * Abgedeckte Regeln:
 * - HTTP-MCP bleibt standardmäßig im Bearer-Modus geschützt.
 * - Der lokale ChatGPT-Testmodus muss explizit über `MCP_HTTP_AUTH_MODE=none` gewählt werden.
 *
 * Fehlerfälle:
 * - Ungültige Auth-Modi und fehlende Bearer-Token im Bearer-Modus werden abgelehnt.
 *
 * Ziel:
 * Die MCP-HTTP-Konfiguration verhindert einen versehentlich ungeschützten Remote-Endpunkt.
 */

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("MCP config", () => {
  it("uses bearer auth by default", () => {
    process.env.PROJECT_MANAGER_API_KEY = "api-key";
    delete process.env.MCP_HTTP_AUTH_MODE;
    delete process.env.MCP_HTTP_BEARER_TOKEN;

    const config = loadConfig();

    expect(config.httpAuthMode).toBe("bearer");
    expect(config.httpBearerToken).toBeNull();
    expect(() => requireHttpBearerToken(config)).toThrow("MCP_HTTP_BEARER_TOKEN is required for HTTP transport");
  });

  it("accepts explicit no-auth mode for local ChatGPT tests", () => {
    process.env.PROJECT_MANAGER_API_KEY = "api-key";
    process.env.MCP_HTTP_AUTH_MODE = "none";

    const config = loadConfig();

    expect(config.httpAuthMode).toBe("none");
    expect(requireHttpBearerToken(config)).toBeNull();
  });

  it("requires a bearer token in bearer mode", () => {
    process.env.PROJECT_MANAGER_API_KEY = "api-key";
    process.env.MCP_HTTP_AUTH_MODE = "bearer";
    process.env.MCP_HTTP_BEARER_TOKEN = "secret-token";

    const config = loadConfig();

    expect(config.httpAuthMode).toBe("bearer");
    expect(requireHttpBearerToken(config)).toBe("secret-token");
  });

  it("rejects unknown HTTP auth modes", () => {
    process.env.PROJECT_MANAGER_API_KEY = "api-key";
    process.env.MCP_HTTP_AUTH_MODE = "basic";

    expect(() => loadConfig()).toThrow("MCP_HTTP_AUTH_MODE must be either bearer or none");
  });
});
