import { describe, expect, it } from "vitest";
import { isAuthorizedBearer, mcpErrorResponse } from "./http-auth.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der HTTP-MCP-Transport akzeptiert nur explizite Bearer-Token.
 * - Fehlerantworten bleiben JSON-RPC-kompatibel.
 *
 * Fehlerfälle:
 * - Fehlender, falscher oder unpassend formatierter Authorization-Header wird abgelehnt.
 *
 * Ziel:
 * Remote-MCP darf nicht als ungeschützter API-Key-Proxy laufen.
 */

describe("HTTP MCP auth helpers", () => {
  it("accepts only matching bearer tokens", () => {
    expect(isAuthorizedBearer("Bearer secret-token", "secret-token")).toBe(true);
    expect(isAuthorizedBearer("bearer secret-token", "secret-token")).toBe(true);
    expect(isAuthorizedBearer("Bearer wrong-token", "secret-token")).toBe(false);
    expect(isAuthorizedBearer("secret-token", "secret-token")).toBe(false);
    expect(isAuthorizedBearer(undefined, "secret-token")).toBe(false);
  });

  it("returns JSON-RPC shaped error responses", () => {
    expect(JSON.parse(mcpErrorResponse(-32001, "Unauthorized"))).toEqual({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Unauthorized"
      },
      id: null
    });
  });
});
