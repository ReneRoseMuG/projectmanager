/**
 * Test Scope:
 * Dump API client
 *
 * Abgedeckte Regeln:
 * - Die lokale Sicherung wartet länger als der globale API-Timeout auf SFTP-Uploads.
 *
 * Fehlerfälle:
 * - Ein zu kurzer Client-Timeout würde langsame SFTP-Sicherungen abbrechen.
 *
 * Ziel:
 * Den spezialisierten Timeout des Backup-Sichern-Aufrufs ohne echten HTTP-Request absichern.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => {
  const json = vi.fn();
  return {
    json,
    post: vi.fn(() => ({ json }))
  };
});

vi.mock("../../../../apps/web/src/api/client", () => ({
  api: {
    post: apiMocks.post
  }
}));

import { saveLocalDump } from "../../../../apps/web/src/api/dumps";

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
});
