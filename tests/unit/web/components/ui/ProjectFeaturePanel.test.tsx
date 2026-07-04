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
  onStatusChange,
}: {
  features?: Feature[];
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onCreate?: () => void;
  onOpen?: (feature: Feature) => void;
  onStatusChange?: (
    feature: Feature,
    status: Feature["status"],
  ) => void | Promise<unknown>;
} = {}) {
  return render(
    <ProjectFeaturePanel
      features={features}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      onCreate={onCreate}
      onOpen={onOpen}
      onStatusChange={onStatusChange}
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
    const addButton = screen.getByRole("button", { name: "Neues Feature" });
    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveTextContent("");

    // Board-Redesign: Nur die offenen Feature-Status (Entwurf, Aktiv) sind reguläre
    // `section.rounded-lg`; die geschlossenen (Erledigt, Archiviert) wandern in die
    // ClosedBoardSidebar (<aside>) und haben keine Section-Überschrift mehr.
    const columns = container.querySelectorAll("section.rounded-lg");
    expect(columns).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "Entwurf" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Aktiv" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Erledigt" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Archiviert" }),
    ).not.toBeInTheDocument();

    const activeColumn = screen
      .getByRole("heading", { name: "Aktiv" })
      .closest("section");
    expect(activeColumn).toContainElement(screen.getByText("Feature Aktiv"));

    // Geschlossene Features erscheinen in der Sidebar, nicht in einer Board-Spalte.
    const closedSidebar = container.querySelector("aside") as HTMLElement;
    expect(closedSidebar).toBeInTheDocument();
    expect(
      within(closedSidebar).getByText("Feature Erledigt"),
    ).toBeInTheDocument();
    expect(
      within(closedSidebar).getByText("Feature Archiviert"),
    ).toBeInTheDocument();
  });

  it("begrenzt Board-Karten auf die Breite ihrer Statusspalten", () => {
    const { container } = renderProjectFeaturePanel();

    const columns = container.querySelectorAll("section.rounded-lg");
    columns.forEach((column) => {
      expect(column).toHaveClass("min-w-0");
    });

    // Nur die offenen Features (Entwurf, Aktiv) werden als Board-Karten (article.p-5)
    // gerendert; die geschlossenen liegen als Zeilen in der ClosedBoardSidebar.
    const cards = container.querySelectorAll("article.p-5");
    expect(cards).toHaveLength(2);
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
    const rows = container.querySelectorAll("article[class*='border-l-[4px]']");
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
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.doubleClick(activeRow as HTMLElement);

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

  it("aktiviert Drag-and-Drop für Statuswechsel wenn ein Handler übergeben wird", () => {
    const onStatusChange = vi.fn();
    const { container } = renderProjectFeaturePanel({ onStatusChange });

    expect(container.querySelector("[data-dnd-enabled='true']")).toBeInTheDocument();
    // Nur Karten in offenen Board-Spalten sind draggable; geschlossene Features liegen
    // in der ClosedBoardSidebar und nehmen nicht am Drag-and-Drop teil. Von den vier
    // Features (buildFeatureSet) sind zwei offen (Entwurf, Aktiv).
    const openFeatureCount = buildFeatureSet().filter(
      (feature) => feature.status === "draft" || feature.status === "active",
    ).length;
    expect(container.querySelectorAll("[data-dnd-draggable='true']")).toHaveLength(
      openFeatureCount,
    );
  });

  it("zeigt EmptyState wenn keine Features verknüpft sind", () => {
    const { container } = renderProjectFeaturePanel({ features: [] });

    expect(screen.getByText("Keine Features")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Neues Feature" }),
    ).toHaveLength(1);
    expect(
      container.querySelector("article[class*='border-l-[4px]']"),
    ).not.toBeInTheDocument();
    expect(container.querySelector("table")).not.toBeInTheDocument();
  });

  it("filtert die Suche ausschließlich nach Feature-Titel", () => {
    const features = [
      buildFeature({
        id: 1,
        title: "Suchnadel Projektfeature",
        description: "Beschreibung ohne Treffer",
        useCaseCount: 1,
      }),
      buildFeature({
        id: 2,
        title: "Beschreibungstreffer Projektfeature",
        description: "Suchnadel steht nur in der Beschreibung",
        useCaseCount: 1,
      }),
      buildFeature({
        id: 3,
        title: "Counttreffer Projektfeature",
        description: "Beschreibung ohne Treffer",
        useCaseCount: 999,
      }),
    ];
    renderProjectFeaturePanel({ features });

    fireEvent.change(screen.getByPlaceholderText("Suchen"), {
      target: { value: "  suchNADEL  " },
    });

    expect(screen.getByText("Suchnadel Projektfeature")).toBeInTheDocument();
    expect(screen.queryByText("Beschreibungstreffer Projektfeature")).not.toBeInTheDocument();
    expect(screen.queryByText("Counttreffer Projektfeature")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Suchen"), {
      target: { value: "" },
    });

    features.forEach((feature) => {
      expect(screen.getByText(feature.title)).toBeInTheDocument();
    });
  });
});
