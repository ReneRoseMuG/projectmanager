/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ProjectFeaturePanel zeigt ausschließlich bereits verknüpfte Projekt-Features als Board oder Liste.
 * - Board-Karten bleiben über Breiten-Schutzklassen innerhalb ihrer Statusspalten.
 *
 * Fehlerfälle:
 * - Der Projekt-Features-Tab darf keine Checkbox-Auswahl und keinen Speichern-Flow für Relationen anbieten.
 * - Leere Projekt-Feature-Ergebnisse müssen einen EmptyState anzeigen.
 *
 * Ziel:
 * Die wiederhergestellte Projekt-Feature-Ergebnisansicht gegen Regressionen zurück zum RelationPanel absichern.
 */
import type { Feature } from "@taskmanager/shared-types";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ViewMode } from "../../../../../apps/web/src/types";
import { ProjectFeaturePanel } from "../../../../../apps/web/src/components/features/ProjectFeaturePanel";
import {
  buildFeature,
  buildFeatureSet,
} from "../../../../fixtures/web/components/ui/factories";

vi.mock("../../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    return {
      entries: [],
      workStatuses: [],
      featureStatuses: [],
      priorities: [],
      loading: false,
      error: null,
      reload: async () => undefined,
      createEntry: async () => undefined,
      updateEntry: async () => undefined,
      deleteEntry: async () => undefined,
    };
  },
}));

function renderProjectFeaturePanel({
  features = buildFeatureSet(),
  viewMode = "kanban",
  onViewModeChange = vi.fn(),
  onCreate = vi.fn(),
  onOpen = vi.fn(),
}: {
  features?: Feature[];
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onCreate?: () => void;
  onOpen?: (feature: Feature) => void;
} = {}) {
  return render(
    <ProjectFeaturePanel
      features={features}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      onCreate={onCreate}
      onOpen={onOpen}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe("ProjectFeaturePanel", () => {
  it("zeigt verknüpfte Projekt-Features im Board nach Statusspalten", () => {
    const features = buildFeatureSet();
    const { container } = renderProjectFeaturePanel({ features });

    expect(screen.getByPlaceholderText("Suchen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kanban" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Neues Feature" }),
    ).toBeInTheDocument();

    const columns = container.querySelectorAll("section.rounded-lg");
    expect(columns).toHaveLength(4);
    expect(
      screen.getByRole("heading", { name: "Entwurf" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Aktiv" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Erledigt" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Archiviert" }),
    ).toBeInTheDocument();

    const activeColumn = screen
      .getByRole("heading", { name: "Aktiv" })
      .closest("section");
    expect(activeColumn).toContainElement(screen.getByText("Feature Aktiv"));
    const archivedColumn = screen
      .getByRole("heading", { name: "Archiviert" })
      .closest("section");
    expect(archivedColumn).toContainElement(
      screen.getByText("Feature Archiviert"),
    );
  });

  it("begrenzt Board-Karten auf die Breite ihrer Statusspalten", () => {
    const { container } = renderProjectFeaturePanel();

    const columns = container.querySelectorAll("section.rounded-lg");
    columns.forEach((column) => {
      expect(column).toHaveClass("min-w-0");
    });

    const cards = container.querySelectorAll("article.rounded-2xl");
    expect(cards).toHaveLength(4);
    cards.forEach((card) => {
      expect(card).toHaveClass("min-w-0");
      expect(card).toHaveClass("max-w-full");
      expect(card).toHaveClass("overflow-visible");
      expect(card).not.toHaveClass("overflow-hidden");
    });
  });

  it("bietet keine projektseitige Relation-Auswahl oder Speichern-Aktion an", () => {
    const { container } = renderProjectFeaturePanel();

    expect(
      container.querySelector('input[type="checkbox"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Speichern" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/verknüpft/i)).not.toBeInTheDocument();
  });

  it("rendert den Listenmodus als Ergebniszeilen und öffnet Features", () => {
    const features = buildFeatureSet();
    const onOpen = vi.fn();
    const { container } = renderProjectFeaturePanel({
      features,
      viewMode: "list",
      onOpen,
    });

    expect(container.querySelector("table")).not.toBeInTheDocument();
    const rows = container.querySelectorAll("article.rounded-xl");
    expect(rows).toHaveLength(features.length);
    features.forEach((feature) => {
      expect(screen.getByText(feature.title)).toBeInTheDocument();
    });

    const activeRow = screen.getByText("Feature Aktiv").closest("article");
    expect(activeRow).toBeInTheDocument();
    expect(activeRow?.querySelector(".w-52")).toBeInTheDocument();
    expect(
      within(activeRow as HTMLElement).getByRole("button", {
        name: "Aktionen",
      }),
    ).toBeInTheDocument();
    fireEvent.click(activeRow as HTMLElement);

    expect(onOpen).toHaveBeenCalledWith(features[1]);
  });

  it("rendert fehlende Feature-Metadaten ohne undefined-Ausgabe", () => {
    const feature = buildFeature({
      id: 99,
      title: "Feature ohne Metadaten",
      useCaseCount: undefined as unknown as number,
    });

    renderProjectFeaturePanel({ features: [feature], viewMode: "list" });

    const row = screen.getByText("Feature ohne Metadaten").closest("article");
    expect(row).toBeInTheDocument();
    expect(
      within(row as HTMLElement).getByText("0 Use Cases"),
    ).toBeInTheDocument();
    expect(row).not.toHaveTextContent("undefined");
  });

  it("meldet Moduswechsel über Callback", () => {
    const onViewModeChange = vi.fn();
    renderProjectFeaturePanel({ onViewModeChange });

    fireEvent.click(screen.getByRole("button", { name: "Liste" }));

    expect(onViewModeChange).toHaveBeenCalledWith("list");
  });

  it("zeigt EmptyState wenn keine Features verknüpft sind", () => {
    const { container } = renderProjectFeaturePanel({ features: [] });

    expect(screen.getByText("Keine Features")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Neues Feature" }),
    ).toHaveLength(1);
    expect(
      container.querySelector("article.rounded-xl"),
    ).not.toBeInTheDocument();
    expect(container.querySelector("table")).not.toBeInTheDocument();
  });
});
