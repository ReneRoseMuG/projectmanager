/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - UseCaseListBoardView rendert Board-Modus mit katalogbasierten Feature-Statusspalten und Listenmodus als ItemRows.
 * - UseCase-Karten und -Zeilen zeigen erwartete Dimensionen, Toolbar, Doppelklick-Öffnen und Bearbeiten-Controls.
 *
 * Fehlerfälle:
 * - Leere Use-Case-Listen müssen den EmptyState ohne Karten oder Zeilen anzeigen.
 * - Der Board-Modus muss die Feature-Statusspalten aus dem Katalog nutzen.
 *
 * Ziel:
 * Die Use-Case-spezifische ListBoardView-Integration gegen Layout-, Control- und Callback-Regressionen absichern.
 */
import type { UseCase } from "@taskmanager/shared-types";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ViewMode } from "../../../../../apps/web/src/types";
import { UseCaseListBoardView } from "../../../../../apps/web/src/components/usecases/UseCaseListBoardView";
import { buildUseCase } from "../../../../fixtures/web/components/ui/factories";

const featureStatusColumnCount = 4;

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
      deleteEntry: async () => undefined
    };
  }
}));

function buildUseCases(): UseCase[] {
  return [
    buildUseCase({ id: 1, title: "Use Case Anmeldung erfolgreich", sortOrder: 1 }),
    buildUseCase({ id: 2, title: "Use Case Passwort vergessen", slug: "uc-password-reset", sortOrder: 2 })
  ];
}

function renderUseCaseList({
  useCases = buildUseCases(),
  viewMode = "kanban",
  onViewModeChange = vi.fn(),
  onCreate = vi.fn(),
  onOpen = vi.fn()
}: {
  useCases?: UseCase[];
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onCreate?: () => void;
  onOpen?: (useCase: UseCase) => void;
} = {}) {
  return render(
    <MemoryRouter>
      <UseCaseListBoardView useCases={useCases} viewMode={viewMode} onViewModeChange={onViewModeChange} onCreate={onCreate} onOpen={onOpen} />
    </MemoryRouter>
  );
}

function UseCaseHarness({ useCases, onViewModeChange }: { useCases: UseCase[]; onViewModeChange: (viewMode: ViewMode) => void }) {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  return (
    <MemoryRouter>
      <UseCaseListBoardView
        useCases={useCases}
        viewMode={viewMode}
        onViewModeChange={(nextViewMode) => {
          onViewModeChange(nextViewMode);
          setViewMode(nextViewMode);
        }}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
      />
    </MemoryRouter>
  );
}

function expectToolbar() {
  expect(screen.getByPlaceholderText("Suchen")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Kanban" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Neuer Use Case" })).toBeInTheDocument();
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
    expect(card.querySelector("span.absolute.inset-x-0.top-0.h-1")).toBeInTheDocument();
  });
}

function expectItemRowClasses(rows: NodeListOf<Element>) {
  rows.forEach((row) => {
    expect(row).toHaveClass("border-l-[4px]");
    expect(row).toHaveClass("bg-white");
    expect(row).toHaveClass("px-4");
    expect(row).toHaveClass("py-3.5");
    expect(row).toHaveClass("shadow-sm");
    expect(row.getAttribute("style")).toContain("border-left-color");
  });
}

afterEach(() => {
  cleanup();
});

describe("UseCaseListBoardView", () => {
  it("rendert Board-Modus mit Feature-Statusspalten", () => {
    const useCases = buildUseCases();
    const { container } = renderUseCaseList({ useCases });

    expectToolbar();
    expect(container.querySelector(".lg\\:grid-cols-3")).not.toBeInTheDocument();
    expect(container.querySelectorAll("section.rounded-lg")).toHaveLength(featureStatusColumnCount);
    expect(screen.getByRole("heading", { name: "Entwurf" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Aktiv" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Erledigt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Archiviert" })).toBeInTheDocument();
    expect(container.querySelector(".md\\:grid-cols-2.xl\\:grid-cols-3")).not.toBeInTheDocument();

    const cards = container.querySelectorAll("article.rounded-2xl");
    expect(cards).toHaveLength(useCases.length);
    expectItemCardClasses(cards);
    cards.forEach((card) => {
      expect(within(card as HTMLElement).getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Löschen" })).not.toBeInTheDocument();
  });

  it("ruft onOpen per Doppelklick auf eine Karte auf", () => {
    const useCases = buildUseCases();
    const onOpen = vi.fn();
    renderUseCaseList({ useCases, onOpen });

    const card = screen.getByText("Use Case Anmeldung erfolgreich").closest("article");
    expect(card).toBeInTheDocument();
    fireEvent.doubleClick(card as HTMLElement);

    expect(onOpen).toHaveBeenCalledWith(useCases[0]);
  });

  it("rendert Listen-Modus mit ItemRows und Bearbeiten-Controls ohne Delete", () => {
    const useCases = buildUseCases();
    const { container } = renderUseCaseList({ useCases, viewMode: "list" });

    expect(container.querySelector(".lg\\:grid-cols-3")).not.toBeInTheDocument();
    const rows = container.querySelectorAll("article.rounded-xl");
    expect(rows).toHaveLength(useCases.length);
    expectItemRowClasses(rows);
    useCases.forEach((useCase, index) => {
      expect(within(rows[index] as HTMLElement).getByText(useCase.title)).toBeInTheDocument();
      expect(within(rows[index] as HTMLElement).getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Löschen" })).not.toBeInTheDocument();
  });

  it("wechselt von Board- in Listen-Modus und rendert Rows", () => {
    const useCases = buildUseCases();
    const onViewModeChange = vi.fn();
    const { container } = render(<UseCaseHarness useCases={useCases} onViewModeChange={onViewModeChange} />);

    expect(container.querySelectorAll("article.rounded-2xl")).toHaveLength(useCases.length);
    fireEvent.click(screen.getByRole("button", { name: "Liste" }));

    expect(onViewModeChange).toHaveBeenCalledWith("list");
    expect(container.querySelector(".lg\\:grid-cols-3")).not.toBeInTheDocument();
    expect(container.querySelectorAll("article.rounded-xl")).toHaveLength(useCases.length);
  });

  it("zeigt EmptyState wenn keine Use Cases vorhanden sind", () => {
    const { container } = renderUseCaseList({ useCases: [] });

    expect(screen.getByText("Keine Use Cases")).toBeInTheDocument();
    expect(container.querySelector("article.rounded-2xl")).not.toBeInTheDocument();
    expect(container.querySelector("article.rounded-xl")).not.toBeInTheDocument();
  });
});
