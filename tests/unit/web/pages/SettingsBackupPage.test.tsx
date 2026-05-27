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
 * - Vollsicherung und Sync werden in einem gemeinsamen Aktionscontainer mit eigenen Statuszeilen gerendert.
 * - Die überflüssigen Aktionen "Neueste importieren" und "Aktualisieren" werden nicht angeboten.
 *
 * Fehlerfälle:
 * - Ohne korrektes Mapping würde die laufende Phase nicht als Fortschrittszeile erscheinen.
 * - Eine vermischte Aktionsleiste würde die entfernten Aktionen wieder sichtbar machen.
 *
 * Ziel:
 * Die UI-Anbindung der Backup-Progress-Events gegen Rendering-Regressionen absichern.
 */

import { screen, within } from "@testing-library/dom";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsBackupPage } from "../../../../apps/web/src/pages/SettingsBackupPage";

const syncProgressEvent = {
  type: "backup_progress" as const,
  operation: "incremental_sync" as const,
  phase: "file_upload",
  current: 1,
  total: 3,
  detail: "uploads/example.txt",
};

const backupPageMocks = vi.hoisted(() => ({
  saveLocalDump: vi.fn(),
  localRefetch: vi.fn(),
  remoteRefetch: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({}),
}));

vi.mock("../../../../apps/web/src/api/dumps", () => ({
  applyRemoteDump: vi.fn(),
  previewRemoteDump: vi.fn(),
  saveLocalDump: backupPageMocks.saveLocalDump,
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
}));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true,
}));

vi.mock("../../../../apps/web/src/hooks/useBackupProgress", () => ({
  clearBackupProgress: vi.fn(),
  useBackupProgress: () => ({
    byOperation: {
      full_backup: null,
      incremental_sync: syncProgressEvent,
      import: null,
    },
    lastEvent: syncProgressEvent,
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
      files: [],
      blockingIssues: [],
    },
    loading: false,
    error: null,
    refetch: backupPageMocks.remoteRefetch,
  }),
  useIncrementalRemoteSync: () => ({
    preview: null,
    previewError: null,
    previewSync: vi.fn(),
    runSync: vi.fn(),
    applySync: vi.fn(),
    syncing: false,
    previewing: false,
    applying: false,
  }),
}));

beforeEach(() => {
  backupPageMocks.saveLocalDump.mockReset();
  backupPageMocks.localRefetch.mockResolvedValue({});
  backupPageMocks.remoteRefetch.mockResolvedValue({});
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
    expect(progressPanel.getByText("Sync")).toBeTruthy();
    expect(progressPanel.getByText(/Datei-Upload/)).toBeTruthy();
    expect(progressPanel.getByText(/uploads\/example\.txt/)).toBeTruthy();
    expect(progressPanel.getByText("1/3")).toBeTruthy();
  });

  it("zeigt Vollsicherung und Sync in einem gemeinsamen Aktionscontainer", () => {
    render(<SettingsBackupPage />);

    expect(screen.getByRole("heading", { name: "Vollsicherung" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Sync" })).toBeTruthy();
    expect(screen.getByText(/Letzte Sicherung:/)).toBeTruthy();
    expect(screen.getByText(/Letzte Synchronisation:/)).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Remote-Vollsicherungen" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sichern" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sync" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Sync importieren" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Neueste importieren" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Aktualisieren" })).toBeNull();
    expect(screen.queryByText("Lokaler Backup-Ordner")).toBeNull();
    expect(screen.queryByText("SFTP-Backup-Ordner")).toBeNull();
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
});
