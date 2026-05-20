// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - MilestoneForm bindet das RichTextInlineField an den Formular-State.
 *
 * Fehlerfälle:
 * - Aktualisierte Beschreibung muss im Submit-Payload landen.
 *
 * Ziel:
 * Die Rich-Text-Integration im Meilensteinformular absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { Milestone, Project } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../ui/ToastProvider";
import { MilestoneForm } from "../MilestoneForm";

vi.mock("../../ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, placeholder, testIdPrefix }: { value: string | null | undefined; onChange: (value: string) => void; placeholder?: string; testIdPrefix?: string }) {
    return <textarea aria-label={placeholder ?? "Rich Text"} data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

vi.mock("../../tags/TagPicker", () => ({
  TagPicker() {
    return <div data-testid="tag-picker" />;
  }
}));

vi.mock("../../attachments/AttachmentList", () => ({
  AttachmentList() {
    return <div data-testid="attachment-list" />;
  }
}));

vi.mock("../../attachments/AttachmentUploader", () => ({
  AttachmentUploader() {
    return <div data-testid="attachment-uploader" />;
  }
}));

vi.mock("../../notes/NoteEditor", () => ({
  NoteEditor() {
    return null;
  }
}));

vi.mock("../../notes/NoteList", () => ({
  NoteList() {
    return <div data-testid="note-list" />;
  }
}));

vi.mock("../../tasks/OwnerTaskBoard", () => ({
  OwnerTaskBoard() {
    return <div data-testid="owner-task-board" />;
  }
}));

vi.mock("../../tickets/OwnerTicketBoard", () => ({
  OwnerTicketBoard() {
    return <div data-testid="owner-ticket-board" />;
  }
}));

vi.mock("../../../hooks/useFeatures", () => ({
  useFeatures() {
    return { features: [], loading: false };
  }
}));

vi.mock("../../../hooks/useMilestones", () => ({
  useMilestones() {
    return { milestones: [], loading: false };
  }
}));

vi.mock("../../../hooks/useDocLinks", () => ({
  useMilestoneFeatureLinks() {
    return {
      features: [],
      loading: false,
      setFeaturesForMilestone: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../hooks/useNotes", () => ({
  useNotes() {
    return {
      notes: [],
      createNote: vi.fn().mockResolvedValue(null),
      updateNote: vi.fn().mockResolvedValue(null),
      removeNote: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../hooks/useAttachments", () => ({
  useAttachments() {
    return {
      attachments: [],
      uploadAttachment: vi.fn().mockResolvedValue(null),
      removeAttachment: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../hooks/useEntityComments", () => ({
  useEntityComments() {
    return {
      comments: [],
      error: null,
      createComment: vi.fn(),
      removeComment: vi.fn()
    };
  }
}));

vi.mock("../../../hooks/useEvents", () => ({
  useEvents() {
    return {
      events: [],
      createEvent: vi.fn().mockResolvedValue(null),
      updateEvent: vi.fn().mockResolvedValue(null),
      removeEvent: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../hooks/useCalendarTasks", () => ({
  useCalendarTasks() {
    return { tasks: [], loading: false };
  }
}));

const project: Project = {
  id: 30,
  name: "Projekt Alpha",
  description: "<p>Projekt</p>",
  status: "active",
  color: "var(--color-steel-700)",
  startDate: null,
  dueDate: null,
  version: 1,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z",
  openTaskCount: 0,
  doneTaskCount: 0,
  totalTaskCount: 0,
  tags: []
};

const milestone: Milestone = {
  id: 35,
  projectId: project.id,
  name: "Meilenstein Alpha",
  description: "<p>Meilenstein Beschreibung</p>",
  status: "active",
  color: "var(--color-teal)",
  startDate: null,
  dueDate: null,
  version: 2,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z",
  taskCount: 0,
  openTaskCount: 0,
  doneTaskCount: 0,
  totalTaskCount: 0,
  ticketCount: 0,
  featureCount: 0,
  tags: []
};

function renderWithProviders(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MilestoneForm", () => {
  it("bindet RichTextInlineField an die Beschreibung", async () => {
    const onSubmit = vi.fn().mockResolvedValue(milestone);
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={onSubmit} onClose={vi.fn()} variant="page" />);

    expect(screen.getByTestId("milestone-description-view")).toHaveValue(milestone.description);
    fireEvent.change(screen.getByTestId("milestone-description-view"), { target: { value: "<p>Meilenstein aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Meilenstein aktualisiert</p>" }), []));
  });
});
