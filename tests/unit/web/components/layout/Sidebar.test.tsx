// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Für jeden Haupt-Navigationseintrag existiert ein In-neuem-Tab-Button.
 * - Klick ruft window.open(path?standalone=1, "_blank") auf.
 * - Klick löst keine Router-Navigation im aktuellen Tab aus.
 *
 * Fehlerfälle:
 * - NavLink-Klick darf window.open nicht aufrufen.
 *
 * Ziel:
 * Sicherstellen, dass alle Sidebar-Haupteinträge den Tab-Button korrekt rendern.
 */
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { CurrentUser } from "@taskmanager/shared-types";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../../../../../apps/web/src/components/layout/Sidebar";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderSidebar(currentUser?: CurrentUser | null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/projects"]}>
        <Sidebar currentUser={currentUser} />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const adminUser: CurrentUser = {
  id: 1,
  firstName: "Test",
  lastName: "Admin",
  fullName: "Admin, Test",
  email: "admin@local",
  role: {
    id: 1,
    key: "admin",
    label: "Administrator",
    isSystem: true,
    version: 1,
    createdAt: "2026-05-20T00:00:00",
    updatedAt: "2026-05-20T00:00:00",
    permissions: [{ id: 1, roleId: 1, resource: "*", action: "*" }]
  },
  permissions: [{ id: 1, roleId: 1, resource: "*", action: "*" }],
  requiresPasswordSetup: false
};

const readerUser: CurrentUser = {
  id: 2,
  firstName: "Test",
  lastName: "Reader",
  fullName: "Reader, Test",
  email: "reader@local",
  role: {
    id: 2,
    key: "reader",
    label: "Leser",
    isSystem: false,
    version: 1,
    createdAt: "2026-05-20T00:00:00",
    updatedAt: "2026-05-20T00:00:00",
    permissions: [
      { id: 2, roleId: 2, resource: "*", action: "read" },
      { id: 3, roleId: 2, resource: "settings", action: "read" }
    ]
  },
  permissions: [
    { id: 2, roleId: 2, resource: "*", action: "read" },
    { id: 3, roleId: 2, resource: "settings", action: "read" }
  ],
  requiresPasswordSetup: false
};

beforeEach(() => {
  vi.spyOn(window, "open").mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Sidebar", () => {
  it("rendert die gruppierte Navigation mit Tab-Buttons für Hauptansichten", () => {
    renderSidebar(readerUser);

    expect(screen.getByText("Projekt Manager").closest("aside")).toHaveClass("overflow-y-auto");
    expect(screen.queryByText("Lokal")).not.toBeInTheDocument();

    for (const section of ["Projekt Management", "Projekt Dokumentation", "Information", "Einstellungen"]) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }

    for (const label of ["Projekte", "Meilensteine", "Aufgaben", "Tickets", "Features", "Wiki", "Kalender", "Journal"]) {
      expect(screen.getByTitle(`${label} in neuem Tab öffnen`)).toBeInTheDocument();
    }

    expect(screen.queryByTitle("Meine Einstellungen in neuem Tab öffnen")).not.toBeInTheDocument();
  });

  it("öffnet Features in einem neuen Standalone-Tab", () => {
    renderSidebar(readerUser);

    fireEvent.click(screen.getByTitle("Features in neuem Tab öffnen"));

    expect(window.open).toHaveBeenCalledWith("/features?standalone=1", "_blank");
  });

  it("ändert beim Button-Klick nicht die aktuelle Route", () => {
    renderSidebar(readerUser);

    fireEvent.click(screen.getByTitle("Features in neuem Tab öffnen"));

    expect(screen.getByTestId("location")).toHaveTextContent("/projects");
  });

  it("ruft bei normalem NavLink-Klick window.open nicht auf", () => {
    renderSidebar(readerUser);

    fireEvent.click(screen.getByText("Features"));

    expect(window.open).not.toHaveBeenCalled();
  });

  it("zeigt für Admins den Administrationseinstieg statt einzelner Admin-Unterpunkte", () => {
    renderSidebar(adminUser);

    expect(screen.getByText("Administration")).toBeInTheDocument();
    expect(screen.queryByText("Meine Einstellungen")).not.toBeInTheDocument();
    expect(screen.queryByText("Benutzer")).not.toBeInTheDocument();
    expect(screen.queryByText("Rollen")).not.toBeInTheDocument();
    expect(screen.getByText("Journal")).toBeInTheDocument();
  });

  it("zeigt für Nicht-Admins Meine Einstellungen", () => {
    renderSidebar(readerUser);

    expect(screen.getByText("Meine Einstellungen")).toBeInTheDocument();
    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
  });
});
