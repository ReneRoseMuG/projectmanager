/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - BacklogListBoardView rendert Board-Modus ohne Statusspalten als CardGrid und Listenmodus als ItemRows.
 * - Backlog-Karten und -Zeilen zeigen erwartete Controls, Dimensionen, Toolbar und Feature-Badges.
 *
 * Fehlerfälle:
 * - BacklogItems ohne Feature-Zuordnung müssen das Badge "Ohne Feature" anzeigen.
 * - Abgelehnte BacklogItems müssen als Karte gedimmt und durchgestrichen dargestellt werden.
 *
 * Ziel:
 * Die backlog-spezifische ListBoardView-Integration gegen Layout-, Control- und Randfallregressionen absichern.
 */
import type { BacklogItem, BacklogStatus, Feature } from "@taskmanager/shared-types";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BacklogListBoardView } from "../../backlog/BacklogListBoardView";
import { buildBacklogItem, buildFeature } from "./factories";

function buildBacklogItems(): BacklogItem[] {
  return [
    buildBacklogItem({ id: 1, title: "Passwort-Reset", sortOrder: 1 }),
    buildBacklogItem({ id: 2, title: "Mobile Suche", featureId: null, useCaseId: null, sortOrder: 2 })
  ];
}

function renderBacklogList({
  items = buildBacklogItems(),
  features = [buildFeature()],
  statusFilter = "all",
  onStatusFilterChange = vi.fn(),
  onCreate = vi.fn(),
  onEdit = vi.fn(),
  onDelete = vi.fn()
}: {
  items?: BacklogItem[];
  features?: Feature[];
  statusFilter?: BacklogStatus | "all";
  onStatusFilterChange?: (status: BacklogStatus | "all") => void;
  onCreate?: () => void;
  onEdit?: (item: BacklogItem) => void;
  onDelete?: (item: BacklogItem) => void;
} = {}) {
  return render(
    <BacklogListBoardView
      items={items}
      features={features}
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
      onCreate={onCreate}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

function expectToolbar() {
  expect(screen.getByPlaceholderText("Suchen")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Kanban" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Neues Backlog-Item" })).toBeInTheDocument();
}

function expectItemCardClasses(cards: NodeListOf<Element>) {
  expect(cards.length).toBeGreaterThan(0);
  cards.forEach((card) => {
    expect(card).toHaveClass("border");
    expect(card).toHaveClass("bg-white");
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

describe("BacklogListBoardView", () => {
  it("rendert Board-Modus ohne Statusspalten als CardGrid", () => {
    const items = buildBacklogItems();
    const { container } = renderBacklogList({ items });

    expectToolbar();
    fireEvent.click(screen.getByRole("button", { name: "Kanban" }));

    expect(container.querySelector(".lg\\:grid-cols-3")).not.toBeInTheDocument();
    expect(container.querySelector("section.rounded-lg")).not.toBeInTheDocument();
    expect(container.querySelector(".md\\:grid-cols-2.xl\\:grid-cols-3")).toBeInTheDocument();

    const cards = container.querySelectorAll("article.rounded-2xl");
    expect(cards).toHaveLength(items.length);
    expectItemCardClasses(cards);
    expect(screen.getAllByRole("button", { name: "Bearbeiten" })).toHaveLength(items.length);
    expect(screen.getAllByRole("button", { name: "Löschen" })).toHaveLength(items.length);
  });

  it("rendert Listen-Modus mit ItemRows und Row-Controls", () => {
    const items = buildBacklogItems();
    const { container } = renderBacklogList({ items });

    expect(container.querySelector(".lg\\:grid-cols-3")).not.toBeInTheDocument();
    const rows = container.querySelectorAll("article.rounded-xl");
    expect(rows).toHaveLength(items.length);
    expectItemRowClasses(rows);
    items.forEach((item, index) => {
      const row = rows[index] as HTMLElement;
      expect(within(row).getByText(item.title)).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: "Löschen" })).toBeInTheDocument();
    });
  });

  it("wechselt von Board- in Listen-Modus und rendert Rows statt Karten", () => {
    const items = buildBacklogItems();
    const { container } = renderBacklogList({ items });

    fireEvent.click(screen.getByRole("button", { name: "Kanban" }));
    expect(container.querySelectorAll("article.rounded-2xl")).toHaveLength(items.length);

    fireEvent.click(screen.getByRole("button", { name: "Liste" }));
    expect(container.querySelector(".lg\\:grid-cols-3")).not.toBeInTheDocument();
    expect(container.querySelectorAll("article.rounded-xl")).toHaveLength(items.length);
    expect(container.querySelector("article.rounded-2xl")).not.toBeInTheDocument();
  });

  it("zeigt BacklogItems ohne Feature-Zuordnung als Ohne Feature", () => {
    const item = buildBacklogItem({ featureId: null, useCaseId: null, title: "Nicht zugeordnete Idee" });
    renderBacklogList({ items: [item], features: [] });

    expect(screen.getByText("Ohne Feature")).toBeInTheDocument();
  });

  it("markiert abgelehnte Backlog-Karten gedimmt und durchgestrichen", () => {
    const rejectedItem = buildBacklogItem({ title: "Abgelehnte Idee", status: "rejected" });
    const { container } = renderBacklogList({ items: [rejectedItem] });

    fireEvent.click(screen.getByRole("button", { name: "Kanban" }));

    const card = container.querySelector("article.rounded-2xl");
    const title = screen.getByText("Abgelehnte Idee");
    expect(card).toHaveClass("opacity-65");
    expect(title).toHaveClass("line-through");
  });

  it("zeigt EmptyState wenn keine BacklogItems vorhanden sind", () => {
    const { container } = renderBacklogList({ items: [] });

    expect(screen.getByText("Keine Backlog-Items")).toBeInTheDocument();
    expect(container.querySelector("article.rounded-2xl")).not.toBeInTheDocument();
    expect(container.querySelector("article.rounded-xl")).not.toBeInTheDocument();
  });
});
