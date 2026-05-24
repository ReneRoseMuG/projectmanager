import type { DumpBackupApplyResult, DumpBackupPreviewResult, DumpBackupSaveResult, DumpRemoteBackupFile } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CloudDownload, DatabaseBackup, FolderOpen, HardDrive, RefreshCw, Server } from "lucide-react";
import { useState } from "react";
import { applyRemoteDump, previewRemoteDump, saveLocalDump } from "../api/dumps";
import { AdminNavigation } from "../components/layout/AdminLayout";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHero } from "../components/ui/PageHero";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { useLocalDumpStatus, useRemoteDumpStatus } from "../hooks/useLocalDumpStatus";
import { useHasPermission } from "../hooks/usePermissions";
import { invalidateWikiImportData } from "../queries/invalidation";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Aktion fehlgeschlagen";
}

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function readinessTone(readiness: DumpBackupPreviewResult["transferReadiness"]) {
  if (readiness === "ready") return "fern";
  if (readiness === "warning") return "mustard";
  return "crimson";
}

export function SettingsBackupPage() {
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const canWriteDumps = useHasPermission("dumps", "write");
  const backupStatus = useLocalDumpStatus();
  const remoteStatus = useRemoteDumpStatus();
  const [saveResult, setSaveResult] = useState<DumpBackupSaveResult | null>(null);
  const [preview, setPreview] = useState<DumpBackupPreviewResult | null>(null);
  const [applyResult, setApplyResult] = useState<DumpBackupApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [importingFileId, setImportingFileId] = useState<string | null>(null);

  async function refreshStatus() {
    await backupStatus.refetch();
    await remoteStatus.refetch();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaveResult(null);
    try {
      setSaveResult(await saveLocalDump());
      await refreshStatus();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      await refreshStatus();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRemoteImport(fileId?: string) {
    const importKey = fileId ?? "__latest__";
    setImportingFileId(importKey);
    setError(null);
    setPreview(null);
    setApplyResult(null);
    try {
      const nextPreview = await previewRemoteDump(fileId ? { fileId } : {});
      setPreview(nextPreview);
      if (nextPreview.transferReadiness === "blocked") {
        return;
      }

      const approved = await confirm({
        title: "Backup importieren?",
        body: (
          <span>
            {nextPreview.backupFile.name} überschreibt die lokalen Daten. Vor dem Import wird automatisch eine lokale Sicherung angelegt.
          </span>
        ),
        severity: "danger",
        confirmLabel: "Ja",
        cancelLabel: "Nein"
      });
      if (!approved) {
        return;
      }

      setApplyResult(
        await applyRemoteDump({
          fileId: nextPreview.backupFile.id,
          fileHash: nextPreview.fileHash,
          confirmed: true
        })
      );
      await invalidateWikiImportData(queryClient);
      await refreshStatus();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImportingFileId(null);
    }
  }

  const remoteFiles = remoteStatus.status?.files ?? [];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="list"
        title="Sicherung"
        subtitle="Lokale Dumps mit SFTP-Kopie"
        actions={
          <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={<DatabaseBackup size={16} />} loading={saving} disabled={!canWriteDumps} onClick={() => void handleSave()}>
            Sichern
          </Button>
          <Button icon={<CloudDownload size={16} />} loading={importingFileId === "__latest__"} disabled={!canWriteDumps || !remoteStatus.status?.latestFile} onClick={() => void handleRemoteImport()}>
            Neueste importieren
          </Button>
          <Button icon={<RefreshCw size={16} />} loading={refreshing} onClick={() => void handleRefresh()}>
            Aktualisieren
          </Button>
          </div>
        }
      />

      <AdminNavigation />

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-5 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderOpen size={18} />
              <h2 className="text-base font-semibold">Lokaler Backup-Ordner</h2>
            </div>
            {backupStatus.status && <Badge tone={backupStatus.status.ready ? "fern" : "crimson"}>{backupStatus.status.ready ? "bereit" : "nicht bereit"}</Badge>}
          </div>

          <div className="grid gap-2 text-sm text-steel-600">
            <span className="select-all">{backupStatus.status?.backupDirectory ?? "lädt"}</span>
            <div className="flex flex-wrap gap-2 text-xs text-steel-500">
              <span>Dateien: {backupStatus.status?.fileCount ?? 0}</span>
              {backupStatus.status?.latestFile && <span>Neueste: {backupStatus.status.latestFile.name}</span>}
            </div>
            {backupStatus.error && <p className="rounded-md border border-crimson/20 bg-crimson/10 p-2 text-sm text-crimson">{backupStatus.error}</p>}
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Server size={18} />
              <h2 className="text-base font-semibold">SFTP-Backup-Ordner</h2>
            </div>
            {remoteStatus.status && <Badge tone={remoteStatus.status.ready ? "fern" : "crimson"}>{remoteStatus.status.ready ? "bereit" : "nicht bereit"}</Badge>}
          </div>

          <div className="grid gap-2 text-sm text-steel-600">
            <span className="select-all">{remoteStatus.status?.remoteDirectory ?? "lädt"}</span>
            <div className="flex flex-wrap gap-2 text-xs text-steel-500">
              <span>Dateien: {remoteStatus.status?.fileCount ?? 0}</span>
              {remoteStatus.status?.latestFile && <span>Neueste: {remoteStatus.status.latestFile.name}</span>}
            </div>
            {remoteStatus.error && <p className="rounded-md border border-crimson/20 bg-crimson/10 p-2 text-sm text-crimson">{remoteStatus.error}</p>}
            {remoteStatus.status?.blockingIssues.map((issue) => (
              <p key={issue} className="rounded-md border border-crimson/20 bg-crimson/10 p-2 text-sm text-crimson">
                {issue}
              </p>
            ))}
          </div>
        </section>
      </div>

      {error && <section className="rounded-md border border-crimson/20 bg-crimson/10 p-3 text-sm text-crimson">{error}</section>}

      {saveResult && (
        <section className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <DatabaseBackup size={18} />
            <h2 className="text-base font-semibold">Letzte Sicherung</h2>
          </div>
          <div className="grid gap-2 text-sm text-steel-600 md:grid-cols-3">
            <span>{saveResult.backupFile.name}</span>
            <span>{megabytes(saveResult.sizeBytes)}</span>
            <span>{saveResult.dumpId}</span>
          </div>
          {saveResult.remoteUpload ? (
            <p className={`mt-3 rounded-md border p-2 text-sm ${saveResult.remoteUpload.success ? "border-fern/20 bg-fern/10 text-fern" : "border-mustard/25 bg-mustard/10 text-mustard-dark"}`}>
              {saveResult.remoteUpload.success ? `SFTP-Upload abgeschlossen: ${saveResult.remoteUpload.remoteFile?.name ?? saveResult.backupFile.name}` : `SFTP-Upload nicht abgeschlossen: ${saveResult.remoteUpload.error ?? "unbekannter Fehler"}`}
            </p>
          ) : null}
        </section>
      )}

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <HardDrive size={18} />
          <h2 className="text-base font-semibold">Remote-Dateien</h2>
        </div>

        {remoteFiles.length === 0 ? (
          <EmptyState icon={<HardDrive size={22} />} title="Keine Backup-Dateien" body="Keine Backup-Dateien gefunden." variant="tinted" />
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
                  <tr key={file.id} className="border-b border-line text-sm last:border-0">
                    <td className="py-2 pr-3 font-medium text-ink">{file.name}</td>
                    <td className="py-2 pr-3 text-steel-600">{megabytes(file.sizeBytes)}</td>
                    <td className="py-2 pr-3 text-steel-600">{formatDateTime(file.modifiedTime)}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={file.imported ? "mustard" : "fern"}>{file.imported ? "importiert" : "bereit"}</Badge>
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
        <section className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} />
              <h2 className="text-base font-semibold">Letzte Import-Prüfung</h2>
            </div>
            <Badge tone={readinessTone(preview.transferReadiness)}>{preview.transferReadiness}</Badge>
          </div>

          <div className="grid gap-2 text-sm text-steel-600 md:grid-cols-3">
            <span>{preview.backupFile.name}</span>
            <span>{preview.expectedTables.length} Tabellen</span>
            <span>{preview.expectedFileRoots.reduce((sum, item) => sum + item.fileCount, 0)} Dateien</span>
          </div>

          {(preview.warnings.length > 0 || preview.blockingIssues.length > 0) && (
            <div className="mt-4 grid gap-2">
              {preview.warnings.map((warning) => (
                <p key={warning} className="rounded-md border border-mustard/25 bg-mustard/10 p-2 text-sm text-mustard-dark">
                  {warning}
                </p>
              ))}
              {preview.blockingIssues.map((issue) => (
                <p key={issue} className="rounded-md border border-crimson/20 bg-crimson/10 p-2 text-sm text-crimson">
                  {issue}
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      {applyResult && (
        <section className="rounded-md border border-fern/20 bg-fern/10 p-4 text-sm text-fern">
          Import {applyResult.importStatus}. Tabellen: {applyResult.tablesRestored}. Verifikation: {applyResult.verificationPassed ? "bestanden" : "fehlgeschlagen"}.
        </section>
      )}
      </div>
    </div>
  );
}
