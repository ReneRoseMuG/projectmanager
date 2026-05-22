import {
  settingsRegistry,
  type JsonValue,
  type ResolvedSetting,
  type SettingScopeType,
} from "@taskmanager/shared-types";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { FormField } from "../components/ui/FormField";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { Section } from "../components/ui/Section";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessageAsync } from "../hooks/errors";
import { useAuth } from "../hooks/useAuth";
import { useSettings } from "../hooks/useSettings";

type EditableScopeType = Extract<SettingScopeType, "GLOBAL" | "USER">;

function hasSettingsAdminAccess(
  user: ReturnType<typeof useAuth>["user"],
): boolean {
  return Boolean(
    user?.permissions.some(
      (permission) =>
        (permission.resource === "*" || permission.resource === "settings") &&
        (permission.action === "*" || permission.action === "admin"),
    ),
  );
}

function scopeLabel(scopeType: SettingScopeType | "DEFAULT"): string {
  if (scopeType === "GLOBAL") return "Global";
  if (scopeType === "ROLE") return "Rolle";
  if (scopeType === "USER") return "Persönlich";
  return "Standard";
}

function displayValue(value: JsonValue): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

function initialRawValue(
  setting: ResolvedSetting,
  scopeType: EditableScopeType,
): string {
  const value = setting.values[scopeType]?.value ?? setting.resolvedValue;
  return displayValue(value);
}

function parseValue(
  setting: ResolvedSetting,
  rawValue: string,
  checked: boolean,
): JsonValue | null {
  if (setting.valueType === "boolean") {
    return checked;
  }
  if (setting.valueType === "number") {
    const value = Number(rawValue);
    return Number.isFinite(value) ? value : null;
  }
  if (setting.valueType === "json") {
    try {
      return JSON.parse(rawValue) as JsonValue;
    } catch {
      return null;
    }
  }
  return rawValue;
}

function SettingScopeEditor({
  setting,
  scopeType,
  title,
}: {
  setting: ResolvedSetting;
  scopeType: EditableScopeType;
  title: string;
}) {
  const { setSetting, resetSetting, isSaving } = useSettings();
  const { showToast } = useToast();
  const [rawValue, setRawValue] = useState(initialRawValue(setting, scopeType));
  const [checked, setChecked] = useState(
    Boolean(setting.values[scopeType]?.value ?? setting.resolvedValue),
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const hasStoredValue = setting.values[scopeType] !== undefined;
  const definition = settingsRegistry[setting.key];
  const isJsonOnly = setting.valueType === "json";

  useEffect(() => {
    setRawValue(initialRawValue(setting, scopeType));
    setChecked(
      Boolean(setting.values[scopeType]?.value ?? setting.resolvedValue),
    );
    setLocalError(null);
  }, [setting, scopeType]);

  const save = async () => {
    const parsed = parseValue(setting, rawValue, checked);
    if (parsed === null || !definition.validate(parsed)) {
      setLocalError("Der Wert passt nicht zur Einstellung.");
      return;
    }
    setLocalError(null);
    try {
      await setSetting({ key: setting.key, scopeType, value: parsed });
      showToast({ tone: "success", title: "Einstellung gespeichert" });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Einstellung konnte nicht gespeichert werden",
        message: await errorMessageAsync(error),
      });
    }
  };

  const reset = async () => {
    try {
      await resetSetting({ key: setting.key, scopeType });
      showToast({ tone: "info", title: "Einstellung zurückgesetzt" });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Einstellung konnte nicht zurückgesetzt werden",
        message: await errorMessageAsync(error),
      });
    }
  };

  return (
    <div className="grid gap-3 rounded-md border border-line bg-shell/40 p-3 md:grid-cols-[minmax(12rem,1fr)_minmax(14rem,1.2fr)_auto] md:items-end">
      <div className="grid gap-1">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-xs text-steel-500">
          Aktiv: {scopeLabel(setting.resolvedScope)}
        </span>
      </div>
      <FormField label="Wert" error={localError ?? undefined}>
        {setting.valueType === "boolean" ? (
          <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-steel-700">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            Aktiv
          </label>
        ) : setting.valueType === "enum" ? (
          <select
            className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
            value={rawValue}
            onChange={(event) => setRawValue(event.target.value)}
          >
            {(setting.constraints?.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type={
              setting.valueType === "number"
                ? "number"
                : setting.valueType === "color"
                  ? "color"
                  : "text"
            }
            min={setting.constraints?.min}
            max={setting.constraints?.max}
            step={setting.constraints?.step}
            value={rawValue}
            disabled={isJsonOnly}
            onChange={(event) => setRawValue(event.target.value)}
          />
        )}
      </FormField>
      <div className="flex justify-end gap-1">
        <Button
          aria-label="Speichern"
          title="Speichern"
          icon={<Save size={17} />}
          loading={isSaving}
          disabled={isJsonOnly}
          onClick={() => void save()}
        />
        <Button
          aria-label="Zurücksetzen"
          title="Zurücksetzen"
          variant="ghost"
          icon={<RotateCcw size={17} />}
          disabled={!hasStoredValue || isSaving}
          onClick={() => void reset()}
        />
      </div>
    </div>
  );
}

function SettingsList({
  settings,
  scopeType,
  title,
}: {
  settings: ResolvedSetting[];
  scopeType: EditableScopeType;
  title: string;
}) {
  const visibleSettings = settings.filter((setting) =>
    setting.allowedScopes.includes(scopeType),
  );
  if (visibleSettings.length === 0) {
    return null;
  }
  return (
    <Section title={title}>
      <div className="grid gap-3">
        {visibleSettings.map((setting) => (
          <div
            key={`${scopeType}-${setting.key}`}
            className="grid gap-3 border-b border-line pb-4 last:border-b-0 last:pb-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  {setting.label}
                </h2>
                <p className="text-sm text-steel-500">{setting.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="steel">{setting.valueType}</Badge>
                <Badge
                  tone={setting.resolvedScope === "DEFAULT" ? "mute" : "teal"}
                >
                  {scopeLabel(setting.resolvedScope)}
                </Badge>
              </div>
            </div>
            <SettingScopeEditor
              setting={setting}
              scopeType={scopeType}
              title={
                scopeType === "USER" ? "Persönlicher Wert" : "Globaler Default"
              }
            />
          </div>
        ))}
      </div>
    </Section>
  );
}

export function SettingsPreferencesPage() {
  const auth = useAuth();
  const settingsState = useSettings();
  const adminAccess = hasSettingsAdminAccess(auth.user);
  const settings = useMemo(
    () => settingsState.settings,
    [settingsState.settings],
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <PageHeader title="Präferenzen" subtitle={`${settings.length} Einstellungen`} />

      {settingsState.error ? (
        <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">
          {settingsState.error}
        </div>
      ) : null}
      {settingsState.loading ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-steel-500">
          Einstellungen werden geladen.
        </div>
      ) : null}

      {!settingsState.loading ? (
        <>
          <SettingsList
            settings={settings}
            scopeType="USER"
            title="Mein Profil"
          />
          {adminAccess ? (
            <SettingsList
              settings={settings}
              scopeType="GLOBAL"
              title="Globale Defaults"
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
