import { CALENDAR_SYNC_MIN_INTERVAL_MS, type CalendarSyncConfigView, type UpdateCalendarSyncConfigRequest } from "@taskmanager/shared-types";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { PageHero } from "../../components/ui/PageHero";
import { Section } from "../../components/ui/Section";
import { useToast } from "../../components/ui/ToastProvider";
import { errorMessageAsync } from "../../hooks/errors";
import { useAuth } from "../../hooks/useAuth";
import { hasPermission } from "../../hooks/usePermissions";
import { useCalendarSyncSettings } from "../../hooks/useCalendarSyncSettings";

const MIN_INTERVAL_MIN = Math.max(1, Math.round(CALENDAR_SYNC_MIN_INTERVAL_MS / 60_000));

interface FormState {
  googleClientId: string;
  googleRedirectUri: string;
  syncEnabled: boolean;
  syncIntervalMin: number;
  googlePushWebhookUrl: string;
}

function toFormState(config: CalendarSyncConfigView): FormState {
  return {
    googleClientId: config.googleClientId,
    googleRedirectUri: config.googleRedirectUri,
    syncEnabled: config.syncEnabled,
    syncIntervalMin: Math.max(MIN_INTERVAL_MIN, Math.round(config.syncIntervalMs / 60_000)),
    googlePushWebhookUrl: config.googlePushWebhookUrl
  };
}

/** Formular mit lokalem Zustand, initialisiert aus der geladenen Konfiguration. Das umschließende
 *  key={config.version} setzt es nach dem Speichern sauber zurück (auch Secret-Eingabe). */
