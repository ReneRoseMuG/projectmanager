// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte React-Komponenten mit MemoryRouter, keine API- oder DB-Zugriffe.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; die Router-Position ist der echte Ausgangszustand.
 *
 * Isolation:
 * - jsdom ohne Dateisystem- oder Datenbankzugriff.
 *
 * Abgedeckte Regeln:
 * - Admin-Unterpunkte werden in der dunklen inneren Icon-Sidebar gerendert.
 * - Der aktive Admin-Unterpunkt wird je nach aktuellem Pfad hervorgehoben.
 *
 * Fehlerfälle:
 * - Full-Bleed-Adminseiten dürfen die innere Sidebar nicht mehr überspringen.
 *
 * Ziel:
 * Die Admin-Navigationsumstellung von horizontalen Tabs auf innere Sidebar absichern.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AdminLayout } from "../../../../../apps/web/src/components/layout/AdminLayout";

afterEach(() => {
  cleanup();
});

describe("AdminLayout", () => {
  it("rendert die Admin-Unterpunkte in der inneren Sidebar", () => {
    render(
      <MemoryRouter initialEntries={["/admin/catalogs"]}>
        <AdminLayout>
          <div>Admin-Inhalt</div>
        </AdminLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Admin-Bereich" })).toBeInTheDocument();
    for (const label of ["Kataloge", "Tags", "Sicherung", "Benutzer", "Rollen"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText("Admin-Inhalt")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toHaveClass("uppercase", "text-white/45");
    const activeCatalogLink = screen.getByRole("link", { name: "Kataloge" });
    const activeCatalogIcon = activeCatalogLink.querySelector(".admin-sidebar-icon");
    const inactiveTagsLink = screen.getByRole("link", { name: "Tags" });

    expect(activeCatalogLink).toHaveClass("admin-sidebar-link-active", "bg-white/10", "text-white");
    expect(inactiveTagsLink).toHaveClass("text-white");
    expect(inactiveTagsLink).not.toHaveClass("text-white/70");
    expect(activeCatalogIcon).toHaveClass("admin-sidebar-icon");
  });

  it("rendert die Sidebar auch auf Benutzerseiten", () => {
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <AdminLayout>
          <div>Admin-Inhalt</div>
        </AdminLayout>
      </MemoryRouter>,
    );

    const activeUsersLink = screen.getByRole("link", { name: "Benutzer" });
    const activeUsersIcon = activeUsersLink.querySelector(".admin-sidebar-icon");

    expect(activeUsersLink).toHaveClass("admin-sidebar-link-active", "bg-white/10", "text-white");
    expect(activeUsersIcon).toHaveClass("admin-sidebar-icon");
    expect(screen.getByText("Admin-Inhalt")).toBeInTheDocument();
  });
});
