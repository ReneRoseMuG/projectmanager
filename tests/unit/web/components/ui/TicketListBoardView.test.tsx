/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TicketListBoardView rendert Statusfilter, Board-Spalten, Listenzeilen und Toolbar über ListBoardView.
 * - Ticket-Karten und -Zeilen zeigen erwartete Controls, Dimensionen und Statuszuordnung.
 * - Die Suche filtert ausschließlich nach Ticket-Titel.
 *
 * Fehlerfälle:
 * - Leere Ticketlisten müssen den EmptyState ohne Karten oder Zeilen anzeigen.
 * - Beschreibung, Tags oder sichtbarer Parent dürfen keine Suchtreffer erzeugen.
 *
 * Ziel:
 * Die ticketspezifische ListBoardView-Integration gegen Layout-, Control-, Filter- und Suchregressionen absichern.
 */
import type { Ticket } from "@taskmanager/shared-types";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketListBoardView } from "../../../../../apps/web/src/components/tickets/TicketListBoardView";
import type { ViewMode } from "../../../../../apps/web/src/types";
import { buildTag, buildTicket } from "../../../../fixtures/web/components/ui/factories";

const workStatusColumnCount = 12;

vi.mock("../../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    return {
      entries: [],
      workStatuses: [],
      featureStatuses: [],
      priorities: [],
      ticketTypes: [],
      loading: false,
      error: null,
      reload: async () => undefined,
      createEntry: async () => undefined,
      updateEntry: async () => undefined,
      deleteEntry: async () => undefined,
    };
  },
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true,
}));

vi.mock("../../../../../apps/web/src/hooks/useTags", () => ({
  useTags: () => ({
    tags: [{ id: 99, name: "Test-Tag", color: "#0f766e", version: 1 }],
    loading: false,
    error: null,
    reload: async () => undefined,
    createTag: async () => ({ id: 100, name: "Neu", color: "#0f766e", version: 1 }),
  }),
}));

function renderTicketList({
  tickets = buildTicketItems(),
  viewMode = "kanban",
  onViewModeChange = vi.fn(),
  onAdd = vi.fn(),
  onAddStatus = vi.fn(),
  onOpen = vi.fn(),
  onDelete = vi.fn(),
}: {
  tickets?: Ticket[];
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onAdd?: () => void;
  onAddStatus?: (status: Ticket["status"]) => void;
  onOpen?: (ticket: Ticket) => void;
  onDelete?: (ticket: Ticket) => void;
} = {}) {
  return render(
    <TicketListBoardView
      tickets={tickets}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      onAdd={onAdd}
      onAddStatus={onAddStatus}
      onOpen={onOpen}
      onDelete={onDelete}
    />,
  );
}

function buildTicketItems(): Ticket[] {
  return [
    buildTicket({ id: 1, title: "Ticket Offen", status: "todo", position: 1 }),
    buildTicket({ id: 2, title: "Ticket In Arbeit", status: "in_progress", position: 2 }),
    buildTicket({ id: 3, title: "Ticket Erledigt", status: "done", position: 3 }),
  ];
}

