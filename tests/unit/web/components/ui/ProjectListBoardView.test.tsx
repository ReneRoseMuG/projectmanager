/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ProjectListBoardView rendert Statusspalten, Karten, Listenzeilen und Toolbar über ListBoardView.
 * - Projekt-Karten und -Zeilen zeigen erwartete Controls, Footer-Counter, Dimensionen und Statuszuordnung.
 *
 * Fehlerfälle:
 * - Leere Projektlisten müssen den EmptyState ohne Karten oder Zeilen anzeigen.
 * - Spalten-Add-Buttons müssen den jeweiligen Status an den Create-Callback weitergeben.
 *
 * Ziel:
 * Die projektspezifische ListBoardView-Integration gegen Layout-, Control- und Routing-Regressionen absichern.
 */
import type { Project } from "@taskmanager/shared-types";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectListBoardView } from "../../../../../apps/web/src/components/projects/ProjectListBoardView";
import { buildProject, buildProjectSet, buildTag } from "../../../../fixtures/web/components/ui/factories";

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

const statusColumns = [
  { value: "active", label: "Aktiv" },
  { value: "on_hold", label: "Pausiert" },
  { value: "completed", label: "Abgeschlossen" },
  { value: "archived", label: "Archiviert" },
  { value: "todo", label: "Offen" },
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "in_review", label: "In Prüfung" },
  { value: "done", label: "Erledigt" },
  { value: "resolved", label: "Gelöst" },
  { value: "closed", label: "Geschlossen" },
  { value: "rejected", label: "Verworfen" },
] as const;

