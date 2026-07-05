/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - MilestoneListBoardView rendert Meilensteine mit gemeinsamer Projekt-/Meilenstein-Kartenbasis.
 * - Karten und Listenzeilen zeigen den Aufgaben-Fortschritt und die Footer-Counter.
 * - Statusfilter werden in der gemeinsamen Toolbar angeboten.
 *
 * Fehlerfälle:
 * - Enge Kartenfooter dürfen keine separaten Feature-Badges rendern.
 * - Listenmodus darf keine technischen Metadaten erzwingen.
 *
 * Ziel:
 * Die Meilenstein-Darstellung gegen Layout- und Aufgabenfortschritts-Regressionen absichern.
 */
import type { Milestone } from "@taskmanager/shared-types";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MilestoneListBoardView } from "../../../../../apps/web/src/components/milestones/MilestoneListBoardView";
import { buildMilestone, buildMilestoneSet, buildTag } from "../../../../fixtures/web/components/ui/factories";

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

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true,
}));

vi.mock("../../../../../apps/web/src/hooks/useTags", () => ({
  useTags: () => ({
    tags: [{ id: 1, name: "Qualität", color: "#0f766e", version: 1 }],
    loading: false,
    error: null,
    reload: async () => undefined,
    createTag: async () => undefined,
  }),
}));

// Geschlossene workStatus-Keys (isClosed im Katalog): Meilensteine mit diesem Status
// erscheinen im Board nicht als reguläre Karte, sondern in der ClosedBoardSidebar.
const closedStatusValues = new Set<string>([
  "completed",
  "archived",
  "done",
  "resolved",
  "closed",
  "rejected",
]);

