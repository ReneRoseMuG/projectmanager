// @vitest-environment jsdom

/**
 * Test Scope:
 * AdminLayout
 *
 * Abgedeckte Regeln:
 * - Admin-Unterpunkte werden als Inline-Navigation der Adminseite gerendert.
 * - Der aktive Admin-Unterpunkt wird visuell hervorgehoben.
 *
 * Fehlerfälle:
 * - Admin-Unterpunkte dürfen nicht aus der Inline-Navigation verschwinden.
 *
 * Ziel:
 * Die neue Admin-Navigationsgruppierung absichern.
 */
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AdminLayout } from "../../../../../apps/web/src/components/layout/AdminLayout";

afterEach(() => {
  cleanup();
});

describe("AdminLayout", () => {
  it("rendert die Admin-Unterpunkte als Inline-Navigation", () => {
    render(
      <MemoryRouter initialEntries={["/admin/catalogs"]}>
        <AdminLayout>
          <div>Admin-Inhalt</div>
        </AdminLayout>
      </MemoryRouter>
    );

    for (const label of ["Kataloge", "Tags", "Sicherung", "Benutzer", "Rollen"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText("Admin-Inhalt")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kataloge" })).toHaveClass("bg-steel-700", "text-white");
  });

  it("lässt Full-Bleed-Adminseiten ihre eigene Navigation rendern", () => {
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <AdminLayout>
          <div>Admin-Inhalt</div>
        </AdminLayout>
      </MemoryRouter>
    );

    expect(screen.queryByRole("link", { name: "Benutzer" })).not.toBeInTheDocument();
    expect(screen.getByText("Admin-Inhalt")).toBeInTheDocument();
  });
});
