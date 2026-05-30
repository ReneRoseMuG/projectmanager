import { describe, expect, it } from "vitest";
import { createProjectManagerStartPlan, parseEnvFile } from "./startup.js";

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte Startbefehle werden geplant, aber keine Prozesse gestartet.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Reine Funktionsaufrufe ohne Dateisystem-, Netzwerk- oder Datenbankzugriff.
 *
 * Abgedeckte Regeln:
 * - Standardstart bleibt API und Web.
 * - MCP und Tunnel starten nur nach expliziter lokaler Konfiguration.
 * - API-Key und MCP-Key werden für beide Startpfade vereinheitlicht.
 *
 * Fehlerfälle:
 * - Fehlender API-Key, fehlender Tunnel-Befehl und ungültiger Auth-Modus blockieren den Autostart.
 *
 * Ziel:
 * `npm run dev` und das Startscript können denselben MCP-/Tunnel-Startplan nutzen.
 */

describe("project manager startup plan", () => {
  it("keeps the default dev start limited to API and web", () => {
    const plan = createProjectManagerStartPlan("dev", {});

    expect(plan.names).toEqual(["API", "WEB"]);
    expect(plan.commands).toEqual(["npm run dev -w apps/api", "npm run dev -w apps/web"]);
  });

  it("adds MCP HTTP when autostart is enabled", () => {
    const plan = createProjectManagerStartPlan("dev", {
      PROJECT_MANAGER_MCP_AUTOSTART: "true",
      API_KEY: "local-api-key",
      MCP_HTTP_AUTH_MODE: "bearer",
      MCP_HTTP_BEARER_TOKEN: "mcp-token"
    });

    expect(plan.names).toEqual(["API", "WEB", "MCP"]);
    expect(plan.commands).toContain("npm run start:http -w apps/mcp-server");
    expect(plan.env.API_KEY).toBe("local-api-key");
    expect(plan.env.PROJECT_MANAGER_API_KEY).toBe("local-api-key");
    expect(plan.env.PROJECT_MANAGER_API_BASE_URL).toBe("http://localhost:3001/api");
  });

  it("adds a tunnel command when tunnel autostart is configured", () => {
    const plan = createProjectManagerStartPlan("production", {
      PROJECT_MANAGER_MCP_AUTOSTART: "true",
      PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART: "true",
      PROJECT_MANAGER_API_KEY: "local-api-key",
      MCP_HTTP_AUTH_MODE: "none",
      MCP_TUNNEL_COMMAND: "cloudflared tunnel run projekt-manager-home",
      MCP_PUBLIC_URL: "https://projekt-manager-home.example.com/mcp"
    });

    expect(plan.names).toEqual(["API", "WEB", "MCP", "TUNNEL"]);
    expect(plan.commands).toEqual([
      "npm run start -w apps/api",
      "npm run preview -w apps/web -- --host 0.0.0.0 --port 5173",
      "npm run start:http -w apps/mcp-server",
      "cloudflared tunnel run projekt-manager-home"
    ]);
    expect(plan.publicUrl).toBe("https://projekt-manager-home.example.com/mcp");
    expect(plan.warnings).toContain("MCP HTTP auth is disabled. Use only with a private local tunnel for ChatGPT testing.");
  });

  it("keeps a documented tunnel command dormant until tunnel autostart is enabled", () => {
    const plan = createProjectManagerStartPlan("dev", {
      PROJECT_MANAGER_MCP_AUTOSTART: "true",
      PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART: "false",
      PROJECT_MANAGER_API_KEY: "local-api-key",
      MCP_HTTP_AUTH_MODE: "none",
      MCP_TUNNEL_COMMAND: "cloudflared tunnel run projekt-manager-home"
    });

    expect(plan.names).toEqual(["API", "WEB", "MCP"]);
    expect(plan.commands).not.toContain("cloudflared tunnel run projekt-manager-home");
  });

  it("blocks MCP autostart without an API key", () => {
    expect(() => createProjectManagerStartPlan("dev", {
      PROJECT_MANAGER_MCP_AUTOSTART: "true",
      MCP_HTTP_AUTH_MODE: "none"
    })).toThrow("PROJECT_MANAGER_MCP_AUTOSTART requires PROJECT_MANAGER_API_KEY or API_KEY");
  });

  it("blocks bearer autostart without a bearer token", () => {
    expect(() => createProjectManagerStartPlan("dev", {
      PROJECT_MANAGER_MCP_AUTOSTART: "true",
      PROJECT_MANAGER_API_KEY: "local-api-key",
      MCP_HTTP_AUTH_MODE: "bearer"
    })).toThrow("MCP_HTTP_BEARER_TOKEN is required when MCP_HTTP_AUTH_MODE is bearer");
  });

  it("blocks tunnel autostart without a tunnel command", () => {
    expect(() => createProjectManagerStartPlan("dev", {
      PROJECT_MANAGER_MCP_AUTOSTART: "true",
      PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART: "true",
      PROJECT_MANAGER_API_KEY: "local-api-key",
      MCP_HTTP_AUTH_MODE: "none"
    })).toThrow("PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART requires MCP_TUNNEL_COMMAND");
  });

  it("parses root env files with comments and quoted values", () => {
    expect(parseEnvFile([
      "# local config",
      "PROJECT_MANAGER_MCP_AUTOSTART=true",
      "MCP_TUNNEL_COMMAND=\"cloudflared tunnel run projekt-manager-home\"",
      "export MCP_PUBLIC_URL='https://projekt-manager-home.example.com/mcp'"
    ].join("\n"))).toEqual({
      PROJECT_MANAGER_MCP_AUTOSTART: "true",
      MCP_TUNNEL_COMMAND: "cloudflared tunnel run projekt-manager-home",
      MCP_PUBLIC_URL: "https://projekt-manager-home.example.com/mcp"
    });
  });
});
