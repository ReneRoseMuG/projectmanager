/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - MilestoneListBoardView rendert Meilensteine mit gemeinsamer Projekt-/Meilenstein-Kartenbasis.
 * - Karten und Listenzeilen zeigen den Aufgaben-Fortschritt mit Label Aufgaben.
 * - Statusfilter werden in der gemeinsamen Toolbar angeboten.
 *
 * Fehlerfälle:
 * - Enge Kartenfooter dürfen keine separaten Aufgaben-/Ticket-/Feature-Badges rendern.
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

function renderMilestoneList({
  milestones = buildMilestoneSet(),
  onCreate = vi.fn(),
  onEdit = vi.fn(),
  onDelete = vi.fn(),
}: {
  milestones?: Milestone[];
  onCreate?: () => void;
  onEdit?: (milestone: Milestone) => void;
  onDelete?: (milestone: Milestone) => void;
} = {}) {
  return render(
    <MilestoneListBoardView
      milestones={milestones}
      onCreate={onCreate}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe("MilestoneListBoardView", () => {
  it("rendert Board-Karten mit Aufgaben-Progress und ohne enge Count-Badges", () => {
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
    expect(
      within(activeColumn).queryByText("5 Aufgaben"),
    ).not.toBeInTheDocument();
    expect(
      within(activeColumn).queryByText("1 Tickets"),
    ).not.toBeInTheDocument();
    expect(
      within(activeColumn).queryByText("2 Features"),
    ).not.toBeInTheDocument();

    const cards = container.querySelectorAll("article.rounded-2xl");
    expect(cards).toHaveLength(milestones.length);
    cards.forEach((card) => {
      expect(card).toHaveClass("min-w-0");
      expect(card).toHaveClass("max-w-full");
      expect(card).toHaveClass("h-full");
    });
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

    const rows = container.querySelectorAll("article.rounded-xl");
    expect(rows).toHaveLength(milestones.length);
    const firstRow = rows[0] as HTMLElement;
    const firstMilestone = milestones[0] as Milestone;
    expect(within(firstRow).getByText(firstMilestone.name)).toBeInTheDocument();
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
});