function expectToolbar() {
  expect(screen.getByPlaceholderText("Suchen")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Kanban" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Alle\s*3$/ })).toBeInTheDocument();
  const addButton = screen.getByRole("button", { name: "Neues Ticket" });
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

describe("TicketListBoardView", () => {
  it("rendert Board-Modus mit Statusfiltern, Statusspalten und Controls", () => {
    const tickets = buildTicketItems();
    const onAddStatus = vi.fn();
    const { container } = renderTicketList({ tickets, onAddStatus });

    expectToolbar();
    expect(container.querySelector("[data-list-board-layout='board']")).toBeInTheDocument();
    expect(container.querySelectorAll("section.rounded-lg")).toHaveLength(workStatusColumnCount);
    expect(screen.getByRole("button", { name: /^In Arbeit\s*1$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Erledigt\s*1$/ })).toBeInTheDocument();

    const cards = container.querySelectorAll("article.p-5");
    expect(cards).toHaveLength(tickets.length);
    expectItemCardClasses(cards);
    expect(screen.getAllByRole("button", { name: "Aktionen" })).toHaveLength(tickets.length);

    fireEvent.click(screen.getByRole("button", { name: "In Arbeit hinzufügen" }));
    expect(onAddStatus).toHaveBeenCalledWith("in_progress");
  });

  it("rendert Listen-Modus mit ItemRows und Row-Controls", () => {
    const tickets = buildTicketItems();
    const { container } = renderTicketList({ tickets, viewMode: "list" });

    expect(container.querySelector("[data-list-board-layout='board']")).not.toBeInTheDocument();
    const rows = container.querySelectorAll("article[class*='border-l-[4px]']");
    expect(rows).toHaveLength(tickets.length);
    expectItemRowClasses(rows);
    tickets.forEach((ticket, index) => {
      const row = rows[index] as HTMLElement;
      expect(within(row).getByText(ticket.title)).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: "Aktionen" })).toBeInTheDocument();
    });
  });

  it("kombiniert Statusfilter mit der sichtbaren Ticketmenge", () => {
    renderTicketList();

    fireEvent.click(screen.getByRole("button", { name: /^Erledigt\s*1$/ }));

    expect(screen.getByText("Ticket Erledigt")).toBeInTheDocument();
    expect(screen.queryByText("Ticket Offen")).not.toBeInTheDocument();
    expect(screen.queryByText("Ticket In Arbeit")).not.toBeInTheDocument();
  });

  it("filtert die Suche ausschließlich nach Ticket-Titel", () => {
    const tickets = [
      buildTicket({
        id: 1,
        title: "Suchnadel Ticket",
        description: "Beschreibung ohne Treffer",
        tags: [buildTag({ id: 1, name: "Neutral" })],
      }),
      buildTicket({
        id: 2,
        title: "Beschreibungstreffer Ticket",
        description: "Suchnadel steht nur in der Beschreibung",
        tags: [buildTag({ id: 2, name: "Neutral" })],
      }),
      buildTicket({
        id: 3,
        title: "Parenttreffer Ticket",
        description: "Beschreibung ohne Treffer",
        tags: [buildTag({ id: 3, name: "Neutral" })],
        visibleParent: {
          type: "milestone",
          id: 7,
          label: "Suchnadel Meilenstein",
          origin: "inherited",
        },
      }),
      buildTicket({
        id: 4,
        title: "Tagtreffer Ticket",
        description: "Beschreibung ohne Treffer",
        tags: [buildTag({ id: 4, name: "Suchnadel Tag" })],
      }),
    ];
    renderTicketList({ tickets });

    fireEvent.change(screen.getByPlaceholderText("Suchen"), {
      target: { value: "  suchNADEL  " },
    });

    expect(screen.getByText("Suchnadel Ticket")).toBeInTheDocument();
    expect(screen.queryByText("Beschreibungstreffer Ticket")).not.toBeInTheDocument();
    expect(screen.queryByText("Parenttreffer Ticket")).not.toBeInTheDocument();
    expect(screen.queryByText("Tagtreffer Ticket")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Suchen"), {
      target: { value: "" },
    });

    tickets.forEach((ticket) => {
      expect(screen.getByText(ticket.title)).toBeInTheDocument();
    });
  });

  it("rendert geschlossene Tickets als ClosedItemRow mit childCount und onOpen", () => {
    const closedTicket = buildTicket({ id: 99, title: "Abgeschlossenes Ticket", status: "done", subTicketCount: 3 });
    const onOpen = vi.fn();
    const { container } = renderTicketList({ tickets: [closedTicket], onOpen });

    // ClosedItemRow zeigt den Titel als h3 mit line-clamp-2
    const closedCard = screen.getByRole("heading", { name: "Abgeschlossenes Ticket" }).closest("article");
    expect(closedCard).not.toBeNull();

    // childCount-Footer mit subTicketCount=3
    expect(screen.getByText("3")).toBeInTheDocument();

    // Klick öffnet das Ticket
    fireEvent.click(closedCard!);
    expect(onOpen).toHaveBeenCalledWith(closedTicket);

    // Kein reguläres article.p-5 Board-Card für das geschlossene Ticket
    expect(container.querySelector("article.p-5")).not.toBeInTheDocument();
  });

  it("zeigt EmptyState wenn keine Tickets vorhanden sind", () => {
    const { container } = renderTicketList({ tickets: [] });

    expect(screen.getByText("Keine Tickets")).toBeInTheDocument();
    expect(container.querySelector("article.p-5")).not.toBeInTheDocument();
    expect(container.querySelector("article[class*='border-l-[4px]']")).not.toBeInTheDocument();
  });
});
