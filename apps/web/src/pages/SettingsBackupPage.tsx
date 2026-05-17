import type { DumpDriveApplyResult, DumpDrivePreviewResult, DumpDriveSaveResult } from "@taskmanager/shared-types";
import { AlertTriangle, CheckCircle2, CloudDownload, CloudUpload, DatabaseBackup, FolderCog, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { applyLatestDriveDump, previewLatestDriveDump, saveDriveDump } from "../api/dumps";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useDriveDumpConfig } from "../hooks/useDriveDumpConfig";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Aktion fehlgeschlagen";
}

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function readinessTone(readiness: DumpDrivePreviewResult["transferReadiness"]) {
  if (readiness === "ready") return "fern";
  if (readiness === "warning") return "mustard";
  return "crimson";
}

function sourceLabel(source: "database" | "environment" | "missing"): string {
  if (source === "database") return "UI";
  if (source === "environment") return ".env";
  return "Nicht gesetzt";
}

export function SettingsBackupPage() {
  const driveConfig = useDriveDumpConfig();
  const driveReady = driveConfig.config?.ready ?? false;
  const [saveResult, setSaveResult] = useState<DumpDriveSaveResult | null>(null);
  const [preview, setPreview] = useState<DumpDrivePreviewResult | null>(null);
  const [applyResult, setApplyResult] = useState<DumpDriveApplyResult | null>(null);
  const [folderInput, setFolderInput] = useState("");
  const [configSaved, setConfigSaved] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (driveConfig.config) {
      setFolderInput(driveConfig.config.folderUrl ?? driveConfig.config.folderId ?? "");
    }
  }, [driveConfig.config]);

  async function handleConfigSave() {
    setError(null);
    setConfigSaved(false);
    try {
      await driveConfig.updateConfig({ folderInput });
      setConfigSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaveResult(null);
    try {
      setSaveResult(await saveDriveDump());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    setError(null);
    setPreview(null);
    setApplyResult(null);
    setConfirmation("");
    try {
      setPreview(await previewLatestDriveDump());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleApply() {
    if (!preview) return;
    setApplying(true);
    setError(null);
    setApplyResult(null);
    try {
      setApplyResult(
        await applyLatestDriveDump({
          fileId: preview.driveFile.id,
          fileHash: preview.fileHash,
          confirmationPhrase: confirmation
        })
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Sicherung</h1>
          <p className="text-sm text-slate-500">Google Drive</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={<CloudUpload size={16} />} loading={saving} disabled={!driveReady} onClick={() => void handleSave()}>
            Sichern
          </Button>
          <Button icon={<RefreshCw size={16} />} loading={previewing} disabled={!driveReady} onClick={() => void handlePreview()}>
            Aktualisieren
          </Button>
        </div>
      </header>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderCog size={18} />
            <h2 className="text-base font-semibold">Google-Drive-Zielordner</h2>
          </div>
          {driveConfig.config && (
            <Badge tone={driveConfig.config.ready ? "fern" : "crimson"}>{driveConfig.config.ready ? "bereit" : "unvollständig"}</Badge>
          )}
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={folderInput}
              onChange={(event) => {
                setConfigSaved(false);
                setFolderInput(event.target.value);
              }}
              className="min-w-80 flex-1"
              placeholder="https://drive.google.com/drive/folders/... oder Folder-ID"
            />
            <Button icon={<FolderCog size={16} />} loading={driveConfig.updating} onClick={() => void handleConfigSave()}>
              Speichern
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span>Quelle: {driveConfig.config ? sourceLabel(driveConfig.config.source) : "lädt"}</span>
            {driveConfig.config?.folderId && <span className="select-all">ID: {driveConfig.config.folderId}</span>}
            <span>OAuth: {driveConfig.config?.oauthConfigured ? "konfiguriert" : "fehlt in .env"}</span>
          </div>

          {driveConfig.error && <p className="rounded-md border border-crimson/20 bg-crimson/10 p-2 text-sm text-crimson">{driveConfig.error}</p>}
          {configSaved && (
            <p className="flex items-center gap-2 rounded-md border border-fern/20 bg-fern/10 p-2 text-sm text-fern">
              <CheckCircle2 size={16} />
              Zielordner gespeichert.
            </p>
          )}
        </div>
      </section>

      {error && (
        <section className="rounded-md border border-crimson/20 bg-crimson/10 p-3 text-sm text-crimson">
          {error}
        </section>
      )}

      {saveResult && (
        <section className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <DatabaseBackup size={18} />
            <h2 className="text-base font-semibold">Letzte Sicherung</h2>
          </div>
          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
            <span>{saveResult.driveFile.name}</span>
            <span>{megabytes(saveResult.sizeBytes)}</span>
            <span>{saveResult.dumpId}</span>
          </div>
        </section>
      )}

      {preview && (
        <section className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CloudDownload size={18} />
              <h2 className="text-base font-semibold">Aktualisierung</h2>
            </div>
            <Badge tone={readinessTone(preview.transferReadiness)}>{preview.transferReadiness}</Badge>
          </div>

          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
            <span>{preview.driveFile.name}</span>
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

          <div className="mt-4 grid gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-crimson">
              <AlertTriangle size={16} />
              Destruktiver Import
            </div>
            <p className="select-all rounded-md border border-line bg-shell p-2 text-xs text-slate-600">{preview.confirmationPhrase}</p>
            <div className="flex flex-wrap gap-2">
              <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="min-w-80 flex-1" />
              <Button
                variant="danger"
                icon={<CloudDownload size={16} />}
                loading={applying}
                disabled={preview.transferReadiness === "blocked" || confirmation !== preview.confirmationPhrase}
                onClick={() => void handleApply()}
              >
                Importieren
              </Button>
            </div>
          </div>
        </section>
      )}

      {applyResult && (
        <section className="rounded-md border border-fern/20 bg-fern/10 p-4 text-sm text-fern">
          Import {applyResult.importStatus}. Tabellen: {applyResult.tablesRestored}. Verifikation: {applyResult.verificationPassed ? "bestanden" : "fehlgeschlagen"}.
        </section>
      )}
    </div>
  );
}
