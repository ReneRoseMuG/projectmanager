// @vitest-environment jsdom

/**
 * Test Scope:
 * Realtime-Invalidierung für die getrennte Dokumentdomäne.
 *
 * Test-Ebene:
 * - Unit/Hook
 *
 * Realitätsgrad:
 * - Echter TanStack QueryClient, echte Realtime-Parsing- und Invalidierungslogik.
 *
 * Mock-Entscheidung:
 * - Unit-Testdouble nur für EventSource und die stabile Browser-Tab-ID; kein Query-Mock.
 *
 * Isolation:
 * - Eigener QueryClient und EventSource je Test, kein Netzwerk.
 *
 * Abgedeckte Regeln:
 * - Scope documents invalidiert globale DMS-Queries und Parent-Dokumentlink-Queries.
 * - Ereignisse aus dem eigenen Tab werden ignoriert.
 *
 * Fehlerfälle:
 * - Eigene Realtime-Ereignisse dürfen keine redundante Invalidierung auslösen.
 *
 * Ziel:
 * DMS-Änderungen werden ohne Seitenreload auch in Parent-Dateiansichten sichtbar.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRealtimeSync } from "../../../../apps/web/src/hooks/useRealtimeSync";
import { queryKeys } from "../../../../apps/web/src/queries/queryKeys";

vi.mock("../../../../apps/web/src/api/client", () => ({
  apiBaseUrl: "http://api.test/api",
  getClientTabId: () => "own-tab"
}));

class EventSourceDouble {
  static latest: EventSourceDouble | null = null;
  onopen: (() => void) | null = null;
  private listeners = new Map<string, EventListener>();

  constructor(public readonly url: string, public readonly options: EventSourceInit) {
    EventSourceDouble.latest = this;
  }

  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, listener);
  }

  removeEventListener(type: string): void {
    this.listeners.delete(type);
  }

  close(): void {
    this.listeners.clear();
  }

  emit(type: string, data: string): void {
    this.listeners.get(type)?.(new MessageEvent(type, { data }));
  }
}

let client: QueryClient;

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  EventSourceDouble.latest = null;
  vi.stubGlobal("EventSource", EventSourceDouble);
});

afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
});

describe("useRealtimeSync", () => {
  it("invalidiert bei documents sowohl DMS als auch Parent-Dokumentlinks", async () => {
    const documentKey = queryKeys.documents.library({});
    const linkKey = queryKeys.attachments.documentLinks("project", 7);
    client.setQueryData(documentKey, { items: [] });
    client.setQueryData(linkKey, []);
    renderHook(() => useRealtimeSync(true), { wrapper: Wrapper });

    expect(EventSourceDouble.latest?.url).toBe("http://api.test/api/realtime/stream");
    act(() => {
      EventSourceDouble.latest?.emit("invalidate", JSON.stringify({
        type: "invalidate",
        scope: "documents",
        sourceTabId: "other-tab"
      }));
    });

    await waitFor(() => expect(client.getQueryState(documentKey)?.isInvalidated).toBe(true));
    expect(client.getQueryState(linkKey)?.isInvalidated).toBe(true);
  });

  it("ignoriert ein documents-Ereignis aus dem eigenen Tab", async () => {
    const documentKey = queryKeys.documents.library({});
    client.setQueryData(documentKey, { items: [] });
    renderHook(() => useRealtimeSync(true), { wrapper: Wrapper });

    act(() => {
      EventSourceDouble.latest?.emit("invalidate", JSON.stringify({
        type: "invalidate",
        scope: "documents",
        sourceTabId: "own-tab"
      }));
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.getQueryState(documentKey)?.isInvalidated).toBe(false);
  });
});
