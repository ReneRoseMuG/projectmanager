// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte TagManager-Komponente mit realen DOM-Interaktionen und gemischten Tag-Domänen.
 *
 * Mock-Entscheidung:
 * - useTags liefert bewusst eine ungefilterte Liste, damit die UI-Filterung unabhängig vom Server bewiesen wird.
 *
 * Isolation:
 * - jsdom ohne Datenbank- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - Der Bereichsfilter zeigt ausschließlich Tags der ausgewählten Domäne.
 * - Alle Bereiche zeigt weiterhin PM- und DMS-Tags.
 * - Dokumentzuordnungen fließen in Verwendungsanzeige und Aktivstatus ein.
 *
 * Fehlerfälle:
 * - Tags der jeweils anderen Domäne bleiben trotz ungefilterter Hook-Daten unsichtbar.
 * - Ein DMS-Tag ohne Dokumentzuordnung bleibt verwaist.
 *
 * Ziel:
 * Den Admin-Bereichsfilter gegen ungefilterte oder noch alte Query-Daten absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TagManager } from "../../../../../apps/web/src/components/tags/TagManager";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";

const { useTagsMock } = vi.hoisted(() => ({
  useTagsMock: vi.fn()
}));

vi.mock("../../../../../apps/web/src/hooks/useTags", () => ({
  useTags: useTagsMock
}));

const mixedDomainTags = [
  { id: 1, name: "PM-Tag", color: "#2563eb", domain: "pm", version: 1, usageCounts: { projects: 1, milestones: 0, tasks: 0, tickets: 0, documents: 0 } },
  { id: 2, name: "DMS-Tag", color: "#7c3aed", domain: "dms", version: 1, usageCounts: { projects: 0, milestones: 0, tasks: 0, tickets: 0, documents: 1 } },
  { id: 3, name: "DMS-Verwaist", color: "#64748b", domain: "dms", version: 1, usageCounts: { projects: 0, milestones: 0, tasks: 0, tickets: 0, documents: 0 } }
];

function renderTagManager() {
  return render(
    <ConfirmDialogProvider>
      <ToastProvider>
        <TagManager />
      </ToastProvider>
    </ConfirmDialogProvider>
  );
}

beforeEach(() => {
  useTagsMock.mockReturnValue({
    tags: mixedDomainTags,
    loading: false,
    error: null,
    reload: vi.fn(),
    createTag: vi.fn()
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TagManager — Bereichsfilter", () => {
  it("zeigt für Dokumente nur DMS-Tags und für alle Bereiche beide Domänen", () => {
    renderTagManager();

    expect(screen.getByText("PM-Tag")).toBeInTheDocument();
    expect(screen.getByText("DMS-Tag")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Alle Bereiche"), { target: { value: "dms" } });

    expect(screen.queryByText("PM-Tag")).not.toBeInTheDocument();
    expect(screen.getByText("DMS-Tag")).toBeInTheDocument();
    expect(screen.getByText("DMS-Verwaist")).toBeInTheDocument();
    expect(screen.getByText(/Alle Tags · 2 Einträge/)).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Dokumente"), { target: { value: "all" } });

    expect(screen.getByText("PM-Tag")).toBeInTheDocument();
    expect(screen.getByText("DMS-Tag")).toBeInTheDocument();
    expect(screen.getByText("DMS-Verwaist")).toBeInTheDocument();
    expect(screen.getByText(/Alle Tags · 3 Einträge/)).toBeInTheDocument();
  });

  it("kennzeichnet einen verwendeten DMS-Tag als aktiv und einen ungenutzten als verwaist", () => {
    renderTagManager();

    const activeRow = screen.getByText("DMS-Tag").closest("div");
    const orphanRow = screen.getByText("DMS-Verwaist").closest("div");

    expect(activeRow).not.toBeNull();
    expect(orphanRow).not.toBeNull();
    expect(within(activeRow!).getByText(/1 Dokumente/)).toBeInTheDocument();
    expect(within(activeRow!).getByText("aktiv")).toBeInTheDocument();
    expect(within(orphanRow!).getByText(/0 Dokumente/)).toBeInTheDocument();
    expect(within(orphanRow!).getByText("verwaist")).toBeInTheDocument();
  });
});
