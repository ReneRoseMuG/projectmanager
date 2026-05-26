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
 *
 * Fehlerfälle:
 * - Ohne korrektes Mapping würde die laufende Phase nicht als Fortschrittszeile erscheinen.
 *
 * Ziel:
 * Die UI-Anbindung der Backup-Progress-Events gegen Rendering-Regressionen absichern.
 */

import { screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsBackupPage } from "../../../../apps/web/src/pages/SettingsBackupPage";

const syncProgressEvent = {
  type: "backup_progress" as const,
  operation: "incremental_sync" as const,
  phase: "file_upload",
  current: 1,
  total: 3,
  detail: "uploads/example.txt"
};

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({})
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: vi.fn() })
}));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true
}));

vi.mock("../../../../apps/web/src/hooks/useBackupProgress", () => ({
  clearBackupProgress: vi.fn(),
  useBackupProgress: () => ({
    byOperation: {
      full_backup: null,
      incremental_sync: syncProgressEvent,
      import: null
    },
    lastEvent: syncProgressEvent,
    updatedAt: 1
  })
}));

vi.mock("../../../../apps/web/src/hooks/useLocalDumpStatus", () => ({
  useLocalDumpStatus: () => ({
    status: {
      backupDirectory: "C:/test/backups",
      ready: true,
      fileCount: 0,
      latestFile: null
    },
    loading: false,
    error: null,
    refetch: vi.fn()
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
      blockingIssues: []
    },
    loading: false,
    error: null,
    refetch: vi.fn()
  }),
  useIncrementalRemoteSync: () => ({
    preview: null,
    previewError: null,
    previewSync: vi.fn(),
    runSync: vi.fn(),
    applySync: vi.fn(),
    syncing: false,
    previewing: false,
    applying: false
  })
}));

afterEach(() => {
  cleanup();
});

describe("SettingsBackupPage", () => {
  it("zeigt laufenden Backup-Fortschritt aus Realtime-Events", () => {
    render(<SettingsBackupPage />);

    const panel = screen.getByRole("heading", { name: "Fortschritt" }).closest("section");
    expect(panel).not.toBeNull();
    const progressPanel = within(panel as HTMLElement);
    expect(progressPanel.getByText("Sync")).toBeInTheDocument();
    expect(progressPanel.getByText(/Datei-Upload/)).toBeInTheDocument();
    expect(progressPanel.getByText(/uploads\/example\.txt/)).toBeInTheDocument();
    expect(progressPanel.getByText("1/3")).toBeInTheDocument();
  });
});
