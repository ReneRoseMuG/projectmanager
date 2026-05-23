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
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";
import { MilestoneForm } from "../../../../../apps/web/src/components/milestones/MilestoneForm";

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, placeholder, testIdPrefix, onImageUpload }: { value: string | null | undefined; onChange: (value: string) => void; placeholder?: string; testIdPrefix?: string; onImageUpload?: (file: File) => Promise<string> }) {
    return <textarea aria-label={placeholder ?? "Rich Text"} data-image-upload={onImageUpload ? "enabled" : "disabled"} data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  hasPermission: () => false,
  useHasPermission: () => false
}));

vi.mock("../../../../../apps/web/src/components/tags/TagPicker", () => ({
  TagPicker() {
    return <div data-testid="tag-picker" />;
  }
}));

vi.mock("../../../../../apps/web/src/components/attachments/AttachmentList", () => ({
  AttachmentList() {
    return <div data-testid="attachment-list" />;
  }
}));

vi.mock("../../../../../apps/web/src/components/attachments/AttachmentUploader", () => ({
  AttachmentUploader() {
    return <div data-testid="attachment-uploader" />;
  }
}));

vi.mock("../../../../../apps/web/src/components/notes/NoteEditor", () => ({
  NoteEditor() {
    return null;
  }
}));

vi.mock("../../../../../apps/web/src/components/notes/NoteList", () => ({
  NoteList() {
    return <div data-testid="note-list" />;
  }
}));

vi.mock("../../../../../apps/web/src/components/tasks/OwnerTaskBoard", () => ({
  OwnerTaskBoard() {
    return <div data-testid="owner-task-board" />;
  }
}));

vi.mock("../../../../../apps/web/src/components/tickets/OwnerTicketBoard", () => ({
  OwnerTicketBoard() {
    return <div data-testid="owner-ticket-board" />;
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useFeatures", () => ({
  useFeatures() {
    return { features: [], loading: false };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useMilestones", () => ({
  useMilestones() {
    return { milestones: [], loading: false };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useTasks", () => ({
  useTasks() {
    return {
      tasks: [],
      loading: false,
      error: null,
      reload: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useTickets", () => ({
  useTickets() {
    return {
      tickets: [],
      loading: false,
      reload: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    const entries = [
      { id: 1, kind: "workStatus", key: "active", label: "Aktiv", sortOrder: 100, isClosed: false, color: "var(--color-fern)", version: 1, createdAt: "", updatedAt: "" },
      { id: 2, kind: "workStatus", key: "done", label: "Erledigt", sortOrder: 200, isClosed: true, color: "var(--color-steel-500)", version: 1, createdAt: "", updatedAt: "" },
      { id: 3, kind: "featureStatus", key: "active", label: "Aktiv", sortOrder: 100, isClosed: false, color: "var(--color-tangerine)", version: 1, createdAt: "", updatedAt: "" },
      { id: 4, kind: "priority", key: "medium", label: "Mittel", sortOrder: 100, isClosed: false, color: "var(--color-mustard)", version: 1, createdAt: "", updatedAt: "" }
    ];
    return {
      entries,
      workStatuses: entries.filter((entry) => entry.kind === "workStatus"),
      featureStatuses: entries.filter((entry) => entry.kind === "featureStatus"),
      priorities: entries.filter((entry) => entry.kind === "priority"),
      ticketTypes: [],
      loading: false,
      error: null,
      createEntry: vi.fn(),
      updateEntry: vi.fn(),
      deleteEntry: vi.fn(),
      reload: vi.fn()
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useDocLinks", () => ({
  useMilestoneFeatureLinks() {
    return {
      features: [],
      loading: false,
      setFeaturesForMilestone: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useNotes", () => ({
  useNotes() {
    return {
      notes: [],
      createNote: vi.fn().mockResolvedValue(null),
      updateNote: vi.fn().mockResolvedValue(null),
      removeNote: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useAttachments", () => ({
  useAttachments() {
    return {
      attachments: [],
      uploadAttachment: vi.fn().mockResolvedValue(null),
      removeAttachment: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useEntityComments", () => ({
  useEntityComments() {
    return {
      comments: [],
      error: null,
      createComment: vi.fn(),
      removeComment: vi.fn()
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useEvents", () => ({
  useEvents() {
    return {
      events: [],
      createEvent: vi.fn().mockResolvedValue(null),
      updateEvent: vi.fn().mockResolvedValue(null),
      removeEvent: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useCalendarTasks", () => ({
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
  it("zeigt den Stammdaten-Tab ohne Counter", () => {
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    expect(screen.getByRole("button", { name: "Stammdaten" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stammdaten 0" })).not.toBeInTheDocument();
  });

  it("bindet RichTextInlineField an die Beschreibung", async () => {
    const onSubmit = vi.fn().mockResolvedValue(milestone);
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={onSubmit} onClose={vi.fn()} variant="page" />);

    expect(screen.getByTestId("milestone-description-view")).toHaveValue(milestone.description);
    fireEvent.change(screen.getByTestId("milestone-description-view"), { target: { value: "<p>Meilenstein aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Meilenstein aktualisiert</p>" }), []));
  });

  it("stellt Bild-Upload für die Beschreibung nur im Edit-Modus bereit", () => {
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    expect(screen.getByTestId("milestone-description-view")).toHaveAttribute("data-image-upload", "enabled");
  });

  it("deaktiviert Bild-Upload für die Beschreibung im Create-Modus", () => {
    renderWithProviders(<MilestoneForm open projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    expect(screen.getByTestId("milestone-description-view")).toHaveAttribute("data-image-upload", "disabled");
  });

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button, wenn onOpenInTab übergeben wird", () => {
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} onOpenInTab={vi.fn()} variant="page" />);

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });
});
