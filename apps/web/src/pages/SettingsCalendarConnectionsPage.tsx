import type { CalendarConnection, CalendarJournalEntry, CalendarJournalEventType } from "@taskmanager/shared-types";
import { KeyRound, Plug, RefreshCw, Unlink } from "lucide-react";
import { useCallback, useEffect } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PageHero } from "../components/ui/PageHero";
import { Section } from "../components/ui/Section";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessageAsync } from "../hooks/errors";
import { useAuth } from "../hooks/useAuth";
import { hasPermission } from "../hooks/usePermissions";
import { useCalendarConnections } from "../hooks/useCalendarConnections";

const providerLabels: Record<string, string> = {
  google: "Google Kalender",
  nextcloud: "NextCloud"
};

const journalLabels: Record<CalendarJournalEventType, string> = {
  connected: "Verbunden",
  disconnected: "Getrennt",
  sync_success: "Sync erfolgreich",
  sync_error: "Sync-Fehler",
  conflict: "Konflikt gelöst"
};

function statusBadge(status: CalendarConnection["status"]) {
  if (status === "active") {
    return <Badge tone="teal">Aktiv</Badge>;
  }
  if (status === "error") {
    return <Badge tone="crimson">Fehler</Badge>;
  }
  if (status === "reauth_required") {
    return <Badge tone="tangerine">Neu anmelden</Badge>;
  }
  return <Badge tone="steel">Läuft…</Badge>;
}

function journalBadge(eventType: CalendarJournalEventType) {
  if (eventType === "sync_error") {
    return <Badge tone="crimson">{journalLabels[eventType]}</Badge>;
  }
  if (eventType === "conflict") {
    return <Badge tone="tangerine">{journalLabels[eventType]}</Badge>;
  }
  if (eventType === "disconnected") {
    return <Badge tone="steel">{journalLabels[eventType]}</Badge>;
  }
  return <Badge tone="teal">{journalLabels[eventType]}</Badge>;
}

export function SettingsCalendarConnectionsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const canWrite = hasPermission(auth.user, "calendarConnections", "write");
  const canDelete = hasPermission(auth.user, "calendarConnections", "delete");
  const { connections, journal, loading, error, syncConnection, deleteConnection, connectGoogle, isSyncing, isDeleting } = useCalendarConnections();

  // OAuth-Rücksprung von Google auswerten (der Callback leitet mit ?google=connected|error zurück).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get("google");
    if (google === "connected") {
      showToast({ tone: "success", title: "Google verbunden", message: "Die Autorisierung war erfolgreich." });
    } else if (google === "error") {
      showToast({ tone: "error", title: "Google-Verbindung fehlgeschlagen", message: "Die Autorisierung wurde abgebrochen oder ist fehlgeschlagen." });
    }
    if (google) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [showToast]);

  const run = useCallback(
    async (action: () => Promise<unknown>, successTitle: string) => {
      try {
        await action();
        showToast({ tone: "success", title: successTitle });
      } catch (mutationError) {
        showToast({ tone: "error", title: "Aktion fehlgeschlagen", message: await errorMessageAsync(mutationError) });
      }
    },
    [showToast]
  );

  const startGoogleAuth = useCallback(async () => {
    try {
      await connectGoogle();
    } catch (authError) {
      showToast({ tone: "error", title: "Google-Anmeldung nicht möglich", message: await errorMessageAsync(authError) });
    }
  }, [connectGoogle, showToast]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero variant="list" title="Kalenderverbindungen" subtitle={`${connections.length} Verbindungen`} />

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-5 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        {canWrite ? (
          <div className="flex justify-end">
            <Button icon={<Plug size={16} />} onClick={() => void startGoogleAuth()}>
              Google verbinden
            </Button>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">
            Die Kalenderverbindungen konnten nicht geladen werden.
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-steel-500">
            Verbindungen werden geladen.
          </div>
        ) : connections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-steel-500">
            Noch keine Kalenderverbindungen eingerichtet.
          </div>
        ) : (
          <Section title="Verbindungen">
            <div className="grid gap-3">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-white p-3"
                >
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{connection.displayName}</span>
                      {statusBadge(connection.status)}
                    </div>
                    <span className="text-xs text-steel-500">
                      {providerLabels[connection.provider] ?? connection.provider}
                      {" · Letzter Sync: "}
                      {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString("de-DE") : "—"}
                    </span>
                    {connection.lastError ? <span className="text-xs text-crimson">{connection.lastError}</span> : null}
                  </div>
                  <div className="flex items-center gap-1">
                    {canWrite && connection.status === "reauth_required" && connection.provider === "google" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<KeyRound size={16} />}
                        onClick={() => void startGoogleAuth()}
                      >
                        Neu anmelden
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RefreshCw size={16} />}
                      loading={isSyncing}
                      title="Jetzt synchronisieren"
                      aria-label="Jetzt synchronisieren"
                      onClick={() => void run(() => syncConnection(connection.id), "Synchronisierung ausgelöst")}
                    />
                    {canDelete ? (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Unlink size={16} />}
                        loading={isDeleting}
                        title="Trennen"
                        aria-label="Trennen"
                        onClick={() => {
                          if (window.confirm(`Verbindung „${connection.displayName}" trennen?`)) {
                            void run(() => deleteConnection(connection.id), "Verbindung getrennt");
                          }
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {journal.length > 0 ? (
          <Section title="Verlauf">
            <ul className="grid gap-2">
              {journal.map((entry: CalendarJournalEntry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-white p-2 text-xs">
                  {journalBadge(entry.eventType)}
                  <span className="font-medium text-ink">{entry.connectionLabel}</span>
                  {entry.message ? <span className="text-steel-500">{entry.message}</span> : null}
                  <span className="ml-auto text-steel-400">{new Date(entry.createdAt).toLocaleString("de-DE")}</span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
