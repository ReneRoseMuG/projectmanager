import type { SeedRun, SeedRunDeletePreview, SeedRunDeleteResult, SeedRunTableCount } from "@taskmanager/shared-types";
import { DatabaseZap, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { Input } from "../components/ui/Input";
import { useSeedRuns } from "../hooks/useSeedRuns";

function formatDateTime(value: string): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).slice(2)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function totalFor(tableCounts: SeedRunTableCount[], tableName: string): number {
  return tableCounts.find((item) => item.tableName === tableName)?.count ?? 0;
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function RunMetrics({ run }: { run: SeedRun }) {
  const projects = totalFor(run.summary.tableCounts, "projects");
  const tasks = totalFor(run.summary.tableCounts, "tasks");
  const files = totalFor(run.summary.tableCounts, "content_files") + totalFor(run.summary.tableCounts, "upload_files");

  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone="steel">{countLabel(projects, "Projekt", "Projekte")}</Badge>
      <Badge tone="teal">{countLabel(tasks, "Aufgabe", "Aufgaben")}</Badge>
      <Badge tone="violet">{countLabel(files, "Datei", "Dateien")}</Badge>
      <Badge tone="mute">{countLabel(run.summary.totalRecords, "Eintrag", "Einträge")}</Badge>
    </div>
  );
}

function PreviewIssues({ preview }: { preview: SeedRunDeletePreview | null }) {
  if (!preview || preview.blockingIssues.length === 0) {
    return null;
  }

  return (
    <section className="rounded-md border border-crimson/20 bg-crimson/10 p-4 text-sm text-crimson">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <ShieldAlert size={16} />
        Löschung blockiert
      </div>
      <div className="grid gap-1">
        {preview.blockingIssues.map((issue) => (
          <p key={issue}>{issue}</p>
        ))}
      </div>
    </section>
  );
}

function DeleteResult({ result }: { result: SeedRunDeleteResult | null }) {
  if (!result) {
    return null;
  }

  return (
    <section className="rounded-md border border-fern/20 bg-fern/10 p-4 text-sm text-fern">
      Seed-Run {result.seedRunId} gelöscht. Dateien: {result.deletedFiles}. Zeitpunkt: {formatDateTime(result.deletedAt)}.
    </section>
  );
}

export function SettingsSeedDataPage() {
  const { confirm } = useConfirm();
  const { seedRuns, loading, creating, deletingId, error, reload, createSeedRun, previewDelete, deleteSeedRun } = useSeedRuns();
  const [label, setLabel] = useState("");
  const [preview, setPreview] = useState<SeedRunDeletePreview | null>(null);
  const [deleteResult, setDeleteResult] = useState<SeedRunDeleteResult | null>(null);
  const [createdRun, setCreatedRun] = useState<SeedRun | null>(null);

  async function handleCreate() {
    setPreview(null);
    setDeleteResult(null);
    const created = await createSeedRun(label);
    if (created) {
      setCreatedRun(created);
      setLabel("");
    }
  }

  async function handleDelete(run: SeedRun) {
    setCreatedRun(null);
    setDeleteResult(null);
    const nextPreview = await previewDelete(run.id);
    setPreview(nextPreview);
    if (!nextPreview?.canDelete) {
      return;
    }

    const approved = await confirm({
      title: "Seed-Run löschen",
      body: `${run.label} (${run.id})`,
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }

    setDeleteResult(await deleteSeedRun(run.id));
    setPreview(null);
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Testdaten</h1>
          <p className="text-sm text-slate-500">Admin</p>
        </div>
        <Button icon={<RefreshCw size={16} />} loading={loading} onClick={() => void reload()}>
          Aktualisieren
        </Button>
      </header>

      {error && <section className="rounded-md border border-crimson/20 bg-crimson/10 p-3 text-sm text-crimson">{error}</section>}
      {createdRun && (
        <section className="rounded-md border border-fern/20 bg-fern/10 p-4 text-sm text-fern">
          Seed-Run {createdRun.id} erzeugt.
        </section>
      )}
      <DeleteResult result={deleteResult} />
      <PreviewIssues preview={preview} />

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <DatabaseZap size={18} />
          <h2 className="text-base font-semibold">Neuer Seed-Run</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Bezeichnung" className="min-w-0 flex-1" />
          <Button variant="primary" icon={<DatabaseZap size={16} />} loading={creating} onClick={() => void handleCreate()}>
            Erzeugen
          </Button>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <h2 className="text-base font-semibold">Seed-Runs</h2>
          <Badge tone="mute">{seedRuns.length}</Badge>
        </div>

        {seedRuns.length === 0 && !loading ? (
          <div className="p-4 text-sm text-slate-500">Keine Seed-Runs vorhanden.</div>
        ) : (
          <div className="divide-y divide-line">
            {seedRuns.map((run) => (
              <article key={run.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">{run.label}</h3>
                    <Badge tone="mustard">Testdaten</Badge>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-slate-500">{run.id}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(run.createdAt)}</p>
                  <div className="mt-3">
                    <RunMetrics run={run} />
                  </div>
                </div>
                <Button variant="danger" icon={<Trash2 size={16} />} loading={deletingId === run.id} onClick={() => void handleDelete(run)}>
                  Löschen
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
