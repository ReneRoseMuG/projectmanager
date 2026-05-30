/**
 * Test Scope:
 * Dump API client
 *
 * Abgedeckte Regeln:
 * - Langlaufende Backup-Operationen warten länger als der globale API-Timeout.
 *
 * Fehlerfälle:
 * - Ein zu kurzer Client-Timeout würde langsame SFTP-Sicherungen oder Remote-Importe abbrechen.
 *
 * Ziel:
 * Den spezialisierten Timeout der Backup-Operationen ohne echten HTTP-Request absichern.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => {
  const json = vi.fn();
  return {
    json,
    get: vi.fn(() => ({ json })),
    post: vi.fn(() => ({ json })),
  };
});

vi.mock("../../../../apps/web/src/api/client", () => ({
  api: {
    get: apiMocks.get,
    post: apiMocks.post,
  },
}));

import { applyRemoteDump, previewRemoteDump, saveLocalDump } from "../../../../apps/web/src/api/dumps";

afterEach(() => {
  vi.clearAllMocks();
});

describe("dump api client", () => {
  it("nutzt für lokale Sicherungen einen längeren Timeout", async () => {
    apiMocks.json.mockResolvedValue({});

    await saveLocalDump();

    expect(apiMocks.post).toHaveBeenCalledWith("dumps/local/save", { timeout: 600000 });
    expect(apiMocks.json).toHaveBeenCalledTimes(1);
  });

  it("nutzt für Remote-Import-Prüfungen einen längeren Timeout", async () => {
    apiMocks.json.mockResolvedValue({});

    await previewRemoteDump({ fileId: "remote.zip" });

    expect(apiMocks.post).toHaveBeenCalledWith("dumps/remote/preview", { json: { fileId: "remote.zip" }, timeout: 600000 });
    expect(apiMocks.json).toHaveBeenCalledTimes(1);
  });

  it("nutzt für Remote-Importe einen längeren Timeout", async () => {
    apiMocks.json.mockResolvedValue({});

    await applyRemoteDump({ fileId: "remote.zip", fileHash: "abc123", previewToken: "preview-token", confirmed: true });

    expect(apiMocks.post).toHaveBeenCalledWith("dumps/remote/apply", {
      json: { fileId: "remote.zip", fileHash: "abc123", previewToken: "preview-token", confirmed: true },
      timeout: 600000,
    });
    expect(apiMocks.json).toHaveBeenCalledTimes(1);
  });
});
