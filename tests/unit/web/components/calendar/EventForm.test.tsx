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
import { fireEvent, screen, waitFor, within } from "@testing-library/dom";
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

vi.mock("../../../../../apps/web/src/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, name: "test.admin", fullName: "Test Admin", email: "admin@local" } })
}));

vi.mock("../../../../../apps/web/src/hooks/useUsers", () => ({
  useUsers: () => ({ users: [{ id: 1, name: "test.admin", fullName: "Test Admin", email: "admin@local" }], loading: false, error: null })
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
    responsibleUserId: null,
    responsibleUser: null,
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
    responsibleUserId: null,
    responsibleUser: null,
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
    responsibleUserId: null,
    responsibleUser: null,
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
    responsibleUserId: null,
    responsibleUser: null,
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
  responsibleUserId: null,
  responsibleUser: null,
  version: 3,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T08:00:00.000Z"
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EventForm", () => {
  it("verdrahtet Body und Stammdaten-Sidebar mit Initialdaten und Submit-Payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EventForm open event={event} projects={projects} tasks={tasks} onSubmit={onSubmit} onDelete={vi.fn()} onClose={vi.fn()} />);

    const sidebar = screen.getByTestId("form-sidebar");
    expect(screen.getByDisplayValue(event.title)).toBeInTheDocument();
    expect(screen.getByTestId("event-description-view")).toHaveValue("");
    expect(within(sidebar).getByLabelText("Ganztägig")).not.toBeChecked();
    expect(within(sidebar).getByDisplayValue("2026-06-01T10:00")).toBeInTheDocument();
    expect(within(sidebar).getByDisplayValue("2026-06-01T11:00")).toBeInTheDocument();
    expect(within(sidebar).getByLabelText("Erinnerung")).toHaveValue("60");
    expect(within(sidebar).getByRole("combobox", { name: "Verantwortlich" })).toHaveValue("");
    expect(within(sidebar).queryByText("Farbe")).not.toBeInTheDocument();
    expect(screen.queryByText("Zuordnung")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Projekt B")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Aufgabe B")).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue(event.title), { target: { value: "Termin Beta" } });
    fireEvent.click(within(sidebar).getByLabelText("Ganztägig"));
    const dateInputs = within(sidebar).getAllByDisplayValue(/2026-06-01T/) as HTMLInputElement[];
    fireEvent.change(dateInputs[0], { target: { value: "2026-06-02T12:00" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-06-02T13:00" } });
    fireEvent.change(within(sidebar).getByLabelText("Erinnerung"), { target: { value: "1440" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Termin Beta",
          isAllDay: true,
          startTime: expect.stringMatching(/^2026-06-02T/),
          endTime: expect.stringMatching(/^2026-06-02T/),
          color: "#123456",
          reminderMinutes: 1440,
          owners: [
            { type: "project", id: 2 },
            { type: "task", id: 12 }
          ]
        }),
        event.id
      )
    );
  });

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
    expect(screen.queryByText("Zuordnung")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Projekt A")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Aufgabe A")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Erinnerung"), { target: { value: "1440" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Neuer Termin",
          reminderMinutes: 1440,
          owners: []
        }),
        undefined
      )
    );
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("projectId");
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("taskId");
  });

  it("entfernt Verknüpfungselemente beim Bearbeiten und bewahrt vorhandene Owner", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EventForm open event={event} projects={projects} tasks={tasks} onSubmit={onSubmit} onDelete={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByLabelText("Projekt A")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Projekt B")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Aufgabe A")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Aufgabe B")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          owners: [
            { type: "project", id: 2 },
            { type: "task", id: 12 }
          ]
        }),
        event.id
      )
    );
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
