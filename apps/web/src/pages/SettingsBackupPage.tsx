import type {
  BackupProgressEvent,
  DumpBackupApplyResult,
  DumpBackupPreviewResult,
  DumpBackupSaveResult,
  DumpRemoteBackupFile,
} from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CloudDownload,
  DatabaseBackup,
  HardDrive,
} from "lucide-react";
import { useState } from "react";
import {
  applyRemoteDump,
  previewRemoteDump,
  saveLocalDump,
} from "../api/dumps";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHero } from "../components/ui/PageHero";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import {
  clearBackupProgress,
  useBackupProgress,
} from "../hooks/useBackupProgress";
import { errorMessageAsync } from "../hooks/errors";
import {
  useLocalDumpStatus,
  useRemoteDumpStatus,
} from "../hooks/useLocalDumpStatus";
import { useHasPermission } from "../hooks/usePermissions";
import { invalidateWikiImportData } from "../queries/invalidation";

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function readinessTone(
  readiness: DumpBackupPreviewResult["transferReadiness"],
) {
  if (readiness === "ready") return "fern";
  if (readiness === "warning") return "mustard";
  return "crimson";
}

const operationLabels: Record<BackupProgressEvent["operation"], string> = {
  full_backup: "Vollsicherung",
  import: "Import",
};

const phaseLabels: Record<string, string> = {
  db_export: "Datenbankexport",
  archive: "Archiv",
  local_save: "Lokal gespeichert",
  sftp_upload: "SFTP-Upload",
  staging: "Staging",
  db_restore: "DB-Wiederherstellung",
  file_swap: "Dateitausch",
  verify: "Verifikation",
  done: "Abgeschlossen",
};

function progressValue(event: BackupProgressEvent): number {
  if (event.phase === "done") {
    return 100;
  }
  if (event.total <= 0) {
    return 0;
  }
  return Math.round((event.current / event.total) * 100);
}

function progressLabel(event: BackupProgressEvent): string {
  if (event.total <= 0) {
    return event.phase === "done" ? "abgeschlossen" : "läuft";
  }
  return `${event.current}/${event.total}`;
}