// Board-Redesign: Geschlossene Statusspalten (isClosed im workStatus-Katalog) sind im
// Board-Modus keine regulären `section.rounded-lg` mehr, sondern wandern in die
// ClosedBoardSidebar (ein `aside`). Nur die offenen Spalten bleiben Board-Sections.
const closedStatusValues = new Set<string>([
  "completed",
  "archived",
  "done",
  "resolved",
  "closed",
  "rejected",
]);
const openStatusColumns = statusColumns.filter(
  (column) => !closedStatusValues.has(column.value),
);

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderProjectList({
  projects = buildProjectSet(),
  onCreate = vi.fn(),
  onEdit = vi.fn(),
  onDelete = vi.fn(),
  onCreateMilestone,
  onCreateTask,
  onCreateTicket,
}: {
  projects?: Project[];
  onCreate?: () => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onCreateMilestone?: (project: Project) => void;
  onCreateTask?: (project: Project) => void;
  onCreateTicket?: (project: Project) => void;
} = {}) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <ProjectListBoardView
        projects={projects}
        onCreate={onCreate}
        onEdit={onEdit}
        onDelete={onDelete}
        onCreateMilestone={onCreateMilestone}
        onCreateTask={onCreateTask}
        onCreateTicket={onCreateTicket}
      />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function expectToolbar() {
  expect(screen.getByPlaceholderText("Suchen")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Kanban" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();
  const addButton = screen.getByRole("button", { name: "Neues Projekt" });
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

describe("ProjectListBoardView", () => {
  it("rendert Board-Modus mit Statusspalten, Karten und Controls", () => {
    const projects = buildProjectSet();
    const onCreate = vi.fn();
    const { container } = renderProjectList({ projects, onCreate });

    expectToolbar();
    expect(container.querySelector("[data-list-board-layout='board']")).toBeInTheDocument();

    // Nur die offenen Statusspalten sind reguläre Board-Sections; die geschlossenen
    // (Abgeschlossen, Archiviert, Erledigt, Gelöst, Geschlossen, Verworfen) erscheinen
    // in der ClosedBoardSidebar.
    const columns = container.querySelectorAll("section.rounded-lg");
    expect(columns.length).toBe(openStatusColumns.length);
    columns.forEach((column) => {
      expect(column).toHaveClass("min-w-0");
    });
    openStatusColumns.forEach((column, index) => {
      expect(
        within(columns[index] as HTMLElement).getByRole("heading", {
          name: column.label,
        }),
      ).toBeInTheDocument();
    });

    const activeColumn = screen
      .getByRole("heading", { name: "Aktiv" })
      .closest("section");
    expect(activeColumn).toContainElement(screen.getByText("Projekt Aktiv"));

    // Das geschlossene Projekt "Archiviert" wandert in die Sidebar (aside), nicht in eine Board-Section.
    const closedSidebar = container.querySelector("aside") as HTMLElement;
    expect(closedSidebar).toBeInTheDocument();
    expect(
      within(closedSidebar).getByText("Projekt Archiviert"),
    ).toBeInTheDocument();

    expectItemCardClasses(container.querySelectorAll("article.p-5"));
    expect(
      within(activeColumn as HTMLElement).getByText("Aufgaben"),
    ).toBeInTheDocument();
    expect(
      within(activeColumn as HTMLElement).getByText("2 / 5 erledigt"),
    ).toBeInTheDocument();
    expect(
      within(activeColumn as HTMLElement).getByText("3 offen"),
    ).toBeInTheDocument();
    expect(
      within(activeColumn as HTMLElement).getByText("Aufgaben").compareDocumentPosition(within(activeColumn as HTMLElement).getByLabelText("0 Anhänge")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const milestoneCounter = within(activeColumn as HTMLElement).getByLabelText("2 Meilensteine");
    const taskCounter = within(activeColumn as HTMLElement).getByLabelText("5 Aufgaben");
    const ticketCounter = within(activeColumn as HTMLElement).getByLabelText("1 Tickets");
    expect(milestoneCounter.compareDocumentPosition(taskCounter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(taskCounter.compareDocumentPosition(ticketCounter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      within(activeColumn as HTMLElement).queryByText("PA"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Aktionen" })).toHaveLength(
      projects.length,
    );

    // Spalten-Add-Buttons erscheinen nur an den offenen Board-Sections; die
    // ClosedBoardSidebar rendert keine "hinzufügen"-Buttons.
    const addButtons = screen.getAllByRole("button", { name: /hinzufügen/ });
    expect(addButtons).toHaveLength(openStatusColumns.length);
    fireEvent.click(screen.getByRole("button", { name: "Aktiv hinzufügen" }));
    expect(onCreate).toHaveBeenCalledWith("active");

    const activeHeader = screen
      .getByRole("heading", { name: "Aktiv" })
      .closest("header");
    expect(activeHeader).toHaveTextContent("1");
  });

  it("ruft onEdit per Doppelklick auf eine Karte auf", () => {
    const projects = buildProjectSet();
    const onEdit = vi.fn();
    renderProjectList({ projects, onEdit });

    const card = screen.getByText("Projekt Aktiv").closest("article");
    expect(card).toBeInTheDocument();
    fireEvent.click(card as HTMLElement);
    expect(onEdit).not.toHaveBeenCalled();
    fireEvent.doubleClick(card as HTMLElement);

    expect(onEdit).toHaveBeenCalledWith(projects[0]);
  });

  it("zeigt ohne Create-Callbacks keine neuen Projekt-Menüeinträge", () => {
    const projects = buildProjectSet();
    renderProjectList({ projects });

    const card = screen.getByText(projects[0].name).closest("article") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: "Aktionen" }));

    expect(within(card).queryByRole("menuitem", { name: "Neuer Meilenstein" })).not.toBeInTheDocument();
    expect(within(card).queryByRole("menuitem", { name: "Neue Aufgabe" })).not.toBeInTheDocument();
    expect(within(card).queryByRole("menuitem", { name: "Neues Ticket" })).not.toBeInTheDocument();
  });

  it("ruft Create-Callbacks aus dem Projekt-Menü mit dem konkreten Projekt auf", () => {
    const projects = buildProjectSet();
    const onCreateMilestone = vi.fn();
    const onCreateTask = vi.fn();
    const onCreateTicket = vi.fn();
    renderProjectList({ projects, onCreateMilestone, onCreateTask, onCreateTicket });

    const card = screen.getByText(projects[0].name).closest("article") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: "Aktionen" }));
    expect(within(card).getByRole("menuitem", { name: "Neuer Meilenstein" })).toBeInTheDocument();
    expect(within(card).getByRole("menuitem", { name: "Neue Aufgabe" })).toBeInTheDocument();
    expect(within(card).getByRole("menuitem", { name: "Neues Ticket" })).toBeInTheDocument();
    fireEvent.click(within(card).getByRole("menuitem", { name: "Neuer Meilenstein" }));

    fireEvent.click(within(card).getByRole("button", { name: "Aktionen" }));
    fireEvent.click(within(card).getByRole("menuitem", { name: "Neue Aufgabe" }));

    fireEvent.click(within(card).getByRole("button", { name: "Aktionen" }));
    fireEvent.click(within(card).getByRole("menuitem", { name: "Neues Ticket" }));

    expect(onCreateMilestone).toHaveBeenCalledWith(projects[0]);
    expect(onCreateTask).toHaveBeenCalledWith(projects[0]);
    expect(onCreateTicket).toHaveBeenCalledWith(projects[0]);
  });

  it("wechselt von Board- in Listen-Modus und rendert Rows", () => {
    const projects = buildProjectSet();
    const { container } = renderProjectList({ projects });

    expect(container.querySelector("article.p-5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Liste" }));

    expect(container.querySelector("[data-list-board-layout='board']")).not.toBeInTheDocument();
    const rows = container.querySelectorAll("article[class*='border-l-[4px]']");
    expect(rows).toHaveLength(projects.length);
    expectItemRowClasses(rows);
    projects.forEach((project, index) => {
      const row = rows[index] as HTMLElement;
      expect(within(row).getByText(project.name)).toBeInTheDocument();
      expect(within(row).getByText("Aufgaben")).toBeInTheDocument();
      expect(
        within(row).getByRole("button", { name: "Aktionen" }),
      ).toBeInTheDocument();
    });
  });

  it("zeigt Create-Aktionen auch im Listen-Modus", () => {
    const projects = buildProjectSet();
    const onCreateTicket = vi.fn();
    const { container } = renderProjectList({ projects, onCreateTicket });

    fireEvent.click(screen.getByRole("button", { name: "Liste" }));
    const firstRow = container.querySelector("article[class*='border-l-[4px]']") as HTMLElement;
    fireEvent.click(within(firstRow).getByRole("button", { name: "Aktionen" }));
    fireEvent.click(within(firstRow).getByRole("menuitem", { name: "Neues Ticket" }));

    expect(onCreateTicket).toHaveBeenCalledWith(projects[0]);
  });

  it("zeigt EmptyState wenn keine Projekte vorhanden sind", () => {
    const { container } = renderProjectList({ projects: [] });

    expect(screen.getByText("Keine Projekte")).toBeInTheDocument();
    expect(
      container.querySelector("article.p-5"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector("article[class*='border-l-[4px]']"),
    ).not.toBeInTheDocument();
  });

  it("filtert die Suche ausschließlich nach Projektname", () => {
    const projects = [
      buildProject({
        id: 1,
        name: "Suchnadel Projekt",
        description: "Beschreibung ohne Treffer",
        tags: [buildTag({ id: 1, name: "Neutral" })],
      }),
      buildProject({
        id: 2,
        name: "Beschreibungstreffer Projekt",
        description: "Suchnadel steht nur in der Beschreibung",
        tags: [buildTag({ id: 2, name: "Neutral" })],
      }),
      buildProject({
        id: 3,
        name: "Tagtreffer Projekt",
        description: "Beschreibung ohne Treffer",
        tags: [buildTag({ id: 3, name: "Suchnadel Tag" })],
      }),
    ];
    renderProjectList({ projects });

    fireEvent.change(screen.getByPlaceholderText("Suchen"), {
      target: { value: "  suchNADEL  " },
    });

    expect(screen.getByText("Suchnadel Projekt")).toBeInTheDocument();
    expect(screen.queryByText("Beschreibungstreffer Projekt")).not.toBeInTheDocument();
    expect(screen.queryByText("Tagtreffer Projekt")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Suchen"), {
      target: { value: "" },
    });

    projects.forEach((project) => {
      expect(screen.getByText(project.name)).toBeInTheDocument();
    });
  });
});
