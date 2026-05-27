// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - React-Komponente mit kontrolliertem Push-Hook und ToastProvider.
 *
 * Mock-Entscheidung:
 * - Push-Hook und Permission-Hook werden ersetzt, weil der Test die UI-Zustände und Benutzeraktionen prüft.
 *
 * Isolation:
 * - jsdom ohne Netzwerkverbindung.
 *
 * Abgedeckte Regeln:
 * - Berechtigte Nutzer können Desktop-Benachrichtigungen aktivieren und deaktivieren.
 * - Nicht berechtigte Nutzer sehen keinen Push-Abschnitt.
 *
 * Fehlerfälle:
 * - Fehlende Berechtigung blendet die Aktion aus.
 *
 * Ziel:
 * Die Einstellungen-UI für MS-14 gegen Berechtigungs- und Toggle-Regressionen absichern.
 */

import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PushNotificationsPanel } from "../../../../../apps/web/src/components/settings/PushNotificationsPanel";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";
import { usePushNotifications } from "../../../../../apps/web/src/hooks/usePushNotifications";

let canManage = true;
const enableMock = vi.fn();
const disableMock = vi.fn();
let subscribed = false;

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => canManage
}));

vi.mock("../../../../../apps/web/src/hooks/usePushNotifications", () => ({
  usePushNotifications: vi.fn()
}));

function renderPanel() {
  vi.mocked(usePushNotifications).mockReturnValue({
    supported: true,
    serverEnabled: true,
    subscribed,
    loading: false,
    saving: false,
    error: null,
    enable: enableMock,
    disable: disableMock
  });
  render(
    <ToastProvider>
      <PushNotificationsPanel />
    </ToastProvider>
  );
}

afterEach(() => {
  cleanup();
  canManage = true;
  subscribed = false;
  enableMock.mockReset();
  disableMock.mockReset();
  vi.mocked(usePushNotifications).mockReset();
});

describe("PushNotificationsPanel", () => {
  it("aktiviert Desktop-Benachrichtigungen", async () => {
    enableMock.mockResolvedValue(undefined);
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Aktivieren" }));

    await waitFor(() => expect(enableMock).toHaveBeenCalledTimes(1));
  });

  it("deaktiviert bestehende Desktop-Benachrichtigungen", async () => {
    subscribed = true;
    disableMock.mockResolvedValue(undefined);
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Deaktivieren" }));

    await waitFor(() => expect(disableMock).toHaveBeenCalledTimes(1));
  });

  it("blendet den Abschnitt ohne Berechtigung aus", () => {
    canManage = false;
    renderPanel();

    expect(screen.queryByRole("heading", { name: "Desktop-Benachrichtigungen" })).not.toBeInTheDocument();
  });
});