function CalendarSyncSettingsForm({ config }: { config: CalendarSyncConfigView }) {
  const auth = useAuth();
  const { showToast } = useToast();
  const { save, isSaving } = useCalendarSyncSettings();
  const canAdmin = hasPermission(auth.user, "settings", "admin");

  const [form, setForm] = useState<FormState>(() => toFormState(config));
  const [secretInput, setSecretInput] = useState("");
  const [removeSecret, setRemoveSecret] = useState(false);

  const secretDisabled = !canAdmin || !config.encryptionKeyConfigured;

  async function handleSave() {
    const payload: UpdateCalendarSyncConfigRequest = {
      googleClientId: form.googleClientId.trim(),
      googleRedirectUri: form.googleRedirectUri.trim(),
      syncEnabled: form.syncEnabled,
      syncIntervalMs: Math.max(CALENDAR_SYNC_MIN_INTERVAL_MS, Math.round(form.syncIntervalMin) * 60_000),
      googlePushWebhookUrl: form.googlePushWebhookUrl.trim(),
      expectedVersion: config.version
    };
    if (removeSecret) {
      payload.googleClientSecret = "";
    } else if (secretInput.trim().length > 0) {
      payload.googleClientSecret = secretInput;
    }
    try {
      await save(payload);
      showToast({ tone: "success", title: "Gespeichert", message: "Die Kalender-Konfiguration gilt jetzt zentral für alle Arbeitsplätze." });
    } catch (error) {
      showToast({ tone: "error", title: "Speichern fehlgeschlagen", message: await errorMessageAsync(error) });
    }
  }

  return (
    <div className="grid gap-5">
      {config.usingEnvFallback ? (
        <div className="rounded-md border border-steel-400/30 bg-steel-50 p-3 text-sm text-ink">
          Die aktuell wirksamen Werte stammen noch aus der <code className="rounded bg-white/70 px-1">.env</code>-Datei dieses Servers.
          Nach dem ersten Speichern werden sie zentral aus der Datenbank geladen — dann genügt an jedem Arbeitsplatz die eine
          Zeile <code className="rounded bg-white/70 px-1">CALENDAR_ENCRYPTION_KEY</code>.
        </div>
      ) : null}

      {!config.encryptionKeyConfigured ? (
        <div className="rounded-md border border-tangerine/30 bg-tangerine/10 p-3 text-sm text-ink">
          <span className="font-semibold">Verschlüsselung nicht eingerichtet.</span> Ohne{" "}
          <code className="rounded bg-white/60 px-1">CALENDAR_ENCRYPTION_KEY</code> in{" "}
          <code className="rounded bg-white/60 px-1">apps/api/.env</code> lässt sich kein Client-Secret speichern. Alle übrigen
          Felder können trotzdem gepflegt werden.
        </div>
      ) : null}

      <Section title="Google OAuth">
        <div className="grid gap-4">
          <FormField label="Client-ID" hint="Aus der Google Cloud Console → Anmeldedaten → OAuth-Client-ID (Typ Webanwendung).">
            <Input
              value={form.googleClientId}
              disabled={!canAdmin}
              onChange={(e) => setForm((f) => ({ ...f, googleClientId: e.target.value }))}
            />
          </FormField>

          <FormField
            label="Client-Secret"
            hint={config.googleClientSecretSet ? "Ein Secret ist hinterlegt. Feld leer lassen, um es beizubehalten." : "Wird verschlüsselt gespeichert und nie erneut angezeigt."}
          >
            <div className="grid gap-2">
              <Input
                type="password"
                autoComplete="new-password"
                value={secretInput}
                disabled={secretDisabled || removeSecret}
                placeholder={config.googleClientSecretSet ? "•••••••• hinterlegt" : "Client-Secret eingeben"}
                onChange={(e) => {
                  setSecretInput(e.target.value);
                  setRemoveSecret(false);
                }}
              />
              {config.googleClientSecretSet && !removeSecret ? (
                <button
                  type="button"
                  disabled={secretDisabled}
                  className="justify-self-start text-xs font-semibold text-crimson hover:underline disabled:cursor-not-allowed disabled:text-steel-400"
                  onClick={() => { setRemoveSecret(true); setSecretInput(""); }}
                >
                  Secret entfernen
                </button>
              ) : null}
              {removeSecret ? (
                <span className="flex items-center gap-2 text-xs text-crimson">
                  Secret wird beim Speichern entfernt.
                  <button type="button" className="font-semibold hover:underline" onClick={() => setRemoveSecret(false)}>
                    Rückgängig
                  </button>
                </span>
              ) : null}
            </div>
          </FormField>

          <FormField label="Redirect-URI" hint="Muss identisch als autorisierter Redirect-URI in der Google Cloud Console hinterlegt sein.">
            <Input
              value={form.googleRedirectUri}
              disabled={!canAdmin}
              onChange={(e) => setForm((f) => ({ ...f, googleRedirectUri: e.target.value }))}
            />
          </FormField>
        </div>
      </Section>

      <Section title="Automatischer Abgleich">
        <div className="grid gap-4">
          <label className={`flex items-center gap-3 rounded-md border border-line bg-white p-3 text-sm ${canAdmin ? "" : "opacity-70"}`}>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.syncEnabled}
              disabled={!canAdmin}
              onChange={(e) => setForm((f) => ({ ...f, syncEnabled: e.target.checked }))}
            />
            <span className="font-medium text-ink">Hintergrund-Abgleich aktiv</span>
          </label>

          <FormField label="Intervall (Minuten)" hint={`Wie oft die Verbindungen im Hintergrund abgeglichen werden. Mindestens ${MIN_INTERVAL_MIN} Minute(n).`}>
            <div className="w-40">
              <Input
                type="number"
                min={MIN_INTERVAL_MIN}
                step={1}
                value={String(form.syncIntervalMin)}
                disabled={!canAdmin}
                onChange={(e) => setForm((f) => ({ ...f, syncIntervalMin: Number(e.target.value) || MIN_INTERVAL_MIN }))}
              />
            </div>
          </FormField>

          <FormField label="Push-Webhook-URL (optional)" hint="Öffentliche HTTPS-Adresse für Google-Push. Leer lassen, um beim periodischen Abgleich zu bleiben.">
            <Input
              value={form.googlePushWebhookUrl}
              disabled={!canAdmin}
              onChange={(e) => setForm((f) => ({ ...f, googlePushWebhookUrl: e.target.value }))}
            />
          </FormField>
        </div>
      </Section>

      <div className="flex items-center justify-end gap-3">
        {!canAdmin ? (
          <span className="text-xs text-steel-500">Nur Administratoren mit der Berechtigung „settings:admin" dürfen speichern.</span>
        ) : null}
        <Button icon={<KeyRound size={16} />} loading={isSaving} disabled={!canAdmin} onClick={() => void handleSave()}>
          Speichern
        </Button>
      </div>
    </div>
  );
}

export function CalendarSyncSettingsPage() {
  const { config, loading, error } = useCalendarSyncSettings();

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero variant="list" title="Kalender-Synchronisation" subtitle="Zentrale Server-Konfiguration für alle Arbeitsplätze" />

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-5 overflow-auto px-4 pt-5 md:px-5">
        {loading ? (
          <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-steel-500">
            Konfiguration wird geladen.
          </div>
        ) : error || !config ? (
          <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">
            Die Kalender-Konfiguration konnte nicht geladen werden.
          </div>
        ) : (
          <CalendarSyncSettingsForm key={config.version} config={config} />
        )}
      </div>
    </div>
  );
}
