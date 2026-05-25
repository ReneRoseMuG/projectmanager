// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte SettingsCatalogsPage mit echter TabBar; CatalogManager wird als Inhaltsadapter abgegrenzt.
 *
 * Mock-Entscheidung:
 * - Unit-Mocks für CatalogManager und useCatalogs, damit die Tab-Navigation isoliert geprüft wird.
 *
 * Isolation:
 * - jsdom ohne API-, Datenbank- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - Kataloge rendern als Detail-Page mit TabBar pro Katalogtyp.
 * - Hero-Counter werden als einfacher Text ohne Badge-Rahmen dargestellt.
 * - Ein Tabwechsel zeigt den passenden CatalogManager-Inhalt.
 *
 * Fehlerfälle:
 * - Die Katalogseite darf nicht ohne Detail-Hero oder ohne Katalog-Tabs rendern.
 *
 * Ziel:
 * Die neue Katalog-Tab-Navigation auf Admin-Detailseiten absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { CatalogKind } from "@taskmanager/shared-types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsCatalogsPage } from "../../../../apps/web/src/pages/SettingsCatalogsPage";

vi.mock("../../../../apps/web/src/components/settings/CatalogManager", () => ({
  catalogGroups: [
    { kind: "workStatus", title: "Status: Arbeit", createLabel: "Neu" },
    { kind: "featureStatus", title: "Status: Feature", createLabel: "Neu" },
    { kind: "priority", title: "Prioritäten", createLabel: "Neu" },
    { kind: "ticketType", title: "Ticket-Typen", createLabel: "Neu" },
  ],
  CatalogManager: ({ activeKind }: { activeKind?: CatalogKind }) => (
    <div data-testid="catalog-manager">{activeKind}</div>
  ),
}));

vi.mock("../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs: () => ({
    entries: [
      { id: 1, kind: "workStatus" },
      { id: 2, kind: "priority" },
      { id: 3, kind: "priority" },
    ],
  }),
}));

afterEach(() => {
  cleanup();
});

describe("SettingsCatalogsPage", () => {
  it("rendert Detail-Hero und wechselt Katalog-Tabs", () => {
    render(<SettingsCatalogsPage />);

    expect(screen.getByTestId("page-hero")).toHaveAttribute("data-variant", "detail");
    expect(screen.getByText("3 Einträge")).toHaveClass("text-sm", "text-white/70");
    expect(screen.getByText("3 Einträge")).not.toHaveClass("border", "bg-white/10", "rounded-md");
    expect(screen.getByRole("button", { name: /^Arbeitsstatus\s+1$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Prioritäten\s+2$/ })).toBeInTheDocument();
    expect(screen.getByTestId("catalog-manager")).toHaveTextContent("workStatus");

    fireEvent.click(screen.getByRole("button", { name: /^Prioritäten\s+2$/ }));

    expect(screen.getByTestId("catalog-manager")).toHaveTextContent("priority");
  });
});
