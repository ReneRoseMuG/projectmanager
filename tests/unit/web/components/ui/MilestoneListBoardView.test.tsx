/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - MilestoneListBoardView rendert Meilensteine mit gemeinsamer Projekt-/Meilenstein-Kartenbasis.
 * - Karten und Listenzeilen zeigen den Aufgaben-Fortschritt mit Label Aufgaben.
 *
 * Fehlerfälle:
 * - Enge Kartenfooter dürfen keine separaten Aufgaben-/Ticket-/Feature-Badges rendern.
 * - Listenmodus darf keine technischen Kürzel- oder Slug-Metadaten erzwingen.
 *
 * Ziel:
 * Die Meilenstein-Darstellung gegen Layout- und Aufgabenfortschritts-Regressionen absichern.
 */
import type { Milestone } from "@taskmanager/shared-types";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MilestoneListBoardView } from "../../../../../apps/web/src/components/milestones/MilestoneListBoardView";
import { buildMilestoneSet } from "../../../../fixtures/web/components/ui/factories";

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
    expect(onEdit).toHaveBeenCalledWith(firstMilestone);
  });
});
