/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - FeatureListBoardView rendert Statusspalten, Feature-Karten, Toolbar und den kartenbasierten Listenmodus.
 * - FeatureCard nutzt im Board- und Listenmodus ItemCard mit erwarteten Controls, Dimensionen und Routing.
 *
 * Fehlerfälle:
 * - Leere Feature-Listen müssen den EmptyState ohne Karten oder Zeilen anzeigen.
 * - Der Listenmodus darf keine ItemRow erwarten, weil FeatureCard keine Row-Variante besitzt.
 *
 * Ziel:
 * Die featurespezifische ListBoardView-Integration gegen Layout-, Control- und Modusregressionen absichern.
 */
import type { Feature } from "@taskmanager/shared-types";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureListBoardView } from "../../../../../apps/web/src/components/features/FeatureListBoardView";
import { buildFeature, buildFeatureSet } from "../../../../fixtures/web/components/ui/factories";

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

const statusColumns = [
  { value: "draft", label: "Entwurf" },
  { value: "active", label: "Aktiv" },
  { value: "done", label: "Erledigt" },
  { value: "archived", label: "Archiviert" },
] as const;

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderFeatureList({
  features = buildFeatureSet(),
  onCreate = vi.fn(),
  onOpen = vi.fn(),
  onDelete = vi.fn(),
}: {
  features?: Feature[];
  onCreate?: () => void;
  onOpen?: (feature: Feature) => void;
  onDelete?: (feature: Feature) => void;
} = {}) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <FeatureListBoardView
        features={features}
        onCreate={onCreate}
        onOpen={onOpen}
        onDelete={onDelete}
      />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function expectToolbar() {
  expect(screen.getByPlaceholderText("Suchen")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Kanban" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();
  const addButton = screen.getByRole("button", { name: "Neues Feature" });
  expect(addButton).toBeInTheDocument();
  expect(addButton).toHaveTextContent("");
}

function expectItemCardClasses(cards: NodeListOf<Element>) {
  expect(cards.length).toBeGreaterThan(0);
  cards.forEach((card) => {
    expect(card).toHaveClass("border");
    expect(card).toHaveClass("bg-white");
    expect(card).toHaveClass("min-w-0");
    expect(card).toHaveClass("max-w-full");
    expect(card).toHaveClass("p-5");
    expect(card).toHaveClass("shadow-sm");
    expect(
      card.querySelector("span.absolute.inset-x-0.top-0.h-1"),
    ).toBeInTheDocument();
  });
}

afterEach(() => {
  cleanup();
});

describe("FeatureListBoardView", () => {
  it("rendert Board-Modus mit Statusspalten, Karten und Controls", () => {
    const features = buildFeatureSet();
    const onCreate = vi.fn();
    const { container } = renderFeatureList({ features, onCreate });

    expectToolbar();
    expect(container.querySelector(".grid-flow-col")).toBeInTheDocument();

    const columns = container.querySelectorAll("section.rounded-lg");
    expect(columns.length).toBe(statusColumns.length);
    columns.forEach((column) => {
      expect(column).toHaveClass("min-w-0");
    });
    statusColumns.forEach((column) => {
      expect(
        screen.getByRole("heading", { name: column.label }),
      ).toBeInTheDocument();
    });

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

    expectItemCardClasses(container.querySelectorAll("article.rounded-2xl"));
    expect(screen.getAllByRole("button", { name: "Aktionen" })).toHaveLength(
      features.length,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktiv hinzufügen" }));
    expect(onCreate).toHaveBeenCalledWith("active");

    const activeHeader = screen
      .getByRole("heading", { name: "Aktiv" })
      .closest("header");
    expect(activeHeader).toHaveTextContent("1");
  });

  it("öffnet die Feature-Route per Doppelklick auf eine Karte", () => {
    const features = buildFeatureSet();
    const onOpen = vi.fn();
    renderFeatureList({ features, onOpen });

    const card = screen.getByText("Feature Aktiv").closest("article");
    expect(card).toBeInTheDocument();
    fireEvent.click(card as HTMLElement);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.doubleClick(card as HTMLElement);

    expect(onOpen).toHaveBeenCalledWith(features[1]);
  });

  it("wechselt von Board- in Listen-Modus und rendert ItemRows", () => {
    const features = buildFeatureSet();
    const { container } = renderFeatureList({ features });

    expect(container.querySelector(".grid-flow-col")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Liste" }));

    expect(container.querySelector(".grid-flow-col")).not.toBeInTheDocument();
    expect(container.querySelectorAll("article.rounded-2xl")).toHaveLength(features.length);
    expect(container.querySelectorAll("article.rounded-xl")).toHaveLength(features.length);
    features.forEach((feature) => {
      expect(screen.getAllByText(feature.title).length).toBeGreaterThan(0);
    });
  });

  it("zeigt EmptyState wenn keine Features vorhanden sind", () => {
    const { container } = renderFeatureList({ features: [] });

    expect(screen.getByText("Keine Features")).toBeInTheDocument();
    expect(
      container.querySelector("article.rounded-2xl"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector("article.rounded-xl"),
    ).not.toBeInTheDocument();
  });

  it("filtert die Suche ausschließlich nach Feature-Titel", () => {
    const features = [
      buildFeature({
        id: 1,
        title: "Suchnadel Feature",
        description: "Beschreibung ohne Treffer",
        content: "Inhalt ohne Treffer",
      }),
      buildFeature({
        id: 2,
        title: "Beschreibungstreffer Feature",
        description: "Suchnadel steht nur in der Beschreibung",
        content: "Inhalt ohne Treffer",
      }),
      buildFeature({
        id: 3,
        title: "Contenttreffer Feature",
        description: "Beschreibung ohne Treffer",
        content: "Suchnadel steht nur im Content",
      }),
    ];
    renderFeatureList({ features });

    fireEvent.change(screen.getByPlaceholderText("Suchen"), {
      target: { value: "  suchNADEL  " },
    });

    expect(screen.getByText("Suchnadel Feature")).toBeInTheDocument();
    expect(screen.queryByText("Beschreibungstreffer Feature")).not.toBeInTheDocument();
    expect(screen.queryByText("Contenttreffer Feature")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Suchen"), {
      target: { value: "" },
    });

    features.forEach((feature) => {
      expect(screen.getAllByText(feature.title).length).toBeGreaterThan(0);
    });
  });
});