function BackupProgressPanel({ events }: { events: BackupProgressEvent[] }) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="mb-3 flex items-center gap-2">
        <Activity size={18} />
        <h2 className="text-base font-semibold">Fortschritt</h2>
      </div>
      <div className="grid gap-3">
        {events.map((event) => (
          <div
            key={event.operation}
            className="grid gap-2 rounded-lg border border-line bg-steel-50 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {operationLabels[event.operation]}
                </p>
                <p className="truncate text-xs text-steel-500">
                  {phaseLabels[event.phase] ?? event.phase}
                  {event.detail ? ` · ${event.detail}` : ""}
                </p>
              </div>
              <Badge tone={event.phase === "done" ? "fern" : "teal"}>
                {progressLabel(event)}
              </Badge>
            </div>
            <ProgressBar value={progressValue(event)} size="sm" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function SettingsBackupPage() {
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const canWriteDumps = useHasPermission("dumps", "write");
  const backupStatus = useLocalDumpStatus();
  const remoteStatus = useRemoteDumpStatus();
  const backupProgress = useBackupProgress();
  const [saveResult, setSaveResult] = useState<DumpBackupSaveResult | null>(
    null,
  );
  const [preview, setPreview] = useState<DumpBackupPreviewResult | null>(null);
  const [applyResult, setApplyResult] = useState<DumpBackupApplyResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importingFileId, setImportingFileId] = useState<string | null>(null);

  async function refreshStatus() {
    await backupStatus.refetch();
    await remoteStatus.refetch();
  }

  function refreshRemoteStatusInBackground() {
    void remoteStatus.refetch().catch(() => undefined);
  }

  async function handleSave() {
    clearBackupProgress("full_backup");
    setSaving(true);
    setError(null);
    setSaveResult(null);
    try {
      const result = await saveLocalDump();
      setSaveResult(result);
      await backupStatus.refetch();
      refreshRemoteStatusInBackground();
    } catch (err) {
      setError(await errorMessageAsync(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoteImport(fileId: string) {
    clearBackupProgress("import");
    setImportingFileId(fileId);
    setError(null);
    setPreview(null);
    setApplyResult(null);
    try {
      const nextPreview = await previewRemoteDump({ fileId });
      setPreview(nextPreview);
      if (nextPreview.transferReadiness === "blocked") {
        return;
      }

      const approved = await confirm({
        title: "Backup importieren?",
        body: (
          <span>
            {nextPreview.backupFile.name} überschreibt die lokalen Daten. Vor
            dem Import wird automatisch ein SQLite-Snapshot angelegt.
          </span>
        ),
        severity: "danger",
        confirmLabel: "Ja",
        cancelLabel: "Nein",
      });
      if (!approved) {
        return;
      }

      setApplyResult(
        await applyRemoteDump({
          fileId: nextPreview.backupFile.id,
          fileHash: nextPreview.fileHash,
          confirmed: true,
        }),
      );
      await invalidateWikiImportData(queryClient);
      await refreshStatus();
    } catch (err) {
      setError(await errorMessageAsync(err));
    } finally {
      setImportingFileId(null);
    }
  }

  const remoteFiles = remoteStatus.status?.files ?? [];
  const progressEvents = Object.values(backupProgress.byOperation).filter(
    (event): event is BackupProgressEvent => event !== null,
  );
  const latestBackupName =
    saveResult?.backupFile.name ??
    backupStatus.status?.latestFile?.name ??
    null;
  const latestBackupDetail = saveResult
    ? `${saveResult.backupFile.name} · ${megabytes(saveResult.sizeBytes)}`
    : (latestBackupName ?? "Noch keine Sicherung");

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="detail"
        title="Sicherung"
        icon={<DatabaseBackup size={22} />}
      />

      <div className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-auto bg-white p-5">
        <BackupProgressPanel events={progressEvents} />

        {error && (
          <section className="rounded-md border border-crimson/20 bg-crimson/10 p-3 text-sm text-crimson">
            {error}
          </section>
        )}

        <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid min-w-0 gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <DatabaseBackup size={18} />
                <h2 className="text-base font-semibold text-ink">
                  Vollsicherung
                </h2>
                {backupStatus.status && (
                  <Badge tone={backupStatus.status.ready ? "fern" : "crimson"}>
                    {backupStatus.status.ready ? "bereit" : "nicht bereit"}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-steel-600">
                <span className="font-medium text-ink">Letzte Sicherung:</span>{" "}
                <span className="break-all">{latestBackupDetail}</span>
              </p>
              {saveResult?.remoteUpload ? (
                <p
                  className={`text-sm ${saveResult.remoteUpload.success ? "text-fern" : "text-mustard-dark"}`}
                >
                  {saveResult.remoteUpload.success
                    ? `SFTP-Kopie erstellt: ${saveResult.remoteUpload.remoteFile?.name ?? saveResult.backupFile.name}`
                    : `SFTP-Kopie nicht erstellt: ${saveResult.remoteUpload.error ?? "unbekannter Fehler"}`}
                </p>
              ) : null}
              {backupStatus.error && (
                <p className="rounded-md border border-crimson/20 bg-crimson/10 p-2 text-sm text-crimson">
                  {backupStatus.error}
                </p>
              )}
            </div>
            <Button
              variant="primary"
              icon={<DatabaseBackup size={16} />}
              loading={saving}
              disabled={!canWriteDumps}
              onClick={() => void handleSave()}
            >
              Sichern
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HardDrive size={18} />
              <h2 className="text-base font-semibold text-ink">
                Remote-Vollsicherungen
              </h2>
            </div>
            {remoteStatus.status && (
              <Badge tone="steel">{remoteStatus.status.fileCount}</Badge>
            )}
          </div>

          {remoteStatus.error && (
            <p className="mb-3 rounded-md border border-crimson/20 bg-crimson/10 p-2 text-sm text-crimson">
              {remoteStatus.error}
            </p>
          )}
          {remoteStatus.status?.blockingIssues.map((issue) => (
            <p
              key={issue}
              className="mb-3 rounded-md border border-crimson/20 bg-crimson/10 p-2 text-sm text-crimson"
            >
              {issue}
            </p>
          ))}

          {remoteFiles.length === 0 ? (
            <EmptyState
              icon={<HardDrive size={22} />}
              title="Keine Backup-Dateien"
              body="Keine Backup-Dateien gefunden."
              variant="tinted"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-steel-50 text-xs font-semibold uppercase text-steel-500">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Datei</th>
                    <th className="py-2 pr-3 font-semibold">Größe</th>
                    <th className="py-2 pr-3 font-semibold">Geändert</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2 text-right font-semibold">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {remoteFiles.map((file: DumpRemoteBackupFile) => (
                    <tr
                      key={file.id}
                      className="border-b border-line text-sm last:border-0"
                    >
                      <td className="py-2 pr-3 font-medium text-ink">
                        {file.name}
                      </td>
                      <td className="py-2 pr-3 text-steel-600">
                        {megabytes(file.sizeBytes)}
                      </td>
                      <td className="py-2 pr-3 text-steel-600">
                        {formatDateTime(file.modifiedTime)}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge tone={file.imported ? "mustard" : "fern"}>
                          {file.imported ? "importiert" : "bereit"}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          icon={<CloudDownload size={15} />}
                          loading={importingFileId === file.id}
                          disabled={!canWriteDumps || file.imported}
                          onClick={() => void handleRemoteImport(file.id)}
                        >
                          Importieren
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {preview && (
          <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} />
                <h2 className="text-base font-semibold text-ink">
                  Letzte Import-Prüfung
                </h2>
              </div>
              <Badge tone={readinessTone(preview.transferReadiness)}>
                {preview.transferReadiness}
              </Badge>
            </div>

            <div className="grid gap-2 text-sm text-steel-600 md:grid-cols-3">
              <span>{preview.backupFile.name}</span>
              <span>{preview.expectedTables.length} Tabellen</span>
              <span>
                {preview.expectedFileRoots.reduce(
                  (sum, item) => sum + item.fileCount,
                  0,
                )}{" "}
                Dateien
              </span>
            </div>

            {(preview.warnings.length > 0 ||
              preview.blockingIssues.length > 0) && (
              <div className="mt-4 grid gap-2">
                {preview.warnings.map((warning) => (
                  <p
                    key={warning}
                    className="rounded-md border border-mustard/25 bg-mustard/10 p-2 text-sm text-mustard-dark"
                  >
                    {warning}
                  </p>
                ))}
                {preview.blockingIssues.map((issue) => (
                  <p
                    key={issue}
                    className="rounded-md border border-crimson/20 bg-crimson/10 p-2 text-sm text-crimson"
                  >
                    {issue}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}

        {applyResult && (
          <section className="rounded-md border border-fern/20 bg-fern/10 p-4 text-sm text-fern">
            Import {applyResult.importStatus}. Tabellen:{" "}
            {applyResult.tablesRestored}. Verifikation:{" "}
            {applyResult.verificationPassed ? "bestanden" : "fehlgeschlagen"}.
          </section>
        )}
      </div>
    </div>
  );
}
