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
import type { CalendarConnection, CalendarJournalEntry } from "@taskmanager/shared-types";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsCalendarConnectionsPage } from "../../../../apps/web/src/pages/SettingsCalendarConnectionsPage";

const mocks = vi.hoisted(() => ({
  connections: [] as CalendarConnection[],
  journal: [] as CalendarJournalEntry[],
  config: { googleConfigured: true, autoSyncEnabled: false } as { googleConfigured: boolean; autoSyncEnabled: boolean },
  syncConnection: vi.fn(),
  deleteConnection: vi.fn(),
  connectGoogle: vi.fn(),
  connectNextCloud: vi.fn(),
  loadGoogleCalendars: vi.fn(),
  selectGoogleCalendar: vi.fn(),
  syncAll: vi.fn(),
  showToast: vi.fn(),
  permissions: [{ resource: "*", action: "*" }] as Array<{ resource: string; action: string }>
}));

vi.mock("../../../../apps/web/src/hooks/useCalendarConnections", () => ({
  useCalendarConnections: () => ({
    connections: mocks.connections,
    journal: mocks.journal,
    config: mocks.config,
    loading: false,
    error: null,
    syncConnection: mocks.syncConnection,
    deleteConnection: mocks.deleteConnection,
    connectGoogle: mocks.connectGoogle,
    connectNextCloud: mocks.connectNextCloud,
    loadGoogleCalendars: mocks.loadGoogleCalendars,
    selectGoogleCalendar: mocks.selectGoogleCalendar,
    syncAll: mocks.syncAll,
    isSyncing: false,
    isDeleting: false,
    isConnectingNextCloud: false,
    isSelectingCalendar: false,
    isSyncingAll: false
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
  mocks.journal = [];
  mocks.config = { googleConfigured: true, autoSyncEnabled: false };
  mocks.permissions = [{ resource: "*", action: "*" }];
});

afterEach(() => {
  cleanup();
  mocks.syncConnection.mockReset();
  mocks.deleteConnection.mockReset();
  mocks.connectGoogle.mockReset();
  mocks.connectNextCloud.mockReset();
  mocks.loadGoogleCalendars.mockReset();
  mocks.selectGoogleCalendar.mockReset();
  mocks.syncAll.mockReset();
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

  // AP-4.3: Re-Auth, Journal, Google-Flow
  it("startet den Google-OAuth-Flow über den Verbinden-Button", () => {
    render(<SettingsCalendarConnectionsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Google verbinden/ }));
    expect(mocks.connectGoogle).toHaveBeenCalledTimes(1);
  });

  it("bietet den Re-Auth-Button bei reauth_required und startet den Google-Flow", () => {
    mocks.connections = [{ ...CONNECTIONS[0], status: "reauth_required" }];
    render(<SettingsCalendarConnectionsPage />);
    expect(screen.getAllByText("Neu anmelden").length).toBeGreaterThanOrEqual(2); // Badge + Button
    fireEvent.click(screen.getByRole("button", { name: "Neu anmelden" }));
    expect(mocks.connectGoogle).toHaveBeenCalledTimes(1);
  });

  it("zeigt keinen Re-Auth-Button bei aktiver oder fehlerhafter Verbindung", () => {
    render(<SettingsCalendarConnectionsPage />); // active + error, kein reauth_required
    expect(screen.queryByRole("button", { name: "Neu anmelden" })).not.toBeInTheDocument();
  });

  it("bietet Re-Auth NICHT für einen NextCloud-Kalender (nur Google)", () => {
    mocks.connections = [{ ...CONNECTIONS[1], status: "reauth_required" }];
    render(<SettingsCalendarConnectionsPage />);
    expect(screen.queryByRole("button", { name: "Neu anmelden" })).not.toBeInTheDocument();
  });

  it("zeigt den Journal-Verlauf mit Ereignis-Labels und Nachricht", () => {
    mocks.journal = [
      { id: 1, connectionId: 1, connectionLabel: "Mein Google", eventType: "sync_error", message: "Token widerrufen", createdAt: "2026-07-05T12:00:00Z" },
      { id: 2, connectionId: 1, connectionLabel: "Mein Google", eventType: "conflict", message: null, createdAt: "2026-07-05T11:00:00Z" },
      { id: 3, connectionId: null, connectionLabel: "Alt-Verbindung", eventType: "disconnected", message: null, createdAt: "2026-07-05T10:00:00Z" }
    ];
    render(<SettingsCalendarConnectionsPage />);
    expect(screen.getByText("Sync-Fehler")).toBeInTheDocument();
    expect(screen.getByText("Token widerrufen")).toBeInTheDocument();
    expect(screen.getByText("Konflikt gelöst")).toBeInTheDocument();
    expect(screen.getByText("Getrennt")).toBeInTheDocument();
    expect(screen.getByText("Alt-Verbindung")).toBeInTheDocument();
  });

  // Nachrüstung: Einrichtungs-UI (NextCloud, Google-Kalenderauswahl, Config-Hinweis, Sammel-Sync)
  it("deaktiviert Google und zeigt einen Hinweis, wenn die Server-Konfiguration fehlt", () => {
    mocks.config = { googleConfigured: false, autoSyncEnabled: false };
    render(<SettingsCalendarConnectionsPage />);
    expect(screen.getByRole("button", { name: /Google verbinden/ })).toBeDisabled();
    expect(screen.getByText(/serverseitig noch nicht eingerichtet/)).toBeInTheDocument();
  });

  it("öffnet das NextCloud-Formular und verbindet mit den eingegebenen Daten", async () => {
    mocks.connectNextCloud.mockResolvedValue({});
    render(<SettingsCalendarConnectionsPage />);
    fireEvent.click(screen.getByRole("button", { name: /NextCloud verbinden/ }));
    fireEvent.change(screen.getByLabelText(/Anzeigename/), { target: { value: "Büro" } });
    fireEvent.change(screen.getByLabelText(/Server-Adresse/), { target: { value: "https://cloud.example.com" } });
    fireEvent.change(screen.getByLabelText(/Benutzername/), { target: { value: "rene" } });
    fireEvent.change(screen.getByLabelText(/App-Passwort/), { target: { value: "app-pw" } });
    fireEvent.click(screen.getByRole("button", { name: "Verbinden" }));
    await waitFor(() =>
      expect(mocks.connectNextCloud).toHaveBeenCalledWith({ displayName: "Büro", baseUrl: "https://cloud.example.com", username: "rene", appPassword: "app-pw" })
    );
  });

  it("löst den Sammel-Abgleich aus", async () => {
    mocks.syncAll.mockResolvedValue({ processed: 2, synced: 2, failed: 0 });
    render(<SettingsCalendarConnectionsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Alle abgleichen/ }));
    await waitFor(() => expect(mocks.syncAll).toHaveBeenCalled());
  });

  it("lädt die Google-Kalender und setzt den gewählten Zielkalender", async () => {
    mocks.loadGoogleCalendars.mockResolvedValue([
      { id: "primary-cal", summary: "Mein Kalender", backgroundColor: null, accessRole: "owner", primary: true, writable: true },
      { id: "readonly-cal", summary: "Feiertage", backgroundColor: null, accessRole: "reader", primary: false, writable: false }
    ]);
    mocks.selectGoogleCalendar.mockResolvedValue(undefined);
    render(<SettingsCalendarConnectionsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Kalender wählen/ }));
    await waitFor(() => expect(mocks.loadGoogleCalendars).toHaveBeenCalledWith(1));
    const chooseButton = await screen.findByRole("button", { name: /Mein Kalender/ });
    fireEvent.click(chooseButton);
    await waitFor(() => expect(mocks.selectGoogleCalendar).toHaveBeenCalledWith(1, "primary-cal"));
  });
});
