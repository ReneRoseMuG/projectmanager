import type { CalendarConnection, CalendarJournalEntry, CalendarJournalEventType } from "@taskmanager/shared-types";
import { CalendarCheck, KeyRound, Plug, RefreshCcw, RefreshCw, Server, Unlink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GoogleCalendarOption } from "../api/calendar-connections";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { FormField } from "../components/ui/FormField";
import { FormModal } from "../components/ui/FormModal";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
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

const EMPTY_NEXTCLOUD = { displayName: "", baseUrl: "", username: "", appPassword: "" };

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
  const {
    connections,
    journal,
    config,
    loading,
    error,
    syncConnection,
    deleteConnection,
    connectGoogle,
    connectNextCloud,
    loadGoogleCalendars,
    selectGoogleCalendar,
    syncAll,
    isSyncing,
    isDeleting,
    isConnectingNextCloud,
    isSyncingAll
  } = useCalendarConnections();

  const [nextcloudOpen, setNextcloudOpen] = useState(false);
  const [nextcloudForm, setNextcloudForm] = useState(EMPTY_NEXTCLOUD);
  const [calendarPicker, setCalendarPicker] = useState<{ connectionId: number; options: GoogleCalendarOption[] } | null>(null);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // OAuth-Rücksprung von Google auswerten (der Callback leitet mit ?google=connected|error zurück).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get("google");
    if (google === "connected") {
      showToast({ tone: "success", title: "Google verbunden", message: "Die Autorisierung war erfolgreich. Du kannst jetzt den Zielkalender wählen." });
    } else if (google === "error") {
      showToast({ tone: "error", title: "Google-Verbindung fehlgeschlagen", message: "Die Autorisierung wurde abgebrochen oder ist fehlgeschlagen." });
    }
    if (google) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [showToast]);

  const run = useCallback(
    async (action: () => Promise<unknown>, successTitle: string, successMessage?: string) => {
      try {
        await action();
        showToast({ tone: "success", title: successTitle, message: successMessage });
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

  const submitNextcloud = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      try {
        await connectNextCloud(nextcloudForm);
        setNextcloudOpen(false);
        setNextcloudForm(EMPTY_NEXTCLOUD);
        showToast({ tone: "success", title: "NextCloud verbunden", message: "Die Kalender wurden erkannt und stehen als read-only zur Verfügung." });
      } catch (connectError) {
        showToast({ tone: "error", title: "NextCloud-Verbindung fehlgeschlagen", message: await errorMessageAsync(connectError) });
      }
    },
    [connectNextCloud, nextcloudForm, showToast]
  );

  const openCalendarPicker = useCallback(
    async (connectionId: number) => {
      try {
        setLoadingCalendars(true);
        const options = await loadGoogleCalendars(connectionId);
        setCalendarPicker({ connectionId, options });
      } catch (loadError) {
        showToast({ tone: "error", title: "Kalender konnten nicht geladen werden", message: await errorMessageAsync(loadError) });
      } finally {
        setLoadingCalendars(false);
      }
    },
    [loadGoogleCalendars, showToast]
  );

  const chooseCalendar = useCallback(
    async (calendarId: string) => {
      if (!calendarPicker) {
        return;
      }
      try {
        await selectGoogleCalendar(calendarPicker.connectionId, calendarId);
        setCalendarPicker(null);
        showToast({ tone: "success", title: "Zielkalender gesetzt" });
      } catch (selectError) {
        showToast({ tone: "error", title: "Auswahl fehlgeschlagen", message: await errorMessageAsync(selectError) });
      }
    },
    [calendarPicker, selectGoogleCalendar, showToast]
  );

  const googleReady = config?.googleConfigured ?? false;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero variant="list" title="Kalenderverbindungen" subtitle={`${connections.length} Verbindungen`} />

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-5 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        {canWrite ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              icon={<RefreshCcw size={16} />}
              loading={isSyncingAll}
              onClick={() => void run(syncAll, "Abgleich ausgelöst")}
            >
              Alle abgleichen
            </Button>
            <Button icon={<Server size={16} />} variant="secondary" onClick={() => setNextcloudOpen(true)}>
              NextCloud verbinden
            </Button>
            <Button icon={<Plug size={16} />} disabled={!googleReady} onClick={() => void startGoogleAuth()}>
              Google verbinden
            </Button>
          </div>
        ) : null}

        {config && !googleReady ? (
          <div className="rounded-md border border-tangerine/30 bg-tangerine/10 p-3 text-sm text-ink">
            <span className="font-semibold">Google ist serverseitig noch nicht eingerichtet.</span> Zum Aktivieren müssen{" "}
            <code className="rounded bg-white/60 px-1">GOOGLE_CLIENT_ID</code>, <code className="rounded bg-white/60 px-1">GOOGLE_CLIENT_SECRET</code> und{" "}
            <code className="rounded bg-white/60 px-1">GOOGLE_REDIRECT_URI</code> in der Server-Konfiguration gesetzt werden (siehe <code className="rounded bg-white/60 px-1">apps/api/.env.example</code>). Bis dahin ist „Google verbinden" deaktiviert; NextCloud funktioniert unabhängig davon.
          </div>
        ) : null}

        {config ? (
          <div className="text-xs text-steel-500">
            Automatischer Abgleich im Hintergrund: {config.autoSyncEnabled ? <span className="font-semibold text-fern">aktiv</span> : <span className="font-semibold text-steel-600">aus (nur manuell)</span>}
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
            Noch keine Kalenderverbindungen eingerichtet. Verbinde oben Google oder NextCloud, um Termine abzugleichen.
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
                    {canWrite && connection.provider === "google" && connection.status !== "reauth_required" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<CalendarCheck size={16} />}
                        loading={loadingCalendars}
                        onClick={() => void openCalendarPicker(connection.id)}
                      >
                        Kalender wählen
                      </Button>
                    ) : null}
                    {canWrite && connection.status === "reauth_required" && connection.provider === "google" ? (
                      <Button variant="secondary" size="sm" icon={<KeyRound size={16} />} onClick={() => void startGoogleAuth()}>
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

      <FormModal
        open={nextcloudOpen}
        onClose={() => setNextcloudOpen(false)}
        title="NextCloud verbinden"
        icon={<Server size={18} />}
        onSubmit={submitNextcloud}
        saving={isConnectingNextCloud}
        submitLabel="Verbinden"
      >
        <FormField label="Anzeigename" required hint="Frei wählbar, z. B. Büro-Cloud.">
          <Input value={nextcloudForm.displayName} onChange={(e) => setNextcloudForm((f) => ({ ...f, displayName: e.target.value }))} required />
        </FormField>
        <FormField label="Server-Adresse" required hint="Vollständige https-Adresse deiner NextCloud, z. B. https://cloud.example.com">
          <Input type="url" placeholder="https://cloud.example.com" value={nextcloudForm.baseUrl} onChange={(e) => setNextcloudForm((f) => ({ ...f, baseUrl: e.target.value }))} required />
        </FormField>
        <FormField label="Benutzername" required>
          <Input autoComplete="username" value={nextcloudForm.username} onChange={(e) => setNextcloudForm((f) => ({ ...f, username: e.target.value }))} required />
        </FormField>
        <FormField label="App-Passwort" required hint="In NextCloud unter Einstellungen → Sicherheit → App-Passwort erstellen. Nicht das normale Anmeldepasswort.">
          <Input type="password" autoComplete="new-password" value={nextcloudForm.appPassword} onChange={(e) => setNextcloudForm((f) => ({ ...f, appPassword: e.target.value }))} required />
        </FormField>
      </FormModal>

      <Modal open={calendarPicker !== null} title="Google-Zielkalender wählen" size="md" onClose={() => setCalendarPicker(null)}>
        <div className="grid gap-2">
          <p className="text-sm text-steel-500">Nur beschreibbare Kalender können als Ziel dienen (dorthin werden deine App-Termine exportiert).</p>
          {(calendarPicker?.options ?? []).map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={!option.writable}
              onClick={() => void chooseCalendar(option.id)}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${option.writable ? "border-line bg-white hover:border-steel-600" : "cursor-not-allowed border-line bg-shell/50 text-steel-400"}`}
            >
              <span className="font-medium">
                {option.summary}
                {option.primary ? " · Hauptkalender" : ""}
              </span>
              {option.writable ? <Badge tone="teal">wählbar</Badge> : <Badge tone="steel">nur lesbar</Badge>}
            </button>
          ))}
          {calendarPicker && calendarPicker.options.length === 0 ? (
            <p className="text-sm text-steel-500">Keine Kalender gefunden.</p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
