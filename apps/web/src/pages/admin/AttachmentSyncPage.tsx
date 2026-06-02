import type { AttachmentSyncStats, AttachmentSyncStatus } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, Loader2, RefreshCw, ServerCrash, WifiOff } from "lucide-react";
import { getAttachmentSyncStatus, runAttachmentSync } from "../../api/attachment-sync";
import { PageHero } from "../../components/ui/PageHero";
import { Section } from "../../components/ui/Section";
import { queryKeys } from "../../queries/queryKeys";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function SyncStatusBanner({ status }: { status: AttachmentSyncStatus }) {
  const { inProgress, lastSync } = status;

  if (inProgress) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <Loader2 size={18} className="animate-spin text-blue-600" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Sync läuft…</p>
          <p className="text-xs text-blue-600">Dateien werden abgeglichen. Die Seite aktualisiert sich automatisch.</p>
        </div>
      </div>
    );
  }

  if (!lastSync) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-muted bg-muted/30 px-4 py-3">
        <RefreshCw size={18} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Noch kein Sync seit dem letzten App-Start.</p>
      </div>
    );
  }

  const hasErrors = lastSync.errors.length > 0;

  if (hasErrors) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertCircle size={18} className="text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Sync abgeschlossen mit Fehlern · {formatDate(lastSync.syncedAt)}
          </p>
          <p className="text-xs text-amber-600">
            {lastSync.pulled} geladen · {lastSync.pushed} gepusht · {lastSync.deleted} gelöscht · {lastSync.errors.length} Fehler · {formatDuration(lastSync.durationMs)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
      <CheckCircle size={18} className="text-green-600" />
      <div>
        <p className="text-sm font-semibold text-green-800">
          Sync abgeschlossen · {formatDate(lastSync.syncedAt)}
        </p>
        <p className="text-xs text-green-600">
          {lastSync.pulled} geladen · {lastSync.pushed} gepusht · {lastSync.deleted} gelöscht · {formatDuration(lastSync.durationMs)}
        </p>
      </div>
    </div>
  );
}

function SyncStatsPanel({ stats }: { stats: AttachmentSyncStats }) {
  const hasErrors = stats.errors.length > 0;
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-3 gap-4 text-sm">
        <div className="rounded-md border bg-muted/30 p-3 text-center">
          <dt className="text-xs text-muted-foreground">Geladen</dt>
          <dd className="mt-1 text-xl font-bold text-green-700">{stats.pulled}</dd>
        </div>
        <div className="rounded-md border bg-muted/30 p-3 text-center">
          <dt className="text-xs text-muted-foreground">Gepusht</dt>
          <dd className="mt-1 text-xl font-bold text-blue-700">{stats.pushed}</dd>
        </div>
        <div className="rounded-md border bg-muted/30 p-3 text-center">
          <dt className="text-xs text-muted-foreground">Gelöscht</dt>
          <dd className="mt-1 text-xl font-bold text-red-700">{stats.deleted}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Dauer: {formatDuration(stats.durationMs)}
      </p>
      {hasErrors && (
        <div className="rounded border border-red-200 bg-red-50 p-3">
          <p className="mb-1 text-xs font-semibold text-red-700">Fehlerdetails</p>
          <ul className="space-y-1">
            {stats.errors.map((err: string, i: number) => (
              <li key={i} className="font-mono text-xs text-red-600">{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReadinessPanel({ status }: { status: AttachmentSyncStatus }) {
  const { readiness } = status;

  if (readiness.ready) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700">
        <CheckCircle size={16} />
        <span>Verbunden · Remote: <code className="rounded bg-muted px-1 py-0.5 text-xs">{readiness.remoteDir}</code></span>
      </div>
    );
  }

  if (!readiness.configured) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <WifiOff size={16} />
          <span>Sync nicht konfiguriert</span>
        </div>
        <div className="rounded border bg-muted/50 p-3 font-mono text-xs space-y-1">
          <p className="font-semibold text-foreground">Erforderliche Umgebungsvariablen:</p>
          <p>SFTP_HOST=mein-webspace.de</p>
          <p>SFTP_PORT=22</p>
          <p>SFTP_USER=mein-user</p>
          <p>SFTP_PASSWORD=…</p>
          <p>ATTACHMENT_SYNC_ENABLED=true</p>
          <p>ATTACHMENT_SYNC_REMOTE_DIR=/pfad/zum/sync/ordner</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <ServerCrash size={16} />
        <span>Konfiguration unvollständig</span>
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {readiness.blockingIssues.map((issue: string, i: number) => (
          <li key={i}>· {issue}</li>
        ))}
      </ul>
    </div>
  );
}

export function AttachmentSyncPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AttachmentSyncStatus>({
    queryKey: queryKeys.attachmentSync.status(),
    queryFn: getAttachmentSyncStatus,
    refetchInterval: 3000,
  });

  const syncMutation = useMutation({
    mutationFn: runAttachmentSync,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.attachmentSync.root });
    },
  });

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="list"
        title="Attachment-Synchronisation"
        subtitle="Bidirektionaler Abgleich zwischen lokalem Upload-Ordner und Remote-SFTP"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Prominenter Status-Banner */}
          {!isLoading && data && (
            <SyncStatusBanner status={data} />
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Wird geladen…
            </div>
          )}

          <Section title="Verbindung">
            {data ? <ReadinessPanel status={data} /> : null}
          </Section>

          <Section title="Manueller Sync">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Beim App-Start wird automatisch synchronisiert. Hier kann ein Sync manuell ausgelöst werden.
              </p>
              <button
                type="button"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || data?.inProgress === true || !data?.readiness.ready}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncMutation.isPending || data?.inProgress ? "animate-spin" : ""} />
                {syncMutation.isPending || data?.inProgress ? "Synchronisiert…" : "Jetzt synchronisieren"}
              </button>
            </div>
          </Section>

          {data?.lastSync && (
            <Section title="Letzter Sync — Details">
              <SyncStatsPanel stats={data.lastSync} />
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}
