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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/dom";
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
  TagPicker({ selected, onChange }: { selected: Array<{ id: number; name: string; color: string }>; onChange: (tags: Array<{ id: number; name: string; color: string }>) => void }) {
    return (
      <button type="button" data-testid="tag-picker" onClick={() => onChange([{ id: 90, name: "tag", color: "#111111" }])}>
        Tags {selected.length}
      </button>
    );
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "test.admin", fullName: "Test Admin", email: "admin@local" },
    authenticated: true,
    loading: false,
    error: null
  })
}));

vi.mock("../../../../../apps/web/src/hooks/useUsers", () => ({
  useUsers: () => ({
    users: [{ id: 1, name: "test.admin", fullName: "Test Admin", email: "admin@local" }],
    loading: false,
    error: null
  })
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

const project: Project = {
  id: 30,
  name: "Projekt Alpha",
  description: "<p>Projekt</p>",
  status: "active",
  color: "var(--color-steel-700)",
  startDate: null,
  dueDate: null,
  wikiPageId: null,
  version: 1,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z",
  milestoneCount: 1,
  openTaskCount: 0,
  doneTaskCount: 0,
  totalTaskCount: 0,
  ticketCount: 0,
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0,
  tags: []
};

const otherProject: Project = {
  ...project,
  id: 31,
  name: "Projekt Beta"
};

const milestone: Milestone = {
  id: 35,
  projectId: project.id,
  name: "Meilenstein Alpha",
  description: "<p>Meilenstein Beschreibung</p>",
  status: "active",
  color: "var(--color-teal)",
  startDate: "2026-06-01",
  dueDate: "2026-06-30",
  responsibleUserId: 1,
  responsibleUser: { id: 1, name: "test.admin", fullName: "Test Admin", email: "admin@local" },
  version: 2,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z",
  taskCount: 0,
  openTaskCount: 0,
  doneTaskCount: 0,
  totalTaskCount: 0,
  ticketCount: 0,
  featureCount: 0,
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0,
  tags: []
};

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  const result = render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return {
    ...result,
    rerender(nextUi: ReactElement) {
      result.rerender(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>{nextUi}</ToastProvider>
          </QueryClientProvider>
        </MemoryRouter>
      );
    }
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MilestoneForm", () => {
  it("rendert Header-Icon in den Standardgrößen", () => {
    const { container } = renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    const headerIcon = container.querySelector(".lucide-flag");
    expect(headerIcon).toBeInTheDocument();
    expect(headerIcon).toHaveAttribute("width", "20");
    expect(headerIcon).toHaveAttribute("height", "20");
  });

  it("zeigt Create-Relationen mit den kanonischen Domain-Icons", () => {
    const { container } = renderWithProviders(<MilestoneForm open projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    fireEvent.click(screen.getByRole("button", { name: /^Aufgaben/ }));
    expect(screen.getByRole("button", { name: "Neue Aufgabe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verknüpfen" })).toBeInTheDocument();
    expect(screen.queryByTestId("owner-task-board")).not.toBeInTheDocument();
    expect(container.querySelector(".lucide-list-todo")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Tickets/ }));
    expect(screen.getByRole("button", { name: "Neues Ticket" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verknüpfen" })).toBeInTheDocument();
    expect(screen.queryByTestId("owner-ticket-board")).not.toBeInTheDocument();
    expect(container.querySelector(".lucide-bug")).toBeInTheDocument();
  });

  it("zeigt den Details-Tab ohne Counter", () => {
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Details 0" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Events/ })).not.toBeInTheDocument();
    expect(screen.getByTestId("form-sidebar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stammdaten schließen" })).toBeInTheDocument();
  });

  it("verdrahtet Body und Sidebar-Felder mit Initialdaten und Submit-Payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(milestone);
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project, otherProject]} onSubmit={onSubmit} onClose={vi.fn()} variant="page" />);

    const sidebar = screen.getByTestId("form-sidebar");
    const sidebarSelects = within(sidebar).getAllByRole("combobox");
    expect(screen.getByDisplayValue(milestone.name)).toBeInTheDocument();
    expect(screen.getByTestId("milestone-description-view")).toHaveValue(milestone.description);
    expect(within(sidebar).getByRole("combobox", { name: "Projekt" })).toHaveValue(String(project.id));
    expect(sidebarSelects[1]).toHaveValue("active");
    expect(within(sidebar).getByRole("combobox", { name: "Verantwortlich" })).toHaveValue("1");
    expect(within(sidebar).getByDisplayValue("2026-06-01")).toBeInTheDocument();
    expect(within(sidebar).getByDisplayValue("2026-06-30")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue(milestone.name), { target: { value: "Meilenstein Beta" } });
    fireEvent.change(within(sidebar).getByRole("combobox", { name: "Projekt" }), { target: { value: String(otherProject.id) } });
    fireEvent.change(sidebarSelects[1], { target: { value: "done" } });
    fireEvent.change(within(sidebar).getByRole("combobox", { name: "Verantwortlich" }), { target: { value: "" } });
    const dateInputs = within(sidebar).getAllByDisplayValue(/2026-06-/) as HTMLInputElement[];
    fireEvent.change(dateInputs[0], { target: { value: "2026-07-01" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-07-31" } });
    fireEvent.click(within(sidebar).getByTestId("tag-picker"));
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: otherProject.id,
          name: "Meilenstein Beta",
          status: "done",
          startDate: "2026-07-01",
          dueDate: "2026-07-31",
          responsibleUserId: null
        }),
        [90]
      )
    );
  });

  it("bindet RichTextInlineField an die Beschreibung", async () => {
    const onSubmit = vi.fn().mockResolvedValue(milestone);
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={onSubmit} onClose={vi.fn()} variant="page" />);

    expect(screen.getByTestId("milestone-description-view")).toHaveValue(milestone.description);
    fireEvent.change(screen.getByTestId("milestone-description-view"), { target: { value: "<p>Meilenstein aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Meilenstein aktualisiert</p>" }), []));
  });

  it("stellt Bild-Upload für die Beschreibung im Edit-Modus bereit", () => {
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    expect(screen.getByTestId("milestone-description-view")).toHaveAttribute("data-image-upload", "enabled");
  });

  it("behält den aktiven Tab bei einem Meilenstein-Refetch", () => {
    const { rerender } = renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    fireEvent.click(screen.getByRole("button", { name: /^Aufgaben/ }));
    expect(screen.getByTestId("owner-task-board")).toBeInTheDocument();

    rerender(<MilestoneForm open milestone={{ ...milestone, name: "Meilenstein Refetch" }} projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    expect(screen.getByTestId("owner-task-board")).toBeInTheDocument();
  });

  it("stellt Bild-Upload für die Beschreibung im Create-Modus bereit", () => {
    renderWithProviders(<MilestoneForm open projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    expect(screen.getByTestId("milestone-description-view")).toHaveAttribute("data-image-upload", "enabled");
  });

  it("sperrt die Projektauswahl im vorbelegten Create-Flow", () => {
    renderWithProviders(<MilestoneForm open projects={[project, otherProject]} initialProjectId={project.id} lockProjectSelection onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    const projectSelect = screen.getByRole("combobox", { name: "Projekt" });
    expect(projectSelect).toHaveValue(String(project.id));
    expect(projectSelect).toBeDisabled();
  });

  it("lässt die Projektauswahl ohne Sperr-Prop im Create-Flow änderbar", () => {
    renderWithProviders(<MilestoneForm open projects={[project, otherProject]} initialProjectId={project.id} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    const projectSelect = screen.getByRole("combobox", { name: "Projekt" });
    expect(projectSelect).toHaveValue(String(project.id));
    expect(projectSelect).not.toBeDisabled();
  });

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button, wenn onOpenInTab übergeben wird", () => {
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} onOpenInTab={vi.fn()} variant="page" />);

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });

  it("Details-Tab nutzt Flex-Fill-Layout damit der Editor die verfügbare Höhe ausfüllt", () => {
    renderWithProviders(<MilestoneForm open milestone={milestone} projects={[project]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    // Der Content-Wrapper neben der FormSidebar muss overflow-hidden haben (nicht overflow-auto),
    // damit die Flex-Fill-Kette zum Editor nicht unterbrochen wird.
    const contentWrapper = screen.getByDisplayValue(milestone.name)
      .closest("section")?.parentElement?.parentElement;
    expect(contentWrapper).toHaveClass("overflow-hidden");
    expect(contentWrapper).not.toHaveClass("overflow-auto");
    expect(contentWrapper).toHaveClass("flex", "flex-col");

    // FormField für Beschreibung hat flex-Layout (fill=true), nicht grid
    const descriptionTextarea = screen.getByTestId("milestone-description-view");
    expect(descriptionTextarea.parentElement).toHaveClass("flex");
    expect(descriptionTextarea.parentElement).not.toHaveClass("grid");
  });
});
