// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - React-Hook mit kontrolliertem EventSource-Testdouble.
 *
 * Mock-Entscheidung:
 * - EventSource und QueryClient werden isoliert, weil der Test das Client-seitige Event-Routing prüft.
 *
 * Isolation:
 * - jsdom ohne Netzwerkverbindung.
 *
 * Abgedeckte Regeln:
 * - `backup_progress`-SSE-Nachrichten werden an den Backup-Progress-Store weitergegeben.
 *
 * Fehlerfälle:
 * - Ungültige Events dürfen keinen Progress-State veröffentlichen.
 *
 * Ziel:
 * Die Realtime-Anbindung der Backup-Fortschrittsevents absichern.
 */

import { act } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRealtimeSync } from "../../../../apps/web/src/hooks/useRealtimeSync";
import { publishBackupProgress } from "../../../../apps/web/src/hooks/useBackupProgress";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  private readonly listeners = new Map<string, EventListener[]>();

  constructor() {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((item) => item !== listener));
  }

  close(): void {
    return;
  }

  dispatch(type: string, data: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data } as MessageEvent<string>);
    }
  }
}

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({})
}));

vi.mock("../../../../apps/web/src/api/client", () => ({
  apiBaseUrl: "http://localhost/api",
  getClientTabId: () => "tab-a"
}));

vi.mock("../../../../apps/web/src/hooks/useBackupProgress", () => ({
  publishBackupProgress: vi.fn()
}));

function RealtimeHarness({ enabled }: { enabled: boolean }) {
  useRealtimeSync(enabled);
  return null;
}

afterEach(() => {
  cleanup();
  FakeEventSource.instances = [];
  vi.mocked(publishBackupProgress).mockReset();
  vi.unstubAllGlobals();
});

describe("useRealtimeSync backup progress", () => {
  it("leitet gültige Backup-Fortschrittsevents weiter", () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    render(<RealtimeHarness enabled />);

    act(() => {
      FakeEventSource.instances[0]?.dispatch(
        "backup_progress",
        JSON.stringify({
          type: "backup_progress",
          operation: "full_backup",
          phase: "archive",
          current: 1,
          total: 2,
          detail: "taskmanager_dump.zip"
        })
      );
    });

    expect(publishBackupProgress).toHaveBeenCalledWith({
      type: "backup_progress",
      operation: "full_backup",
      phase: "archive",
      current: 1,
      total: 2,
      detail: "taskmanager_dump.zip"
    });
  });

  it("ignoriert ungültige Backup-Fortschrittsevents", () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    render(<RealtimeHarness enabled />);

    act(() => {
      FakeEventSource.instances[0]?.dispatch("backup_progress", JSON.stringify({ type: "backup_progress", phase: "archive" }));
    });

    expect(publishBackupProgress).not.toHaveBeenCalled();
  });
});
