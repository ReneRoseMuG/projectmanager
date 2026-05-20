import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  apiRoot,
  assertSafeTestDatabasePath,
  assertSafeTestDirectoryPath,
  assertSafeTestRuntimeTargets,
  isTestRuntime,
  repoRoot,
  testRuntimeRoot
} from "./runtime-safety.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Test-Runtimes dürfen keine App-DB und keine App-Dateiverzeichnisse verwenden.
 * - Temp-Verzeichnisse und apps/api/.test-runtime sind als isolierte Testziele erlaubt.
 *
 * Fehlerfälle:
 * - Standard-DB, uploads/, previews/, content/ und backups/ werden im Testmodus blockiert.
 *
 * Ziel:
 * Datenbank- und Dateisystemtests technisch gegen produktive Laufzeitpfade absichern.
 */

const originalNodeEnv = process.env.NODE_ENV;
const originalProjectManagerTestMode = process.env.TASKMANAGER_TEST_MODE;

function enableTestRuntime() {
  process.env.NODE_ENV = "test";
  process.env.TASKMANAGER_TEST_MODE = "1";
}

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalProjectManagerTestMode === undefined) {
    delete process.env.TASKMANAGER_TEST_MODE;
  } else {
    process.env.TASKMANAGER_TEST_MODE = originalProjectManagerTestMode;
  }
});

describe("runtime safety guard", () => {
  it("erkennt Test-Runtimes über NODE_ENV und TASKMANAGER_TEST_MODE", () => {
    expect(isTestRuntime({ NODE_ENV: "production" })).toBe(false);
    expect(isTestRuntime({ NODE_ENV: "test" })).toBe(true);
    expect(isTestRuntime({ TASKMANAGER_TEST_MODE: "1" })).toBe(true);
    expect(isTestRuntime({ VITEST: "true" })).toBe(true);
  });

  it("blockiert die normale App-Datenbank im Testmodus", () => {
    enableTestRuntime();

    expect(() => assertSafeTestDatabasePath(path.join(apiRoot, "data", "taskmanager.sqlite"))).toThrow(/application data directory/);
    expect(() => assertSafeTestDatabasePath(path.join(apiRoot, "data", "test.sqlite"))).toThrow(/application data directory/);
  });

  it("erlaubt nur isolierte Datenbanken im Testmodus", () => {
    enableTestRuntime();

    expect(() => assertSafeTestDatabasePath(":memory:")).not.toThrow();
    expect(() => assertSafeTestDatabasePath(path.join(os.tmpdir(), "taskmanager-test.sqlite"))).not.toThrow();
    expect(() => assertSafeTestDatabasePath(path.join(testRuntimeRoot, "e2e", "taskmanager.sqlite"))).not.toThrow();
  });

  it("blockiert normale App-Dateiverzeichnisse im Testmodus", () => {
    enableTestRuntime();

    expect(() => assertSafeTestDirectoryPath(path.join(apiRoot, "uploads"), "UPLOAD_DIR")).toThrow(/application filesystem/);
    expect(() => assertSafeTestDirectoryPath(path.join(apiRoot, "previews"), "PREVIEW_CACHE_DIR")).toThrow(/application filesystem/);
    expect(() => assertSafeTestDirectoryPath(path.join(apiRoot, "content"), "CONTENT_DIR")).toThrow(/application filesystem/);
    expect(() => assertSafeTestDirectoryPath(path.join(repoRoot, "backups"), "BACKUP_WORK_DIR")).toThrow(/application filesystem/);
  });

  it("prüft komplette Runtime-Ziele gemeinsam", () => {
    enableTestRuntime();

    expect(() =>
      assertSafeTestRuntimeTargets({
        databasePath: path.join(testRuntimeRoot, "e2e", "data", "taskmanager.sqlite"),
        uploadDir: path.join(testRuntimeRoot, "e2e", "uploads"),
        previewCacheDir: path.join(testRuntimeRoot, "e2e", "previews"),
        contentDir: path.join(testRuntimeRoot, "e2e", "content"),
        backupWorkDir: path.join(testRuntimeRoot, "e2e", "backups")
      })
    ).not.toThrow();
  });
});
