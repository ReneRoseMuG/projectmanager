// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit, jsdom mit echter DashboardPage und echter Segment-Umschaltung.
 *
 * Realitätsgrad:
 * - Echte React-Interaktion; Dashboard-Inhalte als Komponenten-Doubles ohne API-Zugriff.
 *
 * Mock-Entscheidung:
 * - Dashboard-Unterkomponenten werden isoliert, weil hier nur die Kontext-Umschaltung der Seite geprüft wird.
 *
 * Isolation:
 * - Keine DB- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - Der Dashboard-Editor startet mit dem globalen Dashboard.
 * - Die Umschaltung auf Startseite rendert das Home-Dashboard.
 *
 * Fehlerfälle:
 * - Falscher Standard-Kontext und nicht verdrahtete Startseiten-Umschaltung.
 *
 * Ziel:
 * Sicherstellen, dass /dashboard beide bearbeitbaren Dashboard-Kontexte anbietet.
 */

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../../../../apps/web/src/pages/DashboardPage";

vi.mock("../../../../apps/web/src/components/dashboard/DashboardView", () => ({
  GlobalDashboard({ showHeader }: { showHeader?: boolean }) {
    return <div data-show-header={String(showHeader)} data-testid="global-dashboard" />;
  },
  HomeDashboard() {
    return <div data-testid="home-dashboard" />;
  },
}));

describe("DashboardPage", () => {
  it("schaltet vom globalen Dashboard auf das Startseiten-Dashboard", () => {
    render(<DashboardPage />);

    expect(screen.getByTestId("global-dashboard")).toHaveAttribute("data-show-header", "false");
    expect(screen.queryByTestId("home-dashboard")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Startseite" }));

    expect(screen.getByTestId("home-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("global-dashboard")).not.toBeInTheDocument();
  });
});
