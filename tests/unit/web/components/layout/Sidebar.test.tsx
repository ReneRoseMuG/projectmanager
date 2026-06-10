// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit, jsdom mit echter React-Komponente und MemoryRouter.
 *
 * Realitätsgrad:
 * - Echte CurrentUser-Fixtures, echte Router-Links, echter localStorage im Test-DOM.
 *
 * Mock-Entscheidung:
 * - window.open und useHealthCheck werden als externe Seiteneffekte isoliert.
 *
 * Isolation:
 * - localStorage wird pro Test geleert, keine DB- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - Für jeden Haupt-Navigationseintrag existiert ein In-neuem-Tab-Button.
 * - Im expanded Zustand ist der In-neuem-Tab-Button als sichtbare Affordanz in die Zeile integriert.
 * - Der Edge-Stil zeigt Header, Sektionen, Suchleiste und User-Block an den vorgesehenen Stellen.
 * - Klick ruft window.open(path?standalone=1, "_blank") auf.
 * - Klick löst keine Router-Navigation im aktuellen Tab aus.
 * - Die Sidebar kann kollabiert werden und persistiert den Zustand in localStorage.
 * - Der kollabierte Zustand zeigt nur Icon-Navigation und keine Section-/User-Texte.
 *
 * Fehlerfälle:
 * - NavLink-Klick darf window.open nicht aufrufen.
 * - Collapsed-State darf nach erneutem Mount nicht verloren gehen.
 *
 * Ziel:
 * Sicherstellen, dass Sidebar-Navigation, Standalone-Buttons und Collapse-State korrekt funktionieren.
 */
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { CurrentUser } from "@taskmanager/shared-types";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../../../../../apps/web/src/components/layout/Sidebar";

