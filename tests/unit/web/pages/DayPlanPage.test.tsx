// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte DayPlanPage mit gemockten Child-Komponenten für Dashboard, Task-Board und Modale.
 *
 * Mock-Entscheidung:
 * - Datenhooks und schwere Child-Komponenten werden gemockt, weil die Tab- und Create-Verdrahtung der Seite geprüft wird.
 *
 * Isolation:
 * - jsdom ohne DB-, API- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - Der Kalender-Tab rendert den Dashboard-Kontext dayPlanCalendar.
 * - Der Aufgaben-Tab verwendet TaskListBoardView und keinen Verknüpfen-Button.
 * - Der Aufgaben-Create-Flow öffnet das TaskForm-Modal.
 *
 * Fehlerfälle:
 * - Rückfall auf alte Aufgaben-UI oder falschen Dashboard-Kontext.
 *
 * Ziel:
 * Die persönliche Planung gegen Regressionen in Tab-Reihenfolge, Aufgabenansicht und Create-Flow absichern.
 */

import "@testing-library/jest-dom/vitest";
import type { TaskBoardItem } from "@taskmanager/shared-types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DayPlanPage } from "../../../../apps/web/src/pages/DayPlanPage";

const createTaskMock = vi.hoisted(() => vi.fn());
const unlinkTaskMock = vi.hoisted(() => vi.fn());
const updateTaskMock = vi.hoisted(() => vi.fn());

const tasks: TaskBoardItem[] = [
  {
    id: 1,
    title: "Tagesaufgabe",
    description: null,
    status: "active",
    priority: "medium",
    responsibleUserId: null,
    responsibleUser: null,
    dueDate: "2026-05-31",
    completedAt: null,
    version: 1,
    createdAt: "2026-05-31T08:00:00.000Z",
    updatedAt: "2026-05-31T08:00:00.000Z",
    tags: [],
    subtaskCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    boardPosition: 0,
  },
];

vi.mock("../../../../apps/web/src/hooks/useDayPlan", () => ({
  useDayPlan: () => ({
    dayPlan: { id: 7, tasks },
    loading: false,
    error: null,
    createTask: createTaskMock,
    unlinkTask: unlinkTaskMock,
    updateTask: updateTaskMock,
  }),
}));

vi.mock("../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs: () => ({
    entries: [],
    loading: false,
    error: null,
  }),
}));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true,
}));

vi.mock("../../../../apps/web/src/hooks/useViewMode", () => ({
  useViewMode: () => ({ viewMode: "list", setViewMode: vi.fn() }),
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("../../../../apps/web/src/components/dashboard/DashboardView", () => ({
  DashboardView: ({ context }: { context: string }) => <div data-testid="dashboard-view" data-context={context} />,
}));

vi.mock("../../../../apps/web/src/components/tasks/TaskListBoardView", () => ({
  TaskListBoardView: ({ onAdd }: { onAdd: () => void }) => (
    <section data-testid="task-list-board-view">
      <button type="button" onClick={onAdd}>
        Aufgabe anlegen
      </button>
    </section>
  ),
}));

vi.mock("../../../../apps/web/src/components/tasks/TaskForm", () => ({
  TaskForm: ({ open }: { open: boolean }) => (open ? <div role="dialog" data-testid="task-form" /> : null),
}));

vi.mock("../../../../apps/web/src/components/notes/NoteList", () => ({
  NoteList: () => <div data-testid="note-list" />,
}));

vi.mock("../../../../apps/web/src/components/notes/NoteEditor", () => ({
  NoteEditor: () => null,
}));

vi.mock("../../../../apps/web/src/components/ui/CommentThread", () => ({
  CommentThread: () => <div data-testid="comment-thread" />,
}));

vi.mock("../../../../apps/web/src/components/journal/JournalPanel", () => ({
  JournalPanel: () => <div data-testid="journal-panel" />,
}));

afterEach(() => {
  cleanup();
  createTaskMock.mockReset();
  unlinkTaskMock.mockReset();
  updateTaskMock.mockReset();
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/day-plan"]}>
      <DayPlanPage />
    </MemoryRouter>,
  );
}

describe("DayPlanPage", () => {
  it("rendert den Kalender-Tab direkt nach Übersicht mit eigenem Dashboard-Kontext", () => {
    renderPage();

    const tabLabels = screen.getAllByRole("button").map((button) => button.textContent?.trim() ?? "");
    expect(tabLabels.indexOf("Übersicht")).toBeLessThan(tabLabels.indexOf("Kalender"));
    expect(tabLabels.indexOf("Kalender")).toBeLessThan(tabLabels.findIndex((label) => label.startsWith("Aufgaben")));

    fireEvent.click(screen.getByRole("button", { name: "Kalender" }));

    expect(screen.getByTestId("dashboard-view")).toHaveAttribute("data-context", "dayPlanCalendar");
  });

  it("nutzt im Aufgaben-Tab TaskListBoardView ohne Verknüpfen-Button und öffnet den Create-Flow", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Aufgaben/ }));

    expect(screen.getByTestId("task-list-board-view")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Verknüpfen/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aufgabe anlegen" }));

    expect(screen.getByTestId("task-form")).toBeInTheDocument();
  });
});
