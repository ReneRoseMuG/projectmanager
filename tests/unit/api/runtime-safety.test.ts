import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  apiRoot,
  assertSafeTestDatabaseTarget,
  assertSafeTestDirectoryPath,
  assertSafeTestRuntimeTargets,
  isAllowedTestDatabaseHost,
  isAllowedTestDatabaseName,
  isTestRuntime,
  testRuntimeRoot
} from "../../../apps/api/src/runtime-safety.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Test-Runtimes dürfen keine App-Dateiverzeichnisse verwenden.
 * - Temp-Verzeichnisse und tests/.runtime sind als isolierte Testziele erlaubt.
 * - Im Testmodus sind nur taskmanager_test- und taskmanager_e2e-Datenbanken auf erlaubten Hosts zulässig.
 *
 * Fehlerfälle:
 * - uploads/, previews/, content/ werden im Testmodus blockiert.
 * - Produktive DB-Namen (taskmanager) und fremde Hosts werden im Testmodus blockiert.
 *
 * Ziel:
 * Datei- und Datenbankzugriffe technisch gegen produktive Laufzeitziele absichern.
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

describe("test database guard", () => {
  it("erlaubt nur taskmanager_test*/taskmanager_e2e*-Namen", () => {
    expect(isAllowedTestDatabaseName("taskmanager_test_123_abc")).toBe(true);
    expect(isAllowedTestDatabaseName("taskmanager_test_appint_abc")).toBe(true);
    expect(isAllowedTestDatabaseName("taskmanager_e2e")).toBe(true);
    expect(isAllowedTestDatabaseName("taskmanager_e2e_w0")).toBe(true);

    expect(isAllowedTestDatabaseName("taskmanager")).toBe(false);
    expect(isAllowedTestDatabaseName("taskmanager_prod")).toBe(false);
    expect(isAllowedTestDatabaseName("production_db")).toBe(false);
  });

  it("erlaubt nur Hosts aus der Test-Allowlist", () => {
    const env = { TEST_DB_HOST: "127.0.0.1" } as NodeJS.ProcessEnv;
    expect(isAllowedTestDatabaseHost("127.0.0.1", env)).toBe(true);
    expect(isAllowedTestDatabaseHost("localhost", env)).toBe(true);
    expect(isAllowedTestDatabaseHost("::1", env)).toBe(true);
    expect(isAllowedTestDatabaseHost("db.production.example.com", env)).toBe(false);
  });

  it("blockiert produktive DB-Namen im Testmodus", () => {
    const env = { NODE_ENV: "test", TEST_DB_HOST: "127.0.0.1" } as NodeJS.ProcessEnv;
    expect(() => assertSafeTestDatabaseTarget("127.0.0.1", "taskmanager", env)).toThrow(
      /Refusing to use database "taskmanager"/
    );
  });

  it("blockiert fremde Hosts im Testmodus", () => {
    const env = { NODE_ENV: "test", TEST_DB_HOST: "127.0.0.1" } as NodeJS.ProcessEnv;
    expect(() =>
      assertSafeTestDatabaseTarget("db.production.example.com", "taskmanager_e2e_w1", env)
    ).toThrow(/host is not in the test allowlist/);
  });

  it("lässt gültige Testziele im Testmodus zu", () => {
    const env = { NODE_ENV: "test", TEST_DB_HOST: "127.0.0.1" } as NodeJS.ProcessEnv;
    expect(() =>
      assertSafeTestDatabaseTarget("127.0.0.1", "taskmanager_e2e_w0", env)
    ).not.toThrow();
  });

  it("ist außerhalb des Testmodus ein No-op", () => {
    const env = { NODE_ENV: "production" } as NodeJS.ProcessEnv;
    expect(() => assertSafeTestDatabaseTarget("db.production.example.com", "taskmanager", env)).not.toThrow();
  });
});
