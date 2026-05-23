import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRoot, repoRoot } from "../../../apps/api/src/runtime-safety.js";
import { resolveBackupWorkDir } from "../../../apps/api/src/config.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der lokale Backup-Ordner wird relativ zum Repo-Root aufgelöst.
 *
 * Fehlerfälle:
 * - Ein alter `apps/api/backups`-Override wird nicht als aktiver Backup-Pfad übernommen.
 *
 * Ziel:
 * Die lokale Sicherung bleibt im freigegebenen Root-Backup-Ordner, auch wenn noch Legacy-Env-Werte vorhanden sind.
 */

const originalApiKey = process.env.API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.API_KEY;
  } else {
    process.env.API_KEY = originalApiKey;
  }
  vi.resetModules();
});

async function loadConfigWithApiKey(value: string | undefined) {
  vi.resetModules();
  if (value === undefined) {
    delete process.env.API_KEY;
  } else {
    process.env.API_KEY = value;
  }
  return import("../../../apps/api/src/config.js");
}

describe("config backup work dir", () => {
  it("löst den Standard-Backup-Ordner relativ zum Repo-Root auf", () => {
    expect(resolveBackupWorkDir(undefined)).toBe(path.resolve(repoRoot, "backups"));
    expect(resolveBackupWorkDir("./backups")).toBe(path.resolve(repoRoot, "backups"));
  });

  it("normalisiert den alten API-relativen Backup-Ordner auf den Repo-Root", () => {
    expect(resolveBackupWorkDir(path.resolve(apiRoot, "backups"))).toBe(path.resolve(repoRoot, "backups"));
    expect(resolveBackupWorkDir("apps/api/backups")).toBe(path.resolve(repoRoot, "backups"));
  });
});

describe("config api key", () => {
  it("deaktiviert API-Key-Auth ohne Secret oder bei leerem Secret", async () => {
    expect((await loadConfigWithApiKey(undefined)).config.apiKey).toBeNull();
    expect((await loadConfigWithApiKey("   ")).config.apiKey).toBeNull();
  });

  it("liest den API-Key getrimmt aus der Umgebung", async () => {
    expect((await loadConfigWithApiKey("  secret-api-key  ")).config.apiKey).toBe("secret-api-key");
  });
});
