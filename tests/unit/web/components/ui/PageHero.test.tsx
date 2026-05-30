// @vitest-environment jsdom

/**
 * Test Scope:
 * PageHero
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte React-Komponente ohne API-, DB- oder Dateisystemzugriff.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; Aktionen werden als echte Buttons gerendert.
 *
 * Isolation:
 * - jsdom-DOM pro Test.
 *
 * Abgedeckte Regeln:
 * - Listen- und Detailvarianten verwenden denselben Hero-Höhen- und Farbmechanismus.
 * - Detail-Hero rendert Breadcrumb, Icon, Meta und Actions in der Sonderzone.
 *
 * Fehlerfälle:
 * - Modal-Verbraucher können die feste Höhe deaktivieren.
 *
 * Ziel:
 * Die wiederverwendbare Seitenkopf-Basiskomponente gegen Layout-Regressionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PageHero } from "../../../../../apps/web/src/components/ui/PageHero";

afterEach(() => {
  cleanup();
});

describe("PageHero", () => {
  it("rendert die Listenvariante mit fixer Hero-Höhe und Actions", () => {
    render(
      <PageHero
        variant="list"
        title="Tickets"
        subtitle="3 Einträge"
        actions={<button type="button">Neu</button>}
      />,
    );

    const hero = screen.getByTestId("page-hero");

    expect(hero).toHaveAttribute("data-variant", "list");
    expect(hero).toHaveClass("h-[var(--hero-h,128px)]");
    expect(hero).toHaveClass(
      "bg-gradient-to-br",
      "from-steel-700",
      "to-steel-600",
    );
    expect(screen.getByRole("heading", { name: "Tickets" })).toHaveClass(
      "text-2xl",
      "font-bold",
      "text-white",
    );
    expect(screen.getByText("3 Einträge")).toHaveClass("text-white/60");
    expect(screen.getByRole("button", { name: "Neu" })).toBeInTheDocument();
  });

  it("rendert die Detailvariante mit Breadcrumb, Icon, Meta und Actions", () => {
    render(
      <PageHero
        variant="detail"
        title="Projekt anlegen"
        breadcrumb={["Projekte", "Neu"]}
        icon={<span data-testid="hero-icon">P</span>}
        metaPills={<span>Status offen</span>}
        actions={<button type="button">Schließen</button>}
      />,
    );

    const hero = screen.getByTestId("page-hero");

    expect(hero).toHaveAttribute("data-variant", "detail");
    expect(hero).toHaveClass("h-[var(--hero-h,128px)]");
    expect(screen.getByText("Projekte")).toBeInTheDocument();
    expect(screen.getByText("Neu")).toBeInTheDocument();
    expect(screen.getByTestId("hero-icon")).toBeInTheDocument();
    expect(screen.getByText("Status offen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schließen" })).toBeInTheDocument();
  });

  it("kann die fixe Höhe für Modal-Varianten deaktivieren", () => {
    render(<PageHero variant="detail" title="Ticket" fixedHeight={false} />);

    expect(screen.getByTestId("page-hero")).not.toHaveClass(
      "h-[var(--hero-h,128px)]",
    );
  });
});
