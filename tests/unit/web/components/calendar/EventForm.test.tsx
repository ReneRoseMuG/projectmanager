// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - EventForm erstellt Event-Payloads mit mehreren Projekt- und Aufgaben-Ownern.
 * - Bestehende Event-Owner werden beim Bearbeiten vorausgewählt.
 *
 * Fehlerfälle:
 * - Direkte `projectId`-/`taskId`-Felder dürfen nicht mehr gesendet werden.
 *
 * Ziel:
 * Die ownerbasierte Calendar-Event-Form gegen DTO-Rückschritte absichern.
 */

import "@testing-library/jest-dom/vitest";
import type { CalendarEvent, Project, Task } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventForm } from "../../../../../apps/web/src/components/calendar/EventForm";

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, placeholder, testIdPrefix }: { value: string | null | undefined; onChange: (value: string) => void; placeholder?: string; testIdPrefix?: string }) {
    return <textarea aria-label={placeholder ?? "Editor"} data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  hasPermission: () => false,
  useHasPermission: () => false
}));

const projects: Project[] = [
  {
    id: 1,
    name: "Projekt A",
    description: null,
    status: "active",
    color: "#111111",
    startDate: null,
    dueDate: null,
    wikiPageId: null,
    version: 1,
    createdAt: "2026-05-19T08:00:00.000Z",
    updatedAt: "2026-05-19T08:00:00.000Z",
    milestoneCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: []
  },
  {
    id: 2,
    name: "Projekt B",
    description: null,
    status: "active",
    color: "#222222",
    startDate: null,
    dueDate: null,
    wikiPageId: null,
    version: 1,
    createdAt: "2026-05-19T08:00:00.000Z",
    updatedAt: "2026-05-19T08:00:00.000Z",
    milestoneCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: []
  }
];

const tasks: Task[] = [
  {
    id: 11,
    parentId: null,
    title: "Aufgabe A",
    description: null,
    status: "todo",
    priority: "medium",
    assignee: null,
    dueDate: null,
    version: 1,
    createdAt: "2026-05-19T08:00:00.000Z",
    updatedAt: "2026-05-19T08:00:00.000Z",
    tags: [],
    subtaskCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0
  },
  {
    id: 12,
    parentId: null,
    title: "Aufgabe B",
    description: null,
    status: "todo",
    priority: "medium",
    assignee: null,
    dueDate: null,
    version: 1,
    createdAt: "2026-05-19T08:00:00.000Z",
    updatedAt: "2026-05-19T08:00:00.000Z",
    tags: [],
    subtaskCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0
  }
];

const event: CalendarEvent = {
  id: 99,
  owners: [
    { type: "project", id: 2 },
    { type: "task", id: 12 }
  ],
  title: "Bestehender Termin",
  description: null,
  startTime: "2026-06-01T10:00:00.000Z",
  endTime: "2026-06-01T11:00:00.000Z",
  isAllDay: false,
  color: "#123456",
  reminderMinutes: 60,
  version: 3,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T08:00:00.000Z"
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EventForm", () => {
  it("bindet das RichTextInlineField an die Eventbeschreibung", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EventForm open event={event} projects={projects} tasks={tasks} onSubmit={onSubmit} onDelete={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("event-description-view")).toHaveValue("");
    fireEvent.change(screen.getByTestId("event-description-view"), { target: { value: "<p>Termin aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Termin aktualisiert</p>" }), event.id));
  });

  it("sendet owners statt direkter Owner-Felder", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <EventForm open event={null} initialDate="2026-06-01T00:00:00.000Z" projects={projects} tasks={tasks} onSubmit={onSubmit} onDelete={vi.fn()} onClose={vi.fn()} />
    );

    const titleInput = document.querySelector("input[required]");
    expect(titleInput).not.toBeNull();
    fireEvent.change(titleInput as HTMLInputElement, { target: { value: "Neuer Termin" } });
    fireEvent.click(screen.getByLabelText("Projekt A"));
    fireEvent.click(screen.getByLabelText("Projekt B"));
    fireEvent.click(screen.getByLabelText("Aufgabe A"));
    fireEvent.change(screen.getByLabelText("Erinnerung"), { target: { value: "1440" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Neuer Termin",
          reminderMinutes: 1440,
          owners: [
            { type: "project", id: 1 },
            { type: "project", id: 2 },
            { type: "task", id: 11 }
          ]
        }),
        undefined
      )
    );
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("projectId");
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("taskId");
  });

  it("wählt vorhandene Owner beim Bearbeiten voraus", () => {
    render(<EventForm open event={event} projects={projects} tasks={tasks} onSubmit={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByLabelText("Projekt A")).not.toBeChecked();
    expect(screen.getByLabelText("Projekt B")).toBeChecked();
    expect(screen.getByLabelText("Aufgabe A")).not.toBeChecked();
    expect(screen.getByLabelText("Aufgabe B")).toBeChecked();
  });

  it("erhaelt DayPlan-Owner beim Bearbeiten eines Tagesplan-Termins", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <EventForm
        open
        event={{ ...event, owners: [...event.owners, { type: "dayPlan", id: 7 }] }}
        projects={projects}
        tasks={tasks}
        onSubmit={onSubmit}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          owners: expect.arrayContaining([
            { type: "dayPlan", id: 7 },
            { type: "project", id: 2 },
            { type: "task", id: 12 }
          ])
        }),
        event.id
      )
    );
  });
});
