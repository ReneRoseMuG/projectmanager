// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit (Frontend-Komponente)
 *
 * Realitätsgrad:
 * - Echte SettingsCalendarConnectionsPage inkl. echter UI-Komponenten (PageHero/Section/Badge/Button).
 *   Datenquelle (useCalendarConnections), Session (useAuth) und Toast werden über Hook-Mocks gestellt,
 *   da diese Komponente die Präsentations-/Interaktionslogik prüft, nicht die HTTP-Schicht.
 *
 * Mock-Entscheidung:
 * - Hook-Mocks für useCalendarConnections/useAuth/useToast (kein Netz). Permission-Gate wird über echte
 *   hasPermission-Logik auf gemockten user.permissions geprüft (kein Stub von hasPermission selbst).
 *
 * Isolation:
 * - jsdom, keine DB/kein Netz; cleanup nach jedem Fall.
 *
 * Abgedeckte Regeln:
 * - Liste rendert Verbindungen inkl. Status-Badges und Fehlermeldung; Leerzustand ohne Verbindungen
 * - Sync- und Trennen-Aktion rufen die richtige Mutation und zeigen Erfolgs-Toast
 * - „Trennen" nur mit delete-Permission sichtbar
 *
 * Fehlerfälle:
 * - Fehlgeschlagene Aktion erzeugt Fehler-Toast
 *
 * Ziel:
 * Absicherung der Verwaltungs-UI gegen Darstellungs-, Interaktions- und Permission-Regressionen.
 */

import "@testing-library/jest-dom/vitest";
import type { CalendarConnection } from "@taskmanager/shared-types";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsCalendarConnectionsPage } from "../../../../apps/web/src/pages/SettingsCalendarConnectionsPage";

const mocks = vi.hoisted(() => ({
  connections: [] as CalendarConnection[],
  syncConnection: vi.fn(),
  deleteConnection: vi.fn(),
  showToast: vi.fn(),
  permissions: [{ resource: "*", action: "*" }] as Array<{ resource: string; action: string }>
}));

vi.mock("../../../../apps/web/src/hooks/useCalendarConnections", () => ({
  useCalendarConnections: () => ({
    connections: mocks.connections,
    loading: false,
    error: null,
    syncConnection: mocks.syncConnection,
    deleteConnection: mocks.deleteConnection,
    isSyncing: false,
    isDeleting: false
  })
}));

vi.mock("../../../../apps/web/src/hooks/useAuth", () => ({
  useAuth: () => ({ user: { permissions: mocks.permissions } })
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: mocks.showToast })
}));

const CONNECTIONS: CalendarConnection[] = [
  { id: 1, userId: 10, provider: "google", displayName: "Mein Google", status: "active", lastSyncAt: "2026-07-05T10:30:00Z", lastError: null, version: 1, createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-05T10:30:00Z" },
  { id: 2, userId: 10, provider: "nextcloud", displayName: "NextCloud Büro", status: "error", lastSyncAt: null, lastError: "HTTP 401 Unauthorized", version: 1, createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-04T15:00:00Z" }
];

beforeEach(() => {
  mocks.connections = CONNECTIONS;
  mocks.permissions = [{ resource: "*", action: "*" }];
});

afterEach(() => {
  cleanup();
  mocks.syncConnection.mockReset();
  mocks.deleteConnection.mockReset();
  mocks.showToast.mockReset();
});

describe("SettingsCalendarConnectionsPage (AP-0.3)", () => {
  it("zeigt die Verbindungsliste mit Status-Badges und Fehlermeldung", () => {
    render(<SettingsCalendarConnectionsPage />);
    expect(screen.getByText("Kalenderverbindungen")).toBeInTheDocument();
    expect(screen.getByText("Mein Google")).toBeInTheDocument();
    expect(screen.getByText("NextCloud Büro")).toBeInTheDocument();
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
    expect(screen.getByText("Fehler")).toBeInTheDocument();
    expect(screen.getByText("HTTP 401 Unauthorized")).toBeInTheDocument();
  });

  it("zeigt einen Leerzustand ohne Verbindungen", () => {
    mocks.connections = [];
    render(<SettingsCalendarConnectionsPage />);
    expect(screen.getByText(/Noch keine Kalenderverbindungen/)).toBeInTheDocument();
  });

  it("löst Sync für die richtige Verbindung aus und zeigt Erfolgs-Toast", async () => {
    mocks.syncConnection.mockResolvedValue({});
    render(<SettingsCalendarConnectionsPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Jetzt synchronisieren" })[0]);
    await waitFor(() => expect(mocks.syncConnection).toHaveBeenCalledWith(1));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" })));
  });

  it("zeigt Trennen nur mit delete-Permission", () => {
    const { unmount } = render(<SettingsCalendarConnectionsPage />);
    expect(screen.getAllByRole("button", { name: "Trennen" })).toHaveLength(2);
    unmount();
    cleanup();
    mocks.permissions = [{ resource: "*", action: "read" }];
    render(<SettingsCalendarConnectionsPage />);
    expect(screen.queryByRole("button", { name: "Trennen" })).not.toBeInTheDocument();
  });

  it("trennt nach Bestätigung und zeigt Erfolgs-Toast", async () => {
    mocks.deleteConnection.mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    render(<SettingsCalendarConnectionsPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Trennen" })[0]);
    await waitFor(() => expect(mocks.deleteConnection).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "success", title: "Verbindung getrennt" }))
    );
  });

  it("zeigt Fehler-Toast bei fehlgeschlagener Aktion", async () => {
    mocks.syncConnection.mockRejectedValue(new Error("Network error"));
    render(<SettingsCalendarConnectionsPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Jetzt synchronisieren" })[0]);
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "error", title: "Aktion fehlgeschlagen" }))
    );
  });
});
