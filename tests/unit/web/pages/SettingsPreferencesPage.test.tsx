// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Präferenzen zeigen USER-Settings für normale Nutzer und GLOBAL-Settings nur für Admins.
 * - Enum-Settings werden generisch gerendert und speichern über den Settings-Hook.
 *
 * Fehlerfälle:
 * - Nicht-adminberechtigte Nutzer erhalten keine GLOBAL-Controls.
 *
 * Ziel:
 * Die generische SettingsPage gegen Berechtigungs- und Rendering-Regressionen absichern.
 */

import type { ResolvedSetting } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../../apps/web/src/components/ui/ToastProvider";
import { SettingsPreferencesPage } from "../../../../apps/web/src/pages/SettingsPreferencesPage";

const setSettingMock = vi.fn();
const resetSettingMock = vi.fn();
let adminAccess = false;

const settings: ResolvedSetting[] = [
  {
    key: "taskBoard.viewMode",
    label: "Aufgaben-Board Ansicht",
    description: "Steuert die Standarddarstellung für Aufgabenlisten.",
    valueType: "enum",
    constraints: { options: ["list", "kanban"] },
    allowedScopes: ["GLOBAL", "USER"],
    defaultValue: "list",
    values: {},
    resolvedValue: "list",
    resolvedScope: "DEFAULT",
    resolvedVersion: null
  }
];

vi.mock("../../../../apps/web/src/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      permissions: adminAccess ? [{ id: 1, roleId: 1, resource: "settings", action: "admin" }] : [{ id: 2, roleId: 2, resource: "*", action: "read" }]
    }
  })
}));

vi.mock("../../../../apps/web/src/hooks/useSettings", () => ({
  useSettings: () => ({
    settings,
    loading: false,
    error: null,
    isSaving: false,
    setSetting: setSettingMock,
    resetSetting: resetSettingMock
  })
}));

function renderPage() {
  render(
    <ToastProvider>
      <SettingsPreferencesPage />
    </ToastProvider>
  );
}

afterEach(() => {
  cleanup();
  setSettingMock.mockReset();
  resetSettingMock.mockReset();
  adminAccess = false;
});

describe("SettingsPreferencesPage", () => {
  it("zeigt normale USER-Präferenzen ohne globale Admin-Controls", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Präferenzen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mein Profil" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Globale Defaults" })).not.toBeInTheDocument();
  });

  it("speichert Enum-Settings über den Settings-Hook", async () => {
    setSettingMock.mockResolvedValue({ settings });
    renderPage();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "kanban" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(setSettingMock).toHaveBeenCalledWith({ key: "taskBoard.viewMode", scopeType: "USER", value: "kanban" }));
  });

  it("zeigt globale Controls nur für Settings-Admins", () => {
    adminAccess = true;
    renderPage();

    expect(screen.getByRole("heading", { name: "Globale Defaults" })).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });
});
