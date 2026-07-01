// @vitest-environment jsdom

/**
 * Test Scope:
 * SubtaskList
 *
 * Test-Ebene:
 * - Unit/jsdom.
 *
 * Realitätsgrad:
 * - Echte SubtaskList-Komponente; der generische TaskListBoardView-Adapter wird als
 *   begrenzter UI-Collaborator gemockt.
 *
 * Mock-Entscheidung:
 * - TaskListBoardView wird gemockt, damit der Test die Subtask-Verdrahtung ohne
 *   TanStack-Query-, Permission- und DnD-Umgebung beweist.
 *
 * Isolation:
 * - Kein DB- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - Unteraufgaben werden über den Task-Board/Listview-Adapter statt als Checkbox-Liste dargestellt.
 * - Der Subtask-Empty-State nutzt das kanonische Aufgaben-Icon `ListTodo`.
 *
 * Fehlerfälle:
 * - Die alte Checkbox-Darstellung darf nicht mehr gerendert werden.
 *
 * Ziel:
 * Den Umbau von Subtasks auf echte Task-Listview-Items absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { Task } from "@taskmanager/shared-types";
import type { ReactNode } from "react";
import { screen } from "@testing-library/dom";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubtaskList } from "../../../../../apps/web/src/components/tasks/SubtaskList";

vi.mock("../../../../../apps/web/src/components/tasks/TaskListBoardView", () => ({
  TaskListBoardView({
    addLabel,
    emptyState,
    onStatusChange,
    tasks,
  }: {
    addLabel: string;
    emptyState: ReactNode;
    onStatusChange: (task: Task, status: Task["status"]) => void | Promise<unknown>;
    tasks: Task[];
  }) {
    return (
      <div data-testid="task-list-board-view">
        <button type="button">{addLabel}</button>
        {tasks[0] ? (
          <button type="button" onClick={() => void onStatusChange(tasks[0], "done")}>
            Status ändern
          </button>
        ) : null}
        {emptyState}
      </div>
    );
  },
}));

afterEach(() => {
  cleanup();
});

describe("SubtaskList", () => {
  it("rendert Unteraufgaben über TaskListBoardView mit Subtask-Empty-State", () => {
    const { container } = render(
      <SubtaskList
        subtasks={[]}
        viewMode="list"
        onViewModeChange={vi.fn()}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByTestId("task-list-board-view")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Neue Unteraufgabe" })).toBeInTheDocument();
    expect(screen.getByText("Keine Unteraufgaben")).toBeInTheDocument();
    expect(container.querySelector(".lucide-list-todo")).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Als erledigt markieren"]')).not.toBeInTheDocument();
  });

  it("verdrahtet Statusänderungen mit expectedVersion", async () => {
    const update = vi.fn();
    const subtask = {
      id: 7,
      title: "Unteraufgabe",
      status: "todo",
      version: 3,
      priority: "medium",
      description: null,
      dueDate: null,
      responsibleUserId: null,
      responsibleUser: null,
      parentId: 1,
      tags: [],
      subtaskCount: 0,
      commentCount: 0,
      noteCount: 0,
      attachmentCount: 0,
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
    } satisfies Task;

    render(
      <SubtaskList
        subtasks={[subtask]}
        viewMode="list"
        onViewModeChange={vi.fn()}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        onUpdate={update}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Status ändern" }));

    expect(update).toHaveBeenCalledWith(7, { status: "done", expectedVersion: 3 });
  });
});
