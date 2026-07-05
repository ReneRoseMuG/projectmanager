import type { CalendarConnection } from "@taskmanager/shared-types";
import { Plug, RefreshCw, Unlink } from "lucide-react";
import { useCallback } from "react";
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

export function SettingsCalendarConnectionsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const canWrite = hasPermission(auth.user, "calendarConnections", "write");
  const canDelete = hasPermission(auth.user, "calendarConnections", "delete");
  const { connections, loading, error, syncConnection, deleteConnection, isSyncing, isDeleting } = useCalendarConnections();

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

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero variant="list" title="Kalenderverbindungen" subtitle={`${connections.length} Verbindungen`} />

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-5 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        {canWrite ? (
          <div className="flex justify-end">
            <Button
              icon={<Plug size={16} />}
              onClick={() =>
                showToast({
                  tone: "info",
                  title: "Verbindung einrichten",
                  message: "Die Einrichtung von Google- und NextCloud-Kalendern wird in den folgenden Schritten aktiviert."
                })
              }
            >
              Verbinden
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
      </div>
    </div>
  );
}