function renderMilestoneList({
  milestones = buildMilestoneSet(),
  onCreate = vi.fn(),
  onEdit = vi.fn(),
  onDelete = vi.fn(),
  onCreateTask,
  onCreateTicket,
}: {
  milestones?: Milestone[];
  onCreate?: () => void;
  onEdit?: (milestone: Milestone) => void;
  onDelete?: (milestone: Milestone) => void;
  onCreateTask?: (milestone: Milestone) => void;
  onCreateTicket?: (milestone: Milestone) => void;
} = {}) {
  return render(
    <MilestoneListBoardView
      milestones={milestones}
      onCreate={onCreate}
      onEdit={onEdit}
      onDelete={onDelete}
      onCreateTask={onCreateTask}
      onCreateTicket={onCreateTicket}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe("MilestoneListBoardView", () => {
  it("rendert Board-Karten mit Aufgaben-Progress und fachlichen Footer-Countern", () => {
    const milestones = buildMilestoneSet();
    const { container } = renderMilestoneList({ milestones });

    const activeColumn = screen
      .getByRole("heading", { name: "Aktiv" })
      .closest("section") as HTMLElement;
    expect(activeColumn).toContainElement(
      screen.getByText("Meilenstein Aktiv"),
    );
    expect(within(activeColumn).getByText("Aufgaben")).toBeInTheDocument();
    expect(
      within(activeColumn).getByText("2 / 5 erledigt"),
    ).toBeInTheDocument();
    expect(within(activeColumn).getByText("3 offen")).toBeInTheDocument();
    expect(within(activeColumn).getByText("Projekt: Projekt Alpha")).toBeInTheDocument();
    expect(
      within(activeColumn).getByText("Aufgaben").compareDocumentPosition(within(activeColumn).getByLabelText("0 Anhänge")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const taskCounter = within(activeColumn).getByLabelText("5 Aufgaben");
    const ticketCounter = within(activeColumn).getByLabelText("1 Tickets");
    expect(taskCounter.compareDocumentPosition(ticketCounter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      within(activeColumn).queryByText("2 Features"),
    ).not.toBeInTheDocument();

    // Board-Redesign: Nur offene Meilensteine erscheinen als reguläre Board-Karten
    // (article.p-5). Die geschlossenen Status (Abgeschlossen, Archiviert, Erledigt,
    // Gelöst, Geschlossen, Verworfen) wandern als ClosedItemRow in die Sidebar.
    const openMilestones = milestones.filter(
      (milestone) => !closedStatusValues.has(milestone.status),
    );
    const cards = container.querySelectorAll("article.p-5");
    expect(cards).toHaveLength(openMilestones.length);
    cards.forEach((card) => {
      expect(card).toHaveClass("min-w-0");
      expect(card).toHaveClass("max-w-full");
      expect(card).toHaveClass("h-full");
    });

    // Ein geschlossener Meilenstein (Archiviert) erscheint in der ClosedBoardSidebar.
    const closedSidebar = container.querySelector("aside") as HTMLElement;
    expect(closedSidebar).toBeInTheDocument();
    expect(
      within(closedSidebar).getByText("Meilenstein Archiviert"),
    ).toBeInTheDocument();
  });

  it("rendert die gemeinsame Toolbar mit icon-only Add", () => {
    const milestones = buildMilestoneSet();
    renderMilestoneList({ milestones });

    expect(screen.getByPlaceholderText("Suchen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(`^Alle\\s*${milestones.length}$`) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Aktiv\s*1$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kanban" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();
    const addButton = screen.getByRole("button", { name: "Neuer Meilenstein" });
    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveTextContent("");
  });

  it("zeigt ohne Create-Callbacks keine neuen Meilenstein-Menüeinträge", () => {
    const milestones = buildMilestoneSet();
    renderMilestoneList({ milestones });

    const card = screen.getByText(milestones[0].name).closest("article") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: "Aktionen" }));

    expect(within(card).queryByRole("menuitem", { name: "Neue Aufgabe" })).not.toBeInTheDocument();
    expect(within(card).queryByRole("menuitem", { name: "Neues Ticket" })).not.toBeInTheDocument();
  });

  it("ruft Create-Callbacks aus dem Meilenstein-Menü mit dem konkreten Meilenstein auf", () => {
    const milestones = buildMilestoneSet();
    const onCreateTask = vi.fn();
    const onCreateTicket = vi.fn();
    renderMilestoneList({ milestones, onCreateTask, onCreateTicket });

    const card = screen.getByText(milestones[0].name).closest("article") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: "Aktionen" }));
    expect(within(card).getByRole("menuitem", { name: "Neue Aufgabe" })).toBeInTheDocument();
    expect(within(card).getByRole("menuitem", { name: "Neues Ticket" })).toBeInTheDocument();
    fireEvent.click(within(card).getByRole("menuitem", { name: "Neue Aufgabe" }));

    fireEvent.click(within(card).getByRole("button", { name: "Aktionen" }));
    fireEvent.click(within(card).getByRole("menuitem", { name: "Neues Ticket" }));

    expect(onCreateTask).toHaveBeenCalledWith(milestones[0]);
    expect(onCreateTicket).toHaveBeenCalledWith(milestones[0]);
  });

  it("filtert Meilensteine nach Status", () => {
    const milestones = [
      buildMilestone({ id: 1, name: "Aktiver Meilenstein", status: "active" }),
      buildMilestone({ id: 2, name: "Pausierter Meilenstein", status: "on_hold" }),
    ];
    renderMilestoneList({ milestones });

    fireEvent.click(screen.getByRole("button", { name: /^Pausiert\s*1$/ }));

    expect(screen.getByText("Pausierter Meilenstein")).toBeInTheDocument();
    expect(screen.queryByText("Aktiver Meilenstein")).not.toBeInTheDocument();
  });

  it("rendert Listenzeilen mit Aufgaben-Meta und öffnet Meilensteine", () => {
    const milestones = buildMilestoneSet();
    const onEdit = vi.fn();
    const { container } = renderMilestoneList({ milestones, onEdit });

    fireEvent.click(screen.getByRole("button", { name: "Liste" }));

    const rows = container.querySelectorAll("article[class*='border-l-[4px]']");
    expect(rows).toHaveLength(milestones.length);
    const firstRow = rows[0] as HTMLElement;
    const firstMilestone = milestones[0] as Milestone;
    expect(within(firstRow).getByText(firstMilestone.name)).toBeInTheDocument();
    expect(within(firstRow).getByText("Projekt: Projekt Alpha")).toBeInTheDocument();
    expect(within(firstRow).getByText("Aufgaben")).toBeInTheDocument();
    expect(within(firstRow).getByText("3 offen")).toBeInTheDocument();

    fireEvent.click(firstRow);
    expect(onEdit).not.toHaveBeenCalled();
    fireEvent.doubleClick(firstRow);
    expect(onEdit).toHaveBeenCalledWith(firstMilestone);
  });

  it("filtert die Suche ausschließlich nach Meilenstein-Name", () => {
    const milestones = [
      buildMilestone({
        id: 1,
        name: "Suchnadel Meilenstein",
        description: "Beschreibung ohne Treffer",
        tags: [buildTag({ id: 1, name: "Neutral" })],
      }),
      buildMilestone({
        id: 2,
        name: "Beschreibungstreffer Meilenstein",
        description: "Suchnadel steht nur in der Beschreibung",
        tags: [buildTag({ id: 2, name: "Neutral" })],
      }),
      buildMilestone({
        id: 3,
        name: "Tagtreffer Meilenstein",
        description: "Beschreibung ohne Treffer",
        tags: [buildTag({ id: 3, name: "Suchnadel Tag" })],
      }),
    ];
    renderMilestoneList({ milestones });

    fireEvent.change(screen.getByPlaceholderText("Suchen"), {
      target: { value: "  suchNADEL  " },
    });

    expect(screen.getByText("Suchnadel Meilenstein")).toBeInTheDocument();
    expect(screen.queryByText("Beschreibungstreffer Meilenstein")).not.toBeInTheDocument();
    expect(screen.queryByText("Tagtreffer Meilenstein")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Suchen"), {
      target: { value: "" },
    });

    milestones.forEach((milestone) => {
      expect(screen.getByText(milestone.name)).toBeInTheDocument();
    });
  });

  it("zeigt Create-Aktionen auch im Listen-Modus", () => {
    const milestones = buildMilestoneSet();
    const onCreateTask = vi.fn();
    const { container } = renderMilestoneList({ milestones, onCreateTask });

    fireEvent.click(screen.getByRole("button", { name: "Liste" }));
    const firstRow = container.querySelector("article[class*='border-l-[4px]']") as HTMLElement;
    fireEvent.click(within(firstRow).getByRole("button", { name: "Aktionen" }));
    fireEvent.click(within(firstRow).getByRole("menuitem", { name: "Neue Aufgabe" }));

    expect(onCreateTask).toHaveBeenCalledWith(milestones[0]);
  });
});
