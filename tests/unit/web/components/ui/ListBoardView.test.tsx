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
import { Button } from "../../../../../apps/web/src/components/ui/Button";
import { ItemCard } from "../../../../../apps/web/src/components/ui/ItemCard";
import { ItemRow } from "../../../../../apps/web/src/components/ui/ItemRow";
import {
  ListBoardView,
  type ListBoardMode,
} from "../../../../../apps/web/src/components/ui/ListBoardView";

interface TestItem {
  id: number;
  title: string;
  description: string;
  status: "todo" | "done";
}

const items: TestItem[] = [
  { id: 1, title: "Alpha", description: "Erste Karte", status: "todo" },
  { id: 2, title: "Beta", description: "Zweite Karte", status: "done" },
];

function renderListBoardView({
  mode = "board",
  viewItems = items,
  loading = false,
  onModeChange = vi.fn(),
  onAdd = vi.fn(),
  onSearchChange = vi.fn(),
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
      renderCard={(item) => (
        <ItemCard
          header={<h3>Card {item.title}</h3>}
          body={<p>{item.description}</p>}
        />
      )}
      renderRow={(item) => (
        <ItemRow title={`Row ${item.title}`} description={item.description} />
      )}
    />,
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
    expect(container.firstElementChild).toHaveClass("min-h-[30rem]", "flex-1");
    expect(
      container.querySelector(".md\\:grid-cols-2.xl\\:grid-cols-3"),
    ).toHaveClass("h-full", "min-h-[30rem]", "min-w-0", "flex-1");
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
          { value: "todo", label: "Offen", sortOrder: 100 },
        ]}
        renderCard={(item) => (
          <ItemCard
            header={<h3>Card {item.title}</h3>}
            body={<p>{item.description}</p>}
          />
        )}
        renderRow={(item) => (
          <ItemRow title={`Row ${item.title}`} description={item.description} />
        )}
      />,
    );

    const sections = container.querySelectorAll("section.rounded-lg");
    expect(sections).toHaveLength(2);
    expect(
      within(sections[0] as HTMLElement).getByRole("heading", {
        name: "Offen",
      }),
    ).toBeInTheDocument();
    expect(
      within(sections[0] as HTMLElement).getByText("Row Alpha"),
    ).toBeInTheDocument();
    expect(sections[0]).toHaveClass("bg-shell/70");
    expect(
      within(sections[0] as HTMLElement)
        .getByRole("heading", { name: "Offen" })
        .closest("header"),
    ).toHaveClass("bg-white");
    expect(
      within(sections[0] as HTMLElement)
        .getByRole("heading", { name: "Offen" })
        .closest("header"),
    ).not.toHaveClass("bg-white/60", "backdrop-blur-sm");
    expect(
      within(sections[1] as HTMLElement).getByRole("heading", {
        name: "Erledigt",
      }),
    ).toBeInTheDocument();
    expect(
      within(sections[1] as HTMLElement).getByText("Row Beta"),
    ).toBeInTheDocument();
    expect(sections[1]).toHaveClass("bg-steel-50/80");
  });

  it("ViewToggle wechselt Modus", () => {
    const onModeChange = vi.fn();
    renderListBoardView({ mode: "board", onModeChange });

    const listButton = screen.getByRole("button", { name: "Liste" });
    expect(listButton).toHaveClass("h-8", "w-8");
    expect(screen.getByRole("button", { name: "Kanban" })).toHaveClass(
      "h-8",
      "w-8",
    );

    fireEvent.click(listButton);

    expect(onModeChange).toHaveBeenCalledWith("list");
  });

  it("Toolbar-Add ist kompakt, icon-only und ruft onAdd auf", () => {
    const onAdd = vi.fn();
    renderListBoardView({ onAdd });

    const addButton = screen.getByRole("button", { name: "Anlegen" });
    expect(addButton).toHaveClass("h-9", "w-9");
    expect(addButton).toHaveTextContent("");

    fireEvent.click(addButton);

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("blendet den Toolbar-Add-Button bei showToolbarAdd=false aus", () => {
    render(
      <ListBoardView
        items={items}
        mode="board"
        onModeChange={vi.fn()}
        onAdd={vi.fn()}
        addLabel="Anlegen"
        showToolbarAdd={false}
        renderCard={(item) => (
          <ItemCard
            header={<h3>Card {item.title}</h3>}
            body={<p>{item.description}</p>}
          />
        )}
        renderRow={(item) => (
          <ItemRow title={`Row ${item.title}`} description={item.description} />
        )}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Anlegen" }),
    ).not.toBeInTheDocument();
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
          { value: "done", label: "Erledigt" },
        ]}
        renderCard={(item) => (
          <ItemCard
            header={<h3>Card {item.title}</h3>}
            body={<p>{item.description}</p>}
          />
        )}
        renderRow={(item) => (
          <ItemRow title={`Row ${item.title}`} description={item.description} />
        )}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Offen hinzufügen" }));

    screen.getAllByRole("heading").forEach((heading) => {
      expect(heading.closest("section")).toHaveClass("min-w-0");
    });
    expect(
      screen.getByRole("heading", { name: "Offen" }).closest("header"),
    ).toHaveClass("bg-white");
    expect(
      screen.getByRole("heading", { name: "Offen" }).closest("header"),
    ).not.toHaveClass("bg-white/60", "backdrop-blur-sm");

    expect(onAddToColumn).toHaveBeenCalledWith("todo");
  });

  it("EmptyState erscheint wenn items=[]", () => {
    const { container } = renderListBoardView({ viewItems: [] });

    expect(screen.getByText("Keine Einträge")).toBeInTheDocument();
    expect(screen.getByText("Keine Einträge").parentElement).toHaveClass(
      "grid",
      "h-full",
      "min-h-[30rem]",
      "w-full",
      "flex-1",
    );
    expect(container.firstElementChild).toHaveClass(
      "flex",
      "min-h-[30rem]",
      "flex-1",
    );
  });

  it("loading=true zeigt Skeleton, kein EmptyState", () => {
    const { container } = renderListBoardView({ viewItems: [], loading: true });

    expect(container.querySelector(".skeleton-shimmer")).toBeInTheDocument();
    expect(screen.queryByText("Keine Einträge")).not.toBeInTheDocument();
  });

  it("SearchInput-Änderung ruft onSearchChange auf", () => {
    const onSearchChange = vi.fn();
    renderListBoardView({ onSearchChange });

    fireEvent.change(screen.getByPlaceholderText("Suchen"), {
      target: { value: "Alpha" },
    });

    expect(onSearchChange).toHaveBeenCalledWith("Alpha");
  });
});

