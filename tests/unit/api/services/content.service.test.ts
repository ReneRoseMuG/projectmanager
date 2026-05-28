/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der ContentService verwaltet nur noch den Content-Basisordner für Dump-/Restore-Pfade.
 * - Dateibasierte Markdown-Fallbacks sind entfernt.
 *
 * Fehlerfälle:
 * - Unsichere Content-Basisordner werden abgewiesen.
 *
 * Ziel:
 * Absicherung der verbliebenen ContentService-Pfadkonfiguration ohne produktive Verzeichnisse.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getContentBaseDir, setContentBaseDir } from "../../../../apps/api/src/services/content.service.js";

describe("ContentService", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "content-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("setzt und normalisiert den Content-Basisordner", () => {
    setContentBaseDir(tmpDir);

    expect(getContentBaseDir()).toBe(path.resolve(tmpDir));
  });

  it("weist unsichere Content-Basisordner ab", () => {
    expect(() => setContentBaseDir(path.parse(tmpDir).root)).toThrow();
  });
});
