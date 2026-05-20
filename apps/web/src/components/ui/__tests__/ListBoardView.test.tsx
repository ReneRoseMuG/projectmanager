// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ListBoardView rendert Board- und Listenmodus, Toolbar-Aktionen und Ladezustand.
 * - ItemCard und ItemRow geben Öffnen-, Bearbeiten- und Löschen-Events korrekt weiter.
 *
 * Fehlerfälle:
 * - Action-Buttons in ItemCard dürfen kein Open-Event auslösen.
 * - Loading darf nicht gleichzeitig den EmptyState anzeigen.
 *
 * Ziel:
 * Die gemeinsame ListBoardView-Infrastruktur gegen Regressionsfehler bei Moduswechsel, Aktionen und Basis-Item-Komponenten absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemCard } from "../ItemCard";
import { ItemRow } from "../ItemRow";
import { ListBoardView, type ListBoardMode } from "../ListBoardView";

interface TestItem {
  id: number;
  title: string;
  description: string;
  status: "todo" | "done";
}

const items: TestItem[] = [
  { id: 1, title: "Alpha", description: "Erste Karte", status: "todo" },
  { id: 2, title: "Beta", description: "Zweite Karte", status: "done" }
];

function renderListBoardView({
  mode = "board",
  viewItems = items,
  loading = false,
  onModeChange = vi.fn(),
  onAdd = vi.fn(),
  onSearchChange = vi.fn()
}: {
  mode?: ListBoardMode;
  viewItems?: TestItem[];
  loading?: boolean;
  onModeChange?: (mode: ListBoardMode) => void;
  onAdd?: () => void;
  onSearchChange?: (value: string) => void;
} = {}) {
  return render(
    <ListBoardView
      items={viewItems}
      mode={mode}
      onModeChange={onModeChange}
      onAdd={onAdd}
      addLabel="Anlegen"
      searchValue=""
      onSearchChange={onSearchChange}
      emptyState={<div>Keine Einträge</div>}
      loading={loading}
      renderCard={(item) => <ItemCard header={<h3>Card {item.title}</h3>} body={<p>{item.description}</p>} />}
      renderRow={(item) => <ItemRow title={`Row ${item.title}`} description={item.description} />}
    />
  );
}

afterEach(() => {
  cleanup();
});

