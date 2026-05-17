/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TaskListBoardView rendert Kanban-Statusspalten, Listenzeilen und Toolbar über ListBoardView.
 * - Task-Karten und -Zeilen zeigen erwartete Controls, Dimensionen, Statuszuordnung und Metadaten.
 *
 * Fehlerfälle:
 * - Leere Aufgabenlisten müssen den EmptyState ohne Karten oder Zeilen anzeigen.
 * - Aufgaben ohne Tags und überfällige Aufgaben müssen ihre fachlichen Sonderfälle korrekt darstellen.
 *
 * Ziel:
 * Die aufgabenspezifische ListBoardView-Integration gegen Layout-, Control- und Statusregressionen absichern.
 */
import type { Task } from "@taskmanager/shared-types";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ViewMode } from "../../../types";
import { TaskListBoardView } from "../../tasks/TaskListBoardView";
import { buildTask, buildTaskSet } from "./factories";

const statusColumns = [
  { value: "todo", label: "Offen" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "done", label: "Erledigt" }
] as const;

function renderTaskList({
  tasks = buildTaskSet(),
  viewMode = "kanban",
  onViewModeChange = vi.fn(),
  onAdd = vi.fn(),
  onAddStatus = vi.fn(),
  onOpen = vi.fn(),
  onDelete = vi.fn()
}: {
  tasks?: Task[];
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onAdd?: () => void;
  onAddStatus?: (status: Task["status"]) => void;
  onOpen?: (task: Task) => void;
  onDelete?: (task: Task) => void;
} = {}) {
  return render(
    <TaskListBoardView
      tasks={tasks}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      onAdd={onAdd}
      onAddStatus={onAddStatus}
      onOpen={onOpen}
      onDelete={onDelete}
    />
  );
}

function TaskHarness({ tasks, onViewModeChange }: { tasks: Task[]; onViewModeChange: (viewMode: ViewMode) => void }) {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  return (
    <TaskListBoardView
      tasks={tasks}
      viewMode={viewMode}
      onViewModeChange={(nextViewMode) => {
        onViewModeChange(nextViewMode);
        setViewMode(nextViewMode);
      }}
      onAdd={vi.fn()}
      onAddStatus={vi.fn()}
      onOpen={vi.fn()}
      onDelete={vi.fn()}
    />
  );
}

function expectToolbar() {
  expect(screen.getByPlaceholderText("Suchen")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Kanban" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Neue Aufgabe" })).toBeInTheDocument();
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

describe("TaskListBoardView", () => {
  it("rendert Board-Modus mit Statusspalten, Karten und Controls", () => {
    const tasks = buildTaskSet();
    const onAddStatus = vi.fn();
    const onOpen = vi.fn();
    const { container } = renderTaskList({ tasks, onAddStatus, onOpen });

    expectToolbar();
    expect(container.querySelector(".lg\\:grid-cols-3")).toBeInTheDocument();

    const columns = container.querySelectorAll("section.rounded-lg");
    expect(columns.length).toBe(statusColumns.length);
    statusColumns.forEach((column) => {
      expect(screen.getByRole("heading", { name: column.label })).toBeInTheDocument();
    });

    const todoColumn = screen.getByRole("heading", { name: "Offen" }).closest("section");
    expect(todoColumn).toContainElement(screen.getByText("Aufgabe Offen"));
    const doneColumn = screen.getByRole("heading", { name: "Erledigt" }).closest("section");
    expect(doneColumn).toContainElement(screen.getByText("Aufgabe Erledigt"));

    expectItemCardClasses(container.querySelectorAll("article.rounded-2xl"));
    const editButtons = screen.getAllByRole("button", { name: "Bearbeiten" });
    expect(editButtons).toHaveLength(tasks.length);
    expect(screen.getAllByRole("button", { name: "Löschen" })).toHaveLength(tasks.length);

    fireEvent.click(editButtons[0]!);
    expect(onOpen).toHaveBeenCalledWith(tasks[0]);

    fireEvent.click(screen.getByRole("button", { name: "Offen hinzufügen" }));
    expect(onAddStatus).toHaveBeenCalledWith("todo");

    const todoHeader = screen.getByRole("heading", { name: "Offen" }).closest("header");
    expect(todoHeader).toHaveTextContent("1");
  });

  it("rendert Listen-Modus mit ItemRows und Row-Controls", () => {
    const tasks = buildTaskSet();
    const { container } = renderTaskList({ tasks, viewMode: "list" });

    expect(container.querySelector(".lg\\:grid-cols-3")).not.toBeInTheDocument();
    const rows = container.querySelectorAll("article.rounded-xl");
    expect(rows).toHaveLength(tasks.length);
    expectItemRowClasses(rows);
    tasks.forEach((task, index) => {
      const row = rows[index] as HTMLElement;
      expect(within(row).getByText(task.title)).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: "Öffnen" })).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: "Löschen" })).toBeInTheDocument();
    });
  });

  it("wechselt von Board- in Listen-Modus und rendert Rows", () => {
    const tasks = buildTaskSet();
    const onViewModeChange = vi.fn();
    const { container } = render(<TaskHarness tasks={tasks} onViewModeChange={onViewModeChange} />);

    expect(container.querySelector("article.rounded-2xl")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Liste" }));

    expect(onViewModeChange).toHaveBeenCalledWith("list");
    expect(container.querySelector(".lg\\:grid-cols-3")).not.toBeInTheDocument();
    expect(container.querySelectorAll("article.rounded-xl")).toHaveLength(tasks.length);
  });

  it("stellt Aufgaben ohne Tags und überfällige Aufgaben korrekt dar", () => {
    const overdueTask = buildTask({
      title: "Überfällige Aufgabe",
      dueDate: "2020-01-01",
      tags: []
    });
    renderTaskList({ tasks: [overdueTask] });

    expect(screen.queryByText("Qualität")).not.toBeInTheDocument();
    const overdueDate = screen.getByText("01.01.20").closest("span");
    expect(overdueDate).toHaveClass("text-crimson");
  });

  it("zeigt EmptyState wenn keine Aufgaben vorhanden sind", () => {
    const { container } = renderTaskList({ tasks: [] });

    expect(screen.getByText("Keine Aufgaben")).toBeInTheDocument();
    expect(container.querySelector("article.rounded-2xl")).not.toBeInTheDocument();
    expect(container.querySelector("article.rounded-xl")).not.toBeInTheDocument();
  });
});
