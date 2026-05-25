// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit, jsdom mit echter StartPage und MemoryRouter.
 *
 * Realitätsgrad:
 * - Echte Permission-Entscheidung über Hook-Double; Dashboard-Kind als Komponenten-Double.
 *
 * Mock-Entscheidung:
 * - Schwere Dashboard-Komponente wird isoliert, weil diese Datei die Seitenverdrahtung prüft.
 *
 * Isolation:
 * - Keine DB- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - Die Startseite rendert das Home-Dashboard.
 * - Ohne dashboards:read wird ein Forbidden-Zustand angezeigt.
 *
 * Fehlerfälle:
 * - Ungeschützter Root-Zugriff und fehlendes Startseiten-Dashboard.
 *
 * Ziel:
 * Die Root-Seite gegen Permission- und Render-Regressions absichern.
 */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StartPage } from "../../../../apps/web/src/pages/StartPage";

const testState = vi.hoisted(() => ({
  permissions: {
    dashboards: true,
  } as Record<string, boolean>,
}));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission(resource: string) {
    return testState.permissions[resource] ?? false;
  },
}));

vi.mock("../../../../apps/web/src/components/dashboard/DashboardView", () => ({
  HomeDashboard({ hideInlineHeader }: { hideInlineHeader?: boolean }) {
    return <div data-testid="home-dashboard" data-hide-inline-header={String(Boolean(hideInlineHeader))} />;
  },
}));

function renderStartPage() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <StartPage />
    </MemoryRouter>,
  );
}

describe("StartPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(testState.permissions, {
      dashboards: true,
    });
  });

  it("rendert das Home-Dashboard ohne alte Kalender-Vorschau", () => {
    renderStartPage();

    expect(screen.getByRole("heading", { name: "Startseite" })).toBeInTheDocument();
    expect(screen.getByTestId("home-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("home-dashboard")).toHaveAttribute("data-hide-inline-header", "true");
    expect(screen.queryByText("Startseiten-Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByTestId("start-calendar-preview")).not.toBeInTheDocument();
    expect(screen.queryByTestId("start-dashboard-section")).not.toBeInTheDocument();
  });

  it("zeigt ohne Dashboard-Leserecht den Forbidden-Zustand", () => {
    testState.permissions.dashboards = false;

    renderStartPage();

    expect(screen.getByText("403")).toBeInTheDocument();
    expect(screen.queryByTestId("home-dashboard")).not.toBeInTheDocument();
  });
});