describe("ListBoardView", () => {
  it("rendert Items als Karten im Board-Modus", () => {
    const { container } = renderListBoardView({ mode: "board" });

    expect(screen.getByText("Card Alpha")).toBeInTheDocument();
    expect(screen.getByText("Card Beta")).toBeInTheDocument();
    expect(screen.queryByText("Row Alpha")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("min-h-[max(18rem,calc(100vh-22rem))]");
    expect(container.querySelector(".md\\:grid-cols-2.xl\\:grid-cols-3")).toHaveClass("min-h-full", "min-w-0");
    container.querySelectorAll("article.rounded-2xl").forEach((card) => {
      expect(card).toHaveClass("min-w-0");
      expect(card).toHaveClass("max-w-full");
    });
  });

  it("rendert Items als Zeilen im Listen-Modus", () => {
    renderListBoardView({ mode: "list" });

    expect(screen.getByText("Row Alpha")).toBeInTheDocument();
    expect(screen.getByText("Row Beta")).toBeInTheDocument();
    expect(screen.queryByText("Card Alpha")).not.toBeInTheDocument();
  });

  it("gruppiert Listenmodus nach sortierten Statusspalten", () => {
    const { container } = render(
      <ListBoardView
        items={items}
        mode="list"
        onModeChange={vi.fn()}
        onAdd={vi.fn()}
        statusKey="status"
        statusColumns={[
          { value: "done", label: "Erledigt", sortOrder: 200, isClosed: true },
          { value: "todo", label: "Offen", sortOrder: 100 }
        ]}
        renderCard={(item) => <ItemCard header={<h3>Card {item.title}</h3>} body={<p>{item.description}</p>} />}
        renderRow={(item) => <ItemRow title={`Row ${item.title}`} description={item.description} />}
      />
    );

    const sections = container.querySelectorAll("section.rounded-lg");
    expect(sections).toHaveLength(2);
    expect(within(sections[0] as HTMLElement).getByRole("heading", { name: "Offen" })).toBeInTheDocument();
    expect(within(sections[0] as HTMLElement).getByText("Row Alpha")).toBeInTheDocument();
    expect(sections[0]).toHaveClass("bg-shell/70");
    expect(within(sections[1] as HTMLElement).getByRole("heading", { name: "Erledigt" })).toBeInTheDocument();
    expect(within(sections[1] as HTMLElement).getByText("Row Beta")).toBeInTheDocument();
    expect(sections[1]).toHaveClass("bg-steel-50/80");
  });

  it("ViewToggle wechselt Modus", () => {
    const onModeChange = vi.fn();
    renderListBoardView({ mode: "board", onModeChange });

    fireEvent.click(screen.getByRole("button", { name: "Liste" }));

    expect(onModeChange).toHaveBeenCalledWith("list");
  });

  it("+ Button ruft onAdd auf", () => {
    const onAdd = vi.fn();
    renderListBoardView({ onAdd });

    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("Spalten-Button ruft onAddToColumn mit Status auf", () => {
    const onAddToColumn = vi.fn();
    render(
      <ListBoardView
        items={items}
        mode="board"
        onModeChange={vi.fn()}
        onAdd={vi.fn()}
        onAddToColumn={onAddToColumn}
        addLabel="Anlegen"
        statusKey="status"
        statusColumns={[
          { value: "todo", label: "Offen" },
          { value: "done", label: "Erledigt" }
        ]}
        renderCard={(item) => <ItemCard header={<h3>Card {item.title}</h3>} body={<p>{item.description}</p>} />}
        renderRow={(item) => <ItemRow title={`Row ${item.title}`} description={item.description} />}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Offen hinzufügen" }));

    screen.getAllByRole("heading").forEach((heading) => {
      expect(heading.closest("section")).toHaveClass("min-w-0");
    });

    expect(onAddToColumn).toHaveBeenCalledWith("todo");
  });

  it("EmptyState erscheint wenn items=[]", () => {
    const { container } = renderListBoardView({ viewItems: [] });

    expect(screen.getByText("Keine Einträge")).toBeInTheDocument();
    expect(screen.getByText("Keine Einträge").parentElement).toHaveClass("grid", "min-h-full");
    expect(container.firstElementChild).toHaveClass("flex", "min-h-[max(18rem,calc(100vh-22rem))]");
  });

  it("loading=true zeigt Skeleton, kein EmptyState", () => {
    const { container } = renderListBoardView({ viewItems: [], loading: true });

    expect(container.querySelector(".skeleton-shimmer")).toBeInTheDocument();
    expect(screen.queryByText("Keine Einträge")).not.toBeInTheDocument();
  });

  it("SearchInput-Änderung ruft onSearchChange auf", () => {
    const onSearchChange = vi.fn();
    renderListBoardView({ onSearchChange });

    fireEvent.change(screen.getByPlaceholderText("Suchen"), { target: { value: "Alpha" } });

    expect(onSearchChange).toHaveBeenCalledWith("Alpha");
  });
});

describe("ItemCard", () => {
  it("Doppelklick ruft onOpen auf", () => {
    const onOpen = vi.fn();
    render(<ItemCard header={<h3>Alpha</h3>} onOpen={onOpen} />);

    const card = screen.getByText("Alpha").closest("article");
    expect(card).toBeInTheDocument();
    fireEvent.doubleClick(card as HTMLElement);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("Einfacher Klick ruft onOpen nicht auf", () => {
    const onOpen = vi.fn();
    render(<ItemCard header={<h3>Alpha</h3>} onOpen={onOpen} />);

    const card = screen.getByText("Alpha").closest("article");
    expect(card).toBeInTheDocument();
    fireEvent.click(card as HTMLElement);

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("Edit-Button ruft onEdit auf (nicht onOpen)", () => {
    const onEdit = vi.fn();
    const onOpen = vi.fn();
    render(<ItemCard header={<h3>Alpha</h3>} onOpen={onOpen} onEdit={onEdit} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.queryByText("Bearbeiten")).not.toBeInTheDocument();
  });

  it("Delete-Button ruft onDelete auf", () => {
    const onDelete = vi.fn();
    render(<ItemCard header={<h3>Alpha</h3>} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("accentColor setzt backgroundColor", () => {
    const { container } = render(<ItemCard accentColor="rgb(18, 52, 86)" header={<h3>Alpha</h3>} />);
    const accent = container.querySelector("span[style]");

    expect(accent).toHaveStyle({ backgroundColor: "rgb(18, 52, 86)" });
  });

  it("begrenzt Kartenbreite innerhalb von Board-Spalten", () => {
    render(<ItemCard header={<h3>Alpha</h3>} />);

    const card = screen.getByText("Alpha").closest("article");
    expect(card).toHaveClass("min-w-0");
    expect(card).toHaveClass("max-w-full");
    expect(card).toHaveClass("overflow-hidden");
  });
});

describe("ItemRow", () => {
  it("rendert title und description", () => {
    render(<ItemRow title="Alpha" description="Beschreibung" />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beschreibung")).toBeInTheDocument();
  });

  it("Doppelklick ruft onOpen auf", () => {
    const onOpen = vi.fn();
    render(<ItemRow title="Alpha" onOpen={onOpen} />);

    const row = screen.getByText("Alpha").closest("article");
    expect(row).toBeInTheDocument();
    fireEvent.doubleClick(row as HTMLElement);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