describe("ItemCard", () => {
  it("einfacher Klick ruft onOpen auf", () => {
    const onOpen = vi.fn();
    render(<ItemCard header={<h3>Alpha</h3>} onOpen={onOpen} />);

    const card = screen.getByText("Alpha").closest("article");
    expect(card).toBeInTheDocument();
    fireEvent.click(card as HTMLElement);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("Karte ohne onOpen reagiert nicht auf Klick", () => {
    const onOpen = vi.fn();
    render(<ItemCard header={<h3>Alpha</h3>} />);

    const card = screen.getByText("Alpha").closest("article");
    expect(card).toBeInTheDocument();
    fireEvent.click(card as HTMLElement);

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("ActionMenu ist sichtbar, ruft onEdit auf und löst kein onOpen aus", () => {
    const onEdit = vi.fn();
    const onOpen = vi.fn();
    render(
      <ItemCard header={<h3>Alpha</h3>} onOpen={onOpen} onEdit={onEdit} />,
    );

    const trigger = screen.getByRole("button", { name: "Aktionen" });
    expect(trigger).toHaveClass("h-10", "w-10", "border", "shadow-sm");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Bearbeiten" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("menuitem", { name: "Bearbeiten" }),
    ).not.toBeInTheDocument();
  });

  it("ActionMenu ruft onDelete auf", () => {
    const onDelete = vi.fn();
    render(<ItemCard header={<h3>Alpha</h3>} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Löschen" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("accentColor setzt backgroundColor", () => {
    const { container } = render(
      <ItemCard accentColor="rgb(18, 52, 86)" header={<h3>Alpha</h3>} />,
    );
    const accent = container.querySelector("span[style]");

    expect(accent).toHaveStyle({ backgroundColor: "rgb(18, 52, 86)" });
  });

  it("begrenzt Kartenbreite ohne ActionMenu-Popup zu clippen", () => {
    render(<ItemCard header={<h3>Alpha</h3>} />);

    const card = screen.getByText("Alpha").closest("article");
    expect(card).toHaveClass("min-w-0");
    expect(card).toHaveClass("max-w-full");
    expect(card).toHaveClass("overflow-visible");
    expect(card).not.toHaveClass("overflow-hidden");
  });
});

describe("ItemRow", () => {
  it("rendert title und description", () => {
    render(<ItemRow title="Alpha" description="Beschreibung" />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beschreibung")).toBeInTheDocument();
  });

  it("einfacher Klick ruft onOpen auf", () => {
    const onOpen = vi.fn();
    render(<ItemRow title="Alpha" onOpen={onOpen} />);

    const row = screen.getByText("Alpha").closest("article");
    expect(row).toBeInTheDocument();
    fireEvent.click(row as HTMLElement);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("Klick auf Row-Aktion löst kein onOpen aus", () => {
    const onOpen = vi.fn();
    const onAction = vi.fn();
    render(
      <ItemRow
        title="Alpha"
        onOpen={onOpen}
        actions={<Button onClick={onAction}>Aktion</Button>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktion" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("Klick auf Row-Pills löst kein onOpen aus", () => {
    const onOpen = vi.fn();
    render(
      <ItemRow title="Alpha" onOpen={onOpen} pills={<span>Status</span>} />,
    );

    fireEvent.click(screen.getByText("Status"));

    expect(onOpen).not.toHaveBeenCalled();
  });
});
