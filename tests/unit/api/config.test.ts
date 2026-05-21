import path from "node:path";
import { describe, expect, it } from "vitest";
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
