/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ProjectListBoardView rendert Statusspalten, Karten, Listenzeilen und Toolbar über ListBoardView.
 * - Projekt-Karten und -Zeilen zeigen erwartete Controls, Dimensionen und Statuszuordnung.
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
import { buildProjectSet } from "../../../../fixtures/web/components/ui/factories";

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
  { value: "rejected", label: "Verworfen" }
] as const;

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderProjectList({
  projects = buildProjectSet(),
  onCreate = vi.fn(),
  onEdit = vi.fn(),
  onDelete = vi.fn()
}: {
  projects?: Project[];
  onCreate?: () => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
} = {}) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <ProjectListBoardView projects={projects} onCreate={onCreate} onEdit={onEdit} onDelete={onDelete} />
      <LocationProbe />
    </MemoryRouter>
  );
}

function expectToolbar() {
  expect(screen.getByPlaceholderText("Suchen")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Kanban" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Neues Projekt" })).toBeInTheDocument();
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

describe("ProjectListBoardView", () => {
  it("rendert Board-Modus mit Statusspalten, Karten und Controls", () => {
    const projects = buildProjectSet();
    const onCreate = vi.fn();
    const { container } = renderProjectList({ projects, onCreate });

    expectToolbar();
    expect(container.querySelector(".grid-flow-col")).toBeInTheDocument();

    const columns = container.querySelectorAll("section.rounded-lg");
    expect(columns.length).toBe(statusColumns.length);
    columns.forEach((column) => {
      expect(column).toHaveClass("min-w-0");
    });
    statusColumns.forEach((column, index) => {
      expect(within(columns[index] as HTMLElement).getByRole("heading", { name: column.label })).toBeInTheDocument();
    });

    const activeColumn = screen.getByRole("heading", { name: "Aktiv" }).closest("section");
    expect(activeColumn).toContainElement(screen.getByText("Projekt Aktiv"));
    const archivedColumn = screen.getByRole("heading", { name: "Archiviert" }).closest("section");
    expect(archivedColumn).toContainElement(screen.getByText("Projekt Archiviert"));

    expectItemCardClasses(container.querySelectorAll("article.rounded-2xl"));
    expect(within(activeColumn as HTMLElement).getByText("Aufgaben")).toBeInTheDocument();
    expect(within(activeColumn as HTMLElement).getByText("2 / 5 erledigt")).toBeInTheDocument();
    expect(within(activeColumn as HTMLElement).getByText("3 offen")).toBeInTheDocument();
    expect(within(activeColumn as HTMLElement).queryByText("PA")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Aktionen" })).toHaveLength(projects.length);

    const addButtons = screen.getAllByRole("button", { name: /hinzufügen/ });
    expect(addButtons).toHaveLength(statusColumns.length);
    fireEvent.click(screen.getByRole("button", { name: "Aktiv hinzufügen" }));
    expect(onCreate).toHaveBeenCalledWith("active");

    const activeHeader = screen.getByRole("heading", { name: "Aktiv" }).closest("header");
    expect(activeHeader).toHaveTextContent("1");
  });

  it("ruft onEdit per Doppelklick auf eine Karte auf", () => {
    const projects = buildProjectSet();
    const onEdit = vi.fn();
    renderProjectList({ projects, onEdit });

    const card = screen.getByText("Projekt Aktiv").closest("article");
    expect(card).toBeInTheDocument();
    fireEvent.doubleClick(card as HTMLElement);

    expect(onEdit).toHaveBeenCalledWith(projects[0]);
  });

  it("wechselt von Board- in Listen-Modus und rendert Rows", () => {
    const projects = buildProjectSet();
    const { container } = renderProjectList({ projects });

    expect(container.querySelector("article.rounded-2xl")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Liste" }));

    expect(container.querySelector(".grid-flow-col")).not.toBeInTheDocument();
    const rows = container.querySelectorAll("article.rounded-xl");
    expect(rows).toHaveLength(projects.length);
    expectItemRowClasses(rows);
    projects.forEach((project, index) => {
      const row = rows[index] as HTMLElement;
      expect(within(row).getByText(project.name)).toBeInTheDocument();
      expect(within(row).getByText("Aufgaben")).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: "Aktionen" })).toBeInTheDocument();
    });
  });

  it("zeigt EmptyState wenn keine Projekte vorhanden sind", () => {
    const { container } = renderProjectList({ projects: [] });

    expect(screen.getByText("Keine Projekte")).toBeInTheDocument();
    expect(container.querySelector("article.rounded-2xl")).not.toBeInTheDocument();
    expect(container.querySelector("article.rounded-xl")).not.toBeInTheDocument();
  });
});
