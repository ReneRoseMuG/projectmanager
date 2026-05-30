// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - React-Rendering mit isolierten Hook-Doubles für Statusdaten und Realtime-Progress.
 *
 * Mock-Entscheidung:
 * - Datenhooks werden gemockt, weil die sichtbare Progress-Darstellung der Seite geprüft wird.
 *
 * Isolation:
 * - jsdom ohne echte API-Requests.
 *
 * Abgedeckte Regeln:
 * - Backup-Fortschritt aus dem Realtime-Store wird auf der Admin-Backup-Seite sichtbar.
 * - Die Seite bietet nur Vollsicherung und Remote-Vollbackup-Import an.
 *
 * Fehlerfälle:
 * - Ohne korrektes Mapping würde die laufende Phase nicht als Fortschrittszeile erscheinen.
 * - Entfernte Sync-Aktionen dürfen nicht wieder sichtbar werden.
 *
 * Ziel:
 * Die UI-Anbindung der Backup-Progress-Events gegen Rendering-Regressionen absichern.
 */

import { screen, within } from "@testing-library/dom";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsBackupPage } from "../../../../apps/web/src/pages/SettingsBackupPage";

const fullBackupProgressEvent = {
  type: "backup_progress" as const,
  operation: "full_backup" as const,
  phase: "archive",
  current: 1,
  total: 3,
  detail: "taskmanager_dump_test.zip",
};

const backupPageMocks = vi.hoisted(() => ({
  applyRemoteDump: vi.fn(),
  confirm: vi.fn(),
  previewRemoteDump: vi.fn(),
  saveLocalDump: vi.fn(),
  localRefetch: vi.fn(),
  remoteRefetch: vi.fn(),
  remoteFiles: [] as Array<{
    id: string;
    name: string;
    path: string;
    createdTime: string;
    modifiedTime: string;
    sizeBytes: number;
    imported: boolean;
    importedAt: string | null;
  }>,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({}),
}));

vi.mock("../../../../apps/web/src/api/dumps", () => ({
  applyRemoteDump: backupPageMocks.applyRemoteDump,
  previewRemoteDump: backupPageMocks.previewRemoteDump,
  saveLocalDump: backupPageMocks.saveLocalDump,
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: backupPageMocks.confirm }),
}));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true,
}));

vi.mock("../../../../apps/web/src/hooks/useBackupProgress", () => ({
  clearBackupProgress: vi.fn(),
  useBackupProgress: () => ({
    byOperation: {
      full_backup: fullBackupProgressEvent,
      import: null,
    },
    lastEvent: fullBackupProgressEvent,
    updatedAt: 1,
  }),
}));

vi.mock("../../../../apps/web/src/hooks/useLocalDumpStatus", () => ({
  useLocalDumpStatus: () => ({
    status: {
      backupDirectory: "C:/test/backups",
      ready: true,
      fileCount: 0,
      latestFile: null,
    },
    loading: false,
    error: null,
    refetch: backupPageMocks.localRefetch,
  }),
  useRemoteDumpStatus: () => ({
    status: {
      remoteDirectory: "/remote/backups",
      configured: true,
      protectedConfirmed: true,
      ready: true,
      fileCount: 0,
      latestFile: null,
      files: backupPageMocks.remoteFiles,
      blockingIssues: [],
    },
    loading: false,
    error: null,
    refetch: backupPageMocks.remoteRefetch,
  }),
}));

