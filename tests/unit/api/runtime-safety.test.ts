import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  apiRoot,
  assertSafeTestDirectoryPath,
  assertSafeTestRuntimeTargets,
  isTestRuntime,
  testRuntimeRoot
} from "../../../apps/api/src/runtime-safety.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Test-Runtimes dürfen keine App-Dateiverzeichnisse verwenden.
 * - Temp-Verzeichnisse und tests/.runtime sind als isolierte Testziele erlaubt.
 *
 * Fehlerfälle:
 * - uploads/, previews/, content/ werden im Testmodus blockiert.
 *
 * Ziel:
 * Dateisystemtests technisch gegen produktive Laufzeitpfade absichern.
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

  it("blockiert normale App-Dateiverzeichnisse im Testmodus", () => {
    enableTestRuntime();

    expect(() => assertSafeTestDirectoryPath(path.join(apiRoot, "uploads"), "UPLOAD_DIR")).toThrow(/application filesystem/);
    expect(() => assertSafeTestDirectoryPath(path.join(apiRoot, "previews"), "PREVIEW_CACHE_DIR")).toThrow(/application filesystem/);
    expect(() => assertSafeTestDirectoryPath(path.join(apiRoot, "content"), "CONTENT_DIR")).toThrow(/application filesystem/);
  });

  it("prüft komplette Runtime-Ziele gemeinsam", () => {
    enableTestRuntime();

    expect(() =>
      assertSafeTestRuntimeTargets({
        uploadDir: path.join(testRuntimeRoot, "e2e", "uploads"),
        previewCacheDir: path.join(testRuntimeRoot, "e2e", "previews"),
        contentDir: path.join(testRuntimeRoot, "e2e", "content"),
      })
    ).not.toThrow();
  });
});
