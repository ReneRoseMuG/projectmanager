// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Für jeden Haupt-Navigationseintrag existiert ein In-neuem-Tab-Button.
 * - Klick ruft window.open(path, "_blank") auf.
 * - Klick löst keine Router-Navigation im aktuellen Tab aus.
 *
 * Fehlerfälle:
 * - NavLink-Klick darf window.open nicht aufrufen.
 *
 * Ziel:
 * Sicherstellen, dass alle Sidebar-Haupteinträge den Tab-Button korrekt rendern.
 */
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../Sidebar";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/projects"]}>
      <Sidebar />
      <LocationProbe />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.spyOn(window, "open").mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Sidebar", () => {
  it("rendert für alle 5 Hauptnavigationseinträge je einen In-neuem-Tab-Button", () => {
    renderSidebar();

    for (const label of ["Projekte", "Tickets", "Features", "Wiki", "Kalender"]) {
      expect(screen.getByTitle(`${label} in neuem Tab öffnen`)).toBeInTheDocument();
    }
  });

  it("öffnet Features in einem neuen Tab", () => {
    renderSidebar();

    fireEvent.click(screen.getByTitle("Features in neuem Tab öffnen"));

    expect(window.open).toHaveBeenCalledWith("/features", "_blank");
  });

  it("ändert beim Button-Klick nicht die aktuelle Route", () => {
    renderSidebar();

    fireEvent.click(screen.getByTitle("Features in neuem Tab öffnen"));

    expect(screen.getByTestId("location")).toHaveTextContent("/projects");
  });

  it("ruft bei normalem NavLink-Klick window.open nicht auf", () => {
    renderSidebar();

    fireEvent.click(screen.getByText("Features"));

    expect(window.open).not.toHaveBeenCalled();
  });
});