beforeEach(() => {
  backupPageMocks.applyRemoteDump.mockReset();
  backupPageMocks.confirm.mockReset();
  backupPageMocks.previewRemoteDump.mockReset();
  backupPageMocks.saveLocalDump.mockReset();
  backupPageMocks.localRefetch.mockResolvedValue({});
  backupPageMocks.remoteRefetch.mockResolvedValue({});
  backupPageMocks.confirm.mockResolvedValue(false);
  backupPageMocks.remoteFiles.length = 0;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SettingsBackupPage", () => {
  it("zeigt laufenden Backup-Fortschritt aus Realtime-Events", () => {
    render(<SettingsBackupPage />);

    const panel = screen
      .getByRole("heading", { name: "Fortschritt" })
      .closest("section");
    expect(panel).not.toBeNull();
    const progressPanel = within(panel as HTMLElement);
    expect(progressPanel.getByText("Vollsicherung")).toBeTruthy();
    expect(progressPanel.getByText(/Archiv/)).toBeTruthy();
    expect(progressPanel.getByText(/taskmanager_dump_test\.zip/)).toBeTruthy();
    expect(progressPanel.getByText("1/3")).toBeTruthy();
  });

  it("zeigt Vollsicherung und Remote-Vollsicherungen ohne Sync-Aktionen", () => {
    render(<SettingsBackupPage />);

    expect(screen.getByRole("heading", { name: "Vollsicherung" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Remote-Vollsicherungen" }),
    ).toBeTruthy();
    expect(screen.getByText(/Letzte Sicherung:/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sichern" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Sync" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sync" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Sync importieren" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Neueste importieren" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Aktualisieren" })).toBeNull();
  });

  it("wartet nach erfolgreicher Vollsicherung nicht auf die Remote-Liste", async () => {
    backupPageMocks.saveLocalDump.mockResolvedValue({
      dumpId: "dump-fast",
      filename: "taskmanager_dump_fast.zip",
      filePath: "C:/test/backups/taskmanager_dump_fast.zip",
      sizeBytes: 1024,
      backupFile: {
        id: "taskmanager_dump_fast.zip",
        name: "taskmanager_dump_fast.zip",
        path: "C:/test/backups/taskmanager_dump_fast.zip",
        createdTime: "2026-05-27T08:00:00.000Z",
        modifiedTime: "2026-05-27T08:00:00.000Z",
        sizeBytes: 1024,
      },
      remoteUpload: null,
    });
    backupPageMocks.remoteRefetch.mockImplementation(
      () => new Promise(() => undefined),
    );

    render(<SettingsBackupPage />);
    const saveButton = screen.getByRole("button", { name: "Sichern" });

    fireEvent.click(saveButton);

    await waitFor(() =>
      expect((saveButton as HTMLButtonElement).disabled).toBe(false),
    );
    expect(screen.getByText(/taskmanager_dump_fast\.zip/)).toBeTruthy();
    expect(backupPageMocks.localRefetch).toHaveBeenCalledTimes(1);
    expect(backupPageMocks.remoteRefetch).toHaveBeenCalledTimes(1);
  });

  it("zeigt die API-Fehlermeldung beim fehlgeschlagenen Remote-Import", async () => {
    const remoteFile = {
      id: "taskmanager_dump_remote.zip",
      name: "taskmanager_dump_remote.zip",
      path: "/remote/backups/taskmanager_dump_remote.zip",
      createdTime: "2026-05-27T08:00:00.000Z",
      modifiedTime: "2026-05-27T08:00:00.000Z",
      sizeBytes: 25 * 1024 * 1024,
      imported: false,
      importedAt: null,
    };
    const apiError = new Error(
      "Request failed with status code 400 Bad Request: POST http://localhost:3001/api/dumps/remote/apply",
    ) as Error & {
      response: {
        json: () => Promise<unknown>;
      };
    };
    apiError.response = {
      json: async () => ({
        error: "BAD_REQUEST",
        message:
          "Dump import is blocked: Schema revision differs: dump=old, target=current.",
        statusCode: 400,
      }),
    };

    backupPageMocks.remoteFiles.push(remoteFile);
    backupPageMocks.confirm.mockResolvedValue(true);
    backupPageMocks.previewRemoteDump.mockResolvedValue({
      dumpId: "taskmanager_dump_remote",
      backupFile: remoteFile,
      targetDatabasePath: "C:/test/data/app.db",
      transferReadiness: "ready",
      blockingIssues: [],
      warnings: [],
      confirmationPhrase: "AKTUALISIERE TASKMANAGER",
      manifestPresent: true,
      schemaRevision: "current",
      expectedTables: [],
      expectedFileRoots: [],
      fileHash: "abc123",
      previewToken: "preview-token-1",
    });
    backupPageMocks.applyRemoteDump.mockRejectedValue(apiError);

    render(<SettingsBackupPage />);

    fireEvent.click(screen.getByRole("button", { name: "Importieren" }));

    await waitFor(() =>
      expect(screen.getByText(/Dump import is blocked/)).toBeTruthy(),
    );
    expect(
      screen.queryByText(/Request failed with status code 400/),
    ).toBeNull();
    expect(backupPageMocks.applyRemoteDump).toHaveBeenCalledWith({
      fileId: remoteFile.id,
      fileHash: "abc123",
      previewToken: "preview-token-1",
      confirmed: true,
    });
  });

  it("zeigt nach erfolgreichem Remote-Import den Abschluss ohne Status-Refetch", async () => {
    const remoteFile = {
      id: "taskmanager_dump_remote.zip",
      name: "taskmanager_dump_remote.zip",
      path: "/remote/backups/taskmanager_dump_remote.zip",
      createdTime: "2026-05-27T08:00:00.000Z",
      modifiedTime: "2026-05-27T08:00:00.000Z",
      sizeBytes: 25 * 1024 * 1024,
      imported: false,
      importedAt: null,
    };

    backupPageMocks.remoteFiles.push(remoteFile);
    backupPageMocks.confirm.mockResolvedValue(true);
    backupPageMocks.previewRemoteDump.mockResolvedValue({
      dumpId: "taskmanager_dump_remote",
      backupFile: remoteFile,
      targetDatabasePath: "C:/test/data/app.db",
      transferReadiness: "ready",
      blockingIssues: [],
      warnings: [],
      confirmationPhrase: "AKTUALISIERE TASKMANAGER",
      manifestPresent: true,
      schemaRevision: "current",
      expectedTables: [],
      expectedFileRoots: [],
      fileHash: "abc123",
      previewToken: "preview-token-2",
    });
    backupPageMocks.applyRemoteDump.mockResolvedValue({
      dumpId: "taskmanager_dump_remote",
      backupFile: remoteFile,
      targetBackupPath: "C:/test/backups/target-before-import.sqlite",
      verificationPassed: true,
      importStatus: "success",
      tablesRestored: 42,
      fileRootsRestored: [],
      warnings: [],
      blockingIssues: [],
    });

    render(<SettingsBackupPage />);

    fireEvent.click(screen.getByRole("button", { name: "Importieren" }));

    await waitFor(() => expect(screen.getByText(/Bitte lade die Anwendung neu/)).toBeTruthy());
    expect(backupPageMocks.applyRemoteDump).toHaveBeenCalledWith({
      fileId: remoteFile.id,
      fileHash: "abc123",
      previewToken: "preview-token-2",
      confirmed: true,
    });
    expect(backupPageMocks.localRefetch).not.toHaveBeenCalled();
    expect(backupPageMocks.remoteRefetch).not.toHaveBeenCalled();
  });
});