vi.mock("../../../../../apps/web/src/hooks/useHealthCheck", () => ({
  useHealthCheck: () => ({
    online: true,
    latencyMs: 12,
    refetch: async () => undefined,
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderSidebar(currentUser?: CurrentUser | null, initialPath = "/projects") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Sidebar currentUser={currentUser} />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
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
    permissions: [{ id: 1, roleId: 1, resource: "*", action: "*" }],
  },
  permissions: [{ id: 1, roleId: 1, resource: "*", action: "*" }],
  requiresPasswordSetup: false,
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
      { id: 3, roleId: 2, resource: "settings", action: "read" },
    ],
  },
  permissions: [
    { id: 2, roleId: 2, resource: "*", action: "read" },
    { id: 3, roleId: 2, resource: "settings", action: "read" },
  ],
  requiresPasswordSetup: false,
};

const projectReaderUser: CurrentUser = {
  ...readerUser,
  role: {
    ...readerUser.role,
    permissions: [{ id: 4, roleId: 2, resource: "projects", action: "read" }],
  },
  permissions: [{ id: 4, roleId: 2, resource: "projects", action: "read" }],
};

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(window, "open").mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("Sidebar", () => {
  it("rendert die Edge-Sidebar mit Header, Sektionen und integrierten Tab-Buttons", () => {
    renderSidebar(readerUser);

    const sidebar = screen.getByText("Projekt Manager").closest("aside");

    expect(sidebar).toHaveClass("sidebar-edge-shell", "w-[240px]");
    expect(sidebar).not.toHaveClass("min-w-60");
    expect(screen.getByText("Lokal")).toBeInTheDocument();
    expect(screen.queryByTitle("Aktualisieren")).not.toBeInTheDocument();
    const navigation = screen.getByRole("navigation", {
      name: "Navigationsbereiche",
    });

    expect(navigation).toHaveClass("overflow-y-auto");

    for (const section of [
      "Start",
      "Projekt Management",
      "Projekt Dokumentation",
      "Information",
      "Einstellungen",
    ]) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }

    for (const label of [
      "Startseite",
      "Projekte",
      "Meilensteine",
      "Aufgaben",
      "Tickets",
      "Features",
      "Wiki",
      "Kalender",
      "Journal",
    ]) {
      expect(
        screen.getByTitle(`${label} in neuem Tab öffnen`),
      ).toBeInTheDocument();
    }

    const featuresLink = screen.getByText("Features").closest("a");
    const featuresTabButton = screen.getByTitle("Features in neuem Tab öffnen");
    const projectsLink = screen.getByText("Projekte").closest("a");

    expect(featuresLink).toHaveClass("sidebar-edge-nav-row");
    expect(projectsLink).toHaveClass(
      "sidebar-edge-nav-row",
      "sidebar-edge-nav-row-active",
    );
    expect(featuresTabButton).toHaveClass("sidebar-edge-external");
    expect(featuresTabButton).not.toHaveClass("opacity-0");
    expect(featuresTabButton.closest("a")).toBe(featuresLink);
    expect(screen.getByTestId("sidebar-global-search")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Alles durchsuchen")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-user")).toHaveTextContent("Reader, Test");
    expect(
      screen.queryByTitle("Meine Einstellungen in neuem Tab öffnen"),
    ).not.toBeInTheDocument();
  });

  it("öffnet Features in einem neuen Standalone-Tab", () => {
    renderSidebar(readerUser);

    fireEvent.click(screen.getByTitle("Features in neuem Tab öffnen"));

    expect(window.open).toHaveBeenCalledWith(
      "/features?standalone=1",
      "_blank",
    );
  });

  it("öffnet die Startseite in einem neuen Standalone-Tab", () => {
    renderSidebar(readerUser);

    fireEvent.click(screen.getByTitle("Startseite in neuem Tab öffnen"));

    expect(window.open).toHaveBeenCalledWith(
      "/?standalone=1",
      "_blank",
    );
  });

  it("markiert die Startseite nur auf der Root-Route aktiv", () => {
    renderSidebar(readerUser, "/");

    const startLink = screen.getByText("Startseite").closest("a");
    const projectsLink = screen.getByText("Projekte").closest("a");

    expect(startLink).toHaveClass("sidebar-edge-nav-row-active");
    expect(projectsLink).not.toHaveClass("sidebar-edge-nav-row-active");
  });

  it("blendet die Startseite ohne Dashboard-Leserecht aus", () => {
    renderSidebar(projectReaderUser);

    expect(screen.queryByText("Startseite")).not.toBeInTheDocument();
    expect(screen.getByText("Projekte")).toBeInTheDocument();
  });

  it("ändert beim Button-Klick nicht die aktuelle Route", () => {
    renderSidebar(readerUser);

    fireEvent.click(screen.getByTitle("Features in neuem Tab öffnen"));

    expect(screen.getByTestId("location")).toHaveTextContent("/projects");
  });

  it("kollabiert und öffnet die Sidebar per Toggle und persistiert den Zustand", () => {
    renderSidebar(readerUser);

    const sidebar = screen.getByLabelText("Hauptnavigation");
    const sidebarHeader = screen.getByTestId("sidebar-header");
    const globalSearch = screen.getByTestId("sidebar-global-search");
    const settingsTitle = screen.getByText("Einstellungen");
    const settingsLink = screen.getByText("Meine Einstellungen");

    expect(sidebar).toHaveClass("w-[240px]");
    expect(sidebar).not.toHaveClass("min-w-60");
    expect(sidebarHeader).toHaveTextContent("Projekt Manager");
    expect(globalSearch).toHaveClass("px-3", "py-2");
    expect(
      sidebarHeader.compareDocumentPosition(globalSearch) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      settingsTitle.compareDocumentPosition(globalSearch) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      globalSearch.compareDocumentPosition(settingsLink) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByPlaceholderText("Alles durchsuchen")).toBeInTheDocument();
    expect(screen.getByTitle("Navigation einklappen")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Navigation einklappen"));

    expect(sidebar).toHaveClass("w-16");
    expect(window.localStorage.getItem("ui.sidebar.collapsed")).toBe("true");
    expect(screen.getByTitle("Navigation aufklappen")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Navigation aufklappen"));

    expect(sidebar).toHaveClass("w-[240px]");
    expect(sidebar).not.toHaveClass("min-w-60");
    expect(window.localStorage.getItem("ui.sidebar.collapsed")).toBe("false");
    expect(screen.getByTitle("Navigation einklappen")).toBeInTheDocument();
  });

  it("liest den initialen collapsed Zustand aus localStorage", () => {
    window.localStorage.setItem("ui.sidebar.collapsed", "true");

    renderSidebar(readerUser);

    expect(screen.getByLabelText("Hauptnavigation")).toHaveClass("w-16");
    expect(screen.getByTitle("Navigation aufklappen")).toBeInTheDocument();
    expect(screen.queryByText("Projekt Management")).not.toBeInTheDocument();
    expect(screen.queryByText("Start")).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Alles durchsuchen"),
    ).not.toBeInTheDocument();
  });

  it("zeigt im collapsed Zustand Icons und permanente Standalone-Badges ohne Labels", () => {
    renderSidebar(readerUser);

    fireEvent.click(screen.getByTitle("Navigation einklappen"));

    expect(screen.queryByText("Projekt Management")).not.toBeInTheDocument();
    expect(screen.queryByText("Projekt Dokumentation")).not.toBeInTheDocument();
    expect(screen.queryByText("Information")).not.toBeInTheDocument();
    expect(screen.queryByText("Start")).not.toBeInTheDocument();
    expect(screen.queryByText("Einstellungen")).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Alles durchsuchen"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Features")).not.toBeInTheDocument();
    const featureLink = screen.getByTitle("Features");
    expect(featureLink).toBeInTheDocument();
    expect(featureLink.querySelector("svg")).toHaveAttribute("width", "16");
    expect(featureLink.querySelector("svg")).toHaveAttribute("height", "16");

    const standaloneButton = screen.getByTitle("Features in neuem Tab öffnen");

    expect(standaloneButton).toHaveClass("h-4", "w-4", "bg-steel-600");
    expect(standaloneButton).not.toHaveClass("opacity-0");

    fireEvent.click(standaloneButton);

    expect(window.open).toHaveBeenCalledWith(
      "/features?standalone=1",
      "_blank",
    );
    expect(screen.getByTestId("location")).toHaveTextContent("/projects");
  });

  it("blendet im collapsed Zustand User-Details aus und behält den Logout-Button", () => {
    renderSidebar(readerUser);

    fireEvent.click(screen.getByTitle("Navigation einklappen"));

    expect(screen.queryByText("Reader, Test")).not.toBeInTheDocument();
    expect(screen.queryByText("Leser")).not.toBeInTheDocument();
    expect(screen.queryByText("Abmelden")).not.toBeInTheDocument();
    expect(screen.getByTitle("Abmelden")).toBeInTheDocument();
  });

  it("ruft bei normalem NavLink-Klick window.open nicht auf", () => {
    renderSidebar(readerUser);

    fireEvent.click(screen.getByText("Features"));

    expect(window.open).not.toHaveBeenCalled();
  });

  it("zeigt für Admins den Administrationseinstieg statt einzelner Admin-Unterpunkte", () => {
    renderSidebar(adminUser);

    expect(screen.getByText("Administration")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-server-status")).toHaveTextContent("Server Status");
    expect(screen.getByTestId("sidebar-server-status")).toHaveTextContent("erreichbar");
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
