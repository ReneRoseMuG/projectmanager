/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Web-API-Client sendet bei mutierenden Requests die Tab-ID.
 * - Lesende Requests bleiben ohne Realtime-Header.
 *
 * Fehlerfälle:
 * - Ohne Header kann die API eigene SSE-Events nicht vom auslösenden Tab unterscheiden.
 *
 * Ziel:
 * Die zentrale Tab-ID-Propagation für Realtime-Synchronisation absichern.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("api client realtime header", () => {
  it("setzt X-Client-Tab-Id für mutierende Requests", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { api, getClientTabId } = await import("../../../../apps/web/src/api/client");
    const tabId = getClientTabId();

    await api.post("projects", { json: { name: "Realtime" } }).json();

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get("X-Client-Tab-Id")).toBe(tabId);
  });

  it("setzt keinen X-Client-Tab-Id-Header für GET-Requests", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../../../../apps/web/src/api/client");

    await api.get("projects").json();

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.has("X-Client-Tab-Id")).toBe(false);
  });
});
