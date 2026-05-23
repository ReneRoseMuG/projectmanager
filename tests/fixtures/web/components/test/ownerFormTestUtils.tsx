import "@testing-library/jest-dom/vitest";
import type {
  Attachment,
  BacklogItem,
  Comment,
  Feature,
  Milestone,
  Note,
  Project,
  Task,
  Ticket,
  TicketDetail,
  UseCase
} from "@taskmanager/shared-types";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { afterEach, beforeEach, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";

const ownerFormMocks = vi.hoisted(() => ({
  createUseCase: vi.fn(),
  updateUseCase: vi.fn(),
  createSubtask: vi.fn(),
  createSubTicket: vi.fn(),
  uploadAttachment: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  removeNote: vi.fn(),
  createFeature: vi.fn(),
  setFeaturesForProject: vi.fn(),
  addProjectToFeature: vi.fn(),
  removeProjectFromFeature: vi.fn(),
  createComment: vi.fn(),
  removeComment: vi.fn(),
  addTicketRelation: vi.fn(),
  removeTicketRelation: vi.fn(),
  getTicketLinkCandidates: vi.fn(),
  getTicketRelationCandidates: vi.fn(),
  removeMilestone: vi.fn(),
  createBacklogItem: vi.fn(),
  updateBacklogItem: vi.fn(),
  removeBacklogItem: vi.fn(),
  previewImport: vi.fn(),
  runImport: vi.fn()
}));

const fixtures = vi.hoisted(() => {
  const feature = {
    id: 10,
    title: "Feature Alpha",
    status: "active",
    description: "<p>Beschreibung</p>",
    content: "<p>Inhalt</p>",
    contentPath: null,
    sortOrder: 1,
    useCaseCount: 1,
    version: 1,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z"
  };
  const useCase = {
    id: 20,
    featureId: feature.id,
    title: "Use Case Alpha",
    status: "active",
    description: "<p>Beschreibung</p>",
    content: "<p>Inhalt</p>",
    contentPath: null,
    sortOrder: 1,
    version: 1,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z"
  };
  const project = {
    id: 30,
    name: "Projekt Alpha",
    description: "<p>Projekt</p>",
    status: "active",
    color: "var(--color-steel-700)",
    startDate: null,
    dueDate: null,
    version: 1,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    openTaskCount: 1,
    doneTaskCount: 0,
    totalTaskCount: 1,
    tags: []
  };
  const milestone = {
    id: 35,
    projectId: project.id,
    name: "Meilenstein Alpha",
    description: "<p>Meilenstein</p>",
    status: "active",
    color: "var(--color-teal)",
    startDate: null,
    dueDate: null,
    version: 1,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    taskCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    featureCount: 0,
    tags: []
  };
  const task = {
    id: 40,
    projectId: project.id,
    parentId: null,
    title: "Aufgabe Alpha",
    description: "<p>Aufgabe</p>",
    status: "todo",
    priority: "medium",
    assignee: null,
    dueDate: null,
    version: 1,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    tags: [],
    subtaskCount: 1
  };
  const ticket = {
    id: 50,
    projectId: project.id,
    parentId: null,
    type: "bug",
    title: "Ticket Alpha",
    description: "<p>Ticket</p>",
    status: "open",
    priority: "medium",
    resolution: null,
    reporter: null,
    assignee: null,
    environment: null,
    affectedVersion: null,
    dueDate: null,
    resolvedAt: null,
    position: 1024,
    version: 1,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    tags: [],
    subTicketCount: 0
  };
  const comment = {
    id: 60,
    owners: [{ type: "project", id: project.id }],
    body: "<p>Kommentar</p>",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    version: 1
  };
  const note = {
    id: 70,
    title: "Notiz Alpha",
    contentJson: {},
    version: 1,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z"
  };
  const attachment = {
    id: 80,
    originalName: "datei.txt",
    filename: "datei.txt",
    mimetype: "text/plain",
    size: 12,
    url: "/uploads/datei.txt",
    owners: [{ type: "project", id: project.id }],
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    version: 1
  };
  const taskDetail = {
    ...task,
    subtasks: [{ ...task, id: 41, parentId: task.id, title: "Subtask Alpha", subtaskCount: 0 }],
    comments: [comment],
    notes: [note],
    attachments: [attachment]
  };
  const relatedTicket = {
    ...ticket,
    id: 51,
    title: "Ticket Bravo",
    subTicketCount: 0
  };
  const ticketDetail = {
    ...ticket,
    comments: [comment],
    notes: [note],
    attachments: [attachment],
    relations: [{ id: 91, relationType: "related", direction: "outgoing", ticket: relatedTicket }],
    subTickets: [{ ...ticket, id: 52, parentId: ticket.id, title: "Sub-Ticket Alpha", subTicketCount: 0 }]
  };

  return { attachment, comment, feature, milestone, note, project, task, taskDetail, ticket, ticketDetail, useCase };
});

vi.mock("../../../../../apps/web/src/api/tickets", () => ({
  getTicketLinkCandidates: ownerFormMocks.getTicketLinkCandidates,
  getTicketRelationCandidates: ownerFormMocks.getTicketRelationCandidates
}));

export const feature = fixtures.feature as Feature;
export const useCase = fixtures.useCase as UseCase;
export const project = fixtures.project as Project;
export const milestone = fixtures.milestone as Milestone;
export const task = fixtures.task as Task;
export const ticket = fixtures.ticket as Ticket;
export const ticketDetail = fixtures.ticketDetail as TicketDetail;

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({
    value,
    onChange,
    placeholder,
    testIdPrefix,
    onImageUpload
  }: {
    value: string | null | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    testIdPrefix?: string;
    onImageUpload?: (file: File) => Promise<string>;
  }) {
    return <textarea aria-label={placeholder ?? "Rich Text"} data-image-upload={onImageUpload ? "enabled" : "disabled"} data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  hasPermission: () => false,
  useHasPermission: () => false
}));

vi.mock("../../../../../apps/web/src/components/tasks/OwnerTaskBoard", () => ({
  OwnerTaskBoard({ owner }: { owner: { type: string; id: number } }) {
    return <div data-testid="owner-task-board">{`${owner.type}:${owner.id}`}</div>;
  }
}));

vi.mock("../../../../../apps/web/src/components/tickets/OwnerTicketBoard", () => ({
  OwnerTicketBoard({ owner }: { owner: { type: string; id: number } }) {
    return <div data-testid="owner-ticket-board">{`${owner.type}:${owner.id}`}</div>;
  }
}));

vi.mock("../../../../../apps/web/src/components/tasks/TaskLinkDialog", () => ({
  TaskLinkDialog({ open, onLink, onClose }: { open: boolean; onLink: (task: Task) => Promise<void>; onClose: () => void }) {
    if (!open) {
      return null;
    }
    return (
      <div role="dialog" aria-label="Aufgabe verknüpfen">
        <button type="button" onClick={() => void onLink(fixtures.task as Task)}>
          Aufgabe wählen
        </button>
        <button type="button" onClick={onClose}>
          Schließen
        </button>
      </div>
    );
  }
}));

vi.mock("../../../../../apps/web/src/components/tickets/TicketLinkDialog", () => ({
  TicketLinkDialog({ open, onLink, onClose }: { open: boolean; onLink: (ticket: Ticket) => Promise<void>; onClose: () => void }) {
    if (!open) {
      return null;
    }
    return (
      <div role="dialog" aria-label="Ticket verknüpfen">
        <button type="button" onClick={() => void onLink(fixtures.ticket as Ticket)}>
          Ticket wählen
        </button>
        <button type="button" onClick={onClose}>
          Schließen
        </button>
      </div>
    );
  }
}));

vi.mock("../../../../../apps/web/src/components/ui/CommentThread", () => ({
  CommentThread({ comments, entityLabel }: { comments: Comment[]; entityLabel?: string }) {
    return <div data-testid="comment-thread">{`${entityLabel ?? "Entity"}:${comments.length}`}</div>;
  }
}));

vi.mock("../../../../../apps/web/src/components/tags/TagPicker", () => ({
  TagPicker({ selected, onChange }: { selected: Array<{ id: number; name: string; color: string }>; onChange: (tags: Array<{ id: number; name: string; color: string }>) => void }) {
    return (
      <button type="button" onClick={() => onChange([{ id: 90, name: "tag", color: "#111111" }])}>
        Tags {selected.length}
      </button>
    );
  }
}));

vi.mock("../../../../../apps/web/src/components/attachments/AttachmentUploader", () => ({
  AttachmentUploader() {
    return <div data-testid="attachment-uploader">Uploader</div>;
  }
}));

vi.mock("../../../../../apps/web/src/components/attachments/AttachmentList", () => ({
  AttachmentList({ attachments }: { attachments: Attachment[] }) {
    return <div data-testid="attachment-list">{attachments.length}</div>;
  }
}));

vi.mock("../../../../../apps/web/src/components/notes/NoteList", () => ({
  NoteList({ notes }: { notes: Note[] }) {
    return <div data-testid="note-list">{notes.length}</div>;
  }
}));

vi.mock("../../../../../apps/web/src/components/notes/NoteEditor", () => ({
  NoteEditor() {
    return null;
  }
}));

vi.mock("../../../../../apps/web/src/components/usecases/UseCaseListBoardView", () => ({
  UseCaseListBoardView({ useCases }: { useCases: UseCase[] }) {
    return <div data-testid="usecase-list">{useCases.length}</div>;
  }
}));

vi.mock("../../../../../apps/web/src/components/features/FeatureProjectPanel", () => ({
  FeatureProjectPanel({ projects }: { projects: Project[] }) {
    return <div data-testid="feature-project-panel">{projects.length}</div>;
  }
}));

vi.mock("../../../../../apps/web/src/components/features/ProjectFeaturePanel", () => ({
  ProjectFeaturePanel({ features }: { features: Feature[] }) {
    return <div data-testid="project-feature-panel">{features.length}</div>;
  }
}));

vi.mock("../../../../../apps/web/src/components/backlog/BacklogListBoardView", () => ({
  BacklogListBoardView({ items }: { items: BacklogItem[] }) {
    return <div data-testid="backlog-list">{items.length}</div>;
  }
}));

vi.mock("../../../../../apps/web/src/components/backlog/BacklogItemForm", () => ({
  BacklogItemForm() {
    return null;
  }
}));

vi.mock("../../../../../apps/web/src/components/imports/WikiImportPanel", () => ({
  WikiImportPanel() {
    return <div data-testid="wiki-import-panel">Import</div>;
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useEntityComments", () => ({
  useEntityComments() {
    return {
      comments: [fixtures.comment],
      error: null,
      createComment: ownerFormMocks.createComment,
      removeComment: ownerFormMocks.removeComment
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useTaskDetail", () => ({
  useTaskDetail(taskId: number | null) {
    return {
      task: taskId ? fixtures.taskDetail : null,
      loading: false,
      error: null,
      reload: vi.fn().mockResolvedValue(undefined),
      createSubtask: ownerFormMocks.createSubtask,
      updateSubtask: vi.fn().mockResolvedValue(fixtures.task),
      removeSubtask: vi.fn().mockResolvedValue(undefined),
      createComment: ownerFormMocks.createComment,
      removeComment: ownerFormMocks.removeComment
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useTicketDetail", () => ({
  useTicketDetail(ticketId: number | null) {
    return {
      ticket: ticketId ? fixtures.ticketDetail : null,
      loading: false,
      error: null,
      reload: vi.fn().mockResolvedValue(undefined),
      updateTicket: vi.fn().mockResolvedValue(fixtures.ticket),
      updateTags: vi.fn().mockResolvedValue([]),
      createSubTicket: ownerFormMocks.createSubTicket,
      updateSubTicket: vi.fn().mockResolvedValue(fixtures.ticket),
      removeSubTicket: vi.fn().mockResolvedValue(undefined),
      addRelation: ownerFormMocks.addTicketRelation,
      removeRelation: ownerFormMocks.removeTicketRelation,
      createComment: ownerFormMocks.createComment,
      removeComment: ownerFormMocks.removeComment
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useTasks", () => ({
  useTasks() {
    return {
      tasks: [fixtures.task],
      loading: false,
      error: null,
      reload: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useNotes", () => ({
  useNotes() {
    return {
      notes: [fixtures.note],
      createNote: ownerFormMocks.createNote,
      updateNote: ownerFormMocks.updateNote,
      removeNote: ownerFormMocks.removeNote
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useAttachments", () => ({
  useAttachments() {
    return {
      attachments: [fixtures.attachment],
      uploadAttachment: ownerFormMocks.uploadAttachment,
      removeAttachment: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useProjects", () => ({
  useProjects() {
    return {
      projects: [fixtures.project],
      loading: false,
      reload: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useMilestones", () => ({
  useMilestones() {
    return {
      milestones: [fixtures.milestone],
      loading: false,
      removeMilestone: ownerFormMocks.removeMilestone,
      reload: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useUseCases", () => ({
  useUseCases() {
    return {
      useCases: [fixtures.useCase],
      loading: false,
      createUseCase: ownerFormMocks.createUseCase,
      updateUseCase: ownerFormMocks.updateUseCase,
      reload: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useDocLinks", () => ({
  useFeatureProjectLinks() {
    return {
      linkedProjects: [fixtures.project],
      projects: [fixtures.project],
      loading: false,
      addProjectToFeature: ownerFormMocks.addProjectToFeature,
      removeProjectFromFeature: ownerFormMocks.removeProjectFromFeature,
      reload: vi.fn().mockResolvedValue(undefined)
    };
  },
  useProjectFeatureLinks() {
    return {
      features: [fixtures.feature],
      loading: false,
      setFeaturesForProject: ownerFormMocks.setFeaturesForProject,
      reload: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useFeatures", () => ({
  useFeatures() {
    return {
      features: [fixtures.feature],
      loading: false,
      createFeature: ownerFormMocks.createFeature,
      reload: vi.fn().mockResolvedValue(undefined)
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useTickets", () => ({
  useTickets() {
    return {
      tickets: [fixtures.ticket],
      loading: false
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useBacklog", () => ({
  useBacklog() {
    return {
      items: [],
      loading: false,
      statusFilter: "all",
      setStatusFilter: vi.fn(),
      createItem: ownerFormMocks.createBacklogItem,
      updateItem: ownerFormMocks.updateBacklogItem,
      removeItem: ownerFormMocks.removeBacklogItem
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    const entries = [
      { id: 1, kind: "workStatus", key: "active", label: "Aktiv", sortOrder: 100, isClosed: false, color: "var(--color-fern)", version: 1, createdAt: "", updatedAt: "" },
      { id: 2, kind: "workStatus", key: "open", label: "Offen", sortOrder: 200, isClosed: false, color: "var(--color-fern)", version: 1, createdAt: "", updatedAt: "" },
      { id: 3, kind: "workStatus", key: "todo", label: "Offen", sortOrder: 300, isClosed: false, color: "var(--color-fern)", version: 1, createdAt: "", updatedAt: "" },
      { id: 4, kind: "workStatus", key: "in_progress", label: "In Arbeit", sortOrder: 350, isClosed: false, color: "var(--color-tangerine)", version: 1, createdAt: "", updatedAt: "" },
      { id: 5, kind: "workStatus", key: "done", label: "Erledigt", sortOrder: 400, isClosed: true, color: "var(--color-steel-500)", version: 1, createdAt: "", updatedAt: "" },
      { id: 6, kind: "workStatus", key: "closed", label: "Geschlossen", sortOrder: 500, isClosed: true, color: "var(--color-steel-500)", version: 1, createdAt: "", updatedAt: "" },
      { id: 7, kind: "featureStatus", key: "draft", label: "Entwurf", sortOrder: 100, isClosed: false, color: "var(--color-violet)", version: 1, createdAt: "", updatedAt: "" },
      { id: 8, kind: "featureStatus", key: "active", label: "Aktiv", sortOrder: 200, isClosed: false, color: "var(--color-tangerine)", version: 1, createdAt: "", updatedAt: "" },
      { id: 9, kind: "featureStatus", key: "done", label: "Erledigt", sortOrder: 300, isClosed: true, color: "var(--color-steel-500)", version: 1, createdAt: "", updatedAt: "" },
      { id: 10, kind: "priority", key: "medium", label: "Mittel", sortOrder: 200, isClosed: false, color: "var(--color-mustard)", version: 1, createdAt: "", updatedAt: "" },
      { id: 11, kind: "ticketType", key: "bug", label: "Bug", sortOrder: 100, isClosed: false, color: "var(--color-crimson)", version: 1, createdAt: "", updatedAt: "" },
      { id: 12, kind: "ticketType", key: "question", label: "Frage", sortOrder: 200, isClosed: false, color: "var(--color-violet)", version: 1, createdAt: "", updatedAt: "" }
    ];
    return {
      entries,
      workStatuses: entries.filter((entry) => entry.kind === "workStatus"),
      featureStatuses: entries.filter((entry) => entry.kind === "featureStatus"),
      priorities: entries.filter((entry) => entry.kind === "priority"),
      ticketTypes: entries.filter((entry) => entry.kind === "ticketType"),
      loading: false,
      error: null,
      createEntry: vi.fn(),
      updateEntry: vi.fn(),
      deleteEntry: vi.fn(),
      reload: vi.fn()
    };
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useWikiImport", () => ({
  useWikiImport() {
    return {
      preview: null,
      loading: false,
      error: null,
      previewImport: ownerFormMocks.previewImport,
      runImport: ownerFormMocks.runImport
    };
  }
}));

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:owner-form-preview")
  });
  ownerFormMocks.createUseCase.mockResolvedValue(fixtures.useCase);
  ownerFormMocks.updateUseCase.mockResolvedValue(fixtures.useCase);
  ownerFormMocks.createSubtask.mockResolvedValue(fixtures.task);
  ownerFormMocks.createSubTicket.mockResolvedValue(fixtures.ticket);
  ownerFormMocks.uploadAttachment.mockResolvedValue(fixtures.attachment);
  ownerFormMocks.createNote.mockResolvedValue(fixtures.note);
  ownerFormMocks.updateNote.mockResolvedValue(fixtures.note);
  ownerFormMocks.removeNote.mockResolvedValue(undefined);
  ownerFormMocks.createFeature.mockResolvedValue(fixtures.feature);
  ownerFormMocks.setFeaturesForProject.mockResolvedValue(undefined);
  ownerFormMocks.addProjectToFeature.mockResolvedValue(undefined);
  ownerFormMocks.removeProjectFromFeature.mockResolvedValue(undefined);
  ownerFormMocks.createComment.mockResolvedValue(fixtures.comment);
  ownerFormMocks.removeComment.mockResolvedValue(undefined);
  ownerFormMocks.addTicketRelation.mockResolvedValue(undefined);
  ownerFormMocks.removeTicketRelation.mockResolvedValue(undefined);
  ownerFormMocks.getTicketLinkCandidates.mockResolvedValue([fixtures.ticket]);
  ownerFormMocks.getTicketRelationCandidates.mockResolvedValue([fixtures.ticket]);
  ownerFormMocks.removeMilestone.mockResolvedValue(undefined);
  ownerFormMocks.createBacklogItem.mockResolvedValue(undefined);
  ownerFormMocks.updateBacklogItem.mockResolvedValue(undefined);
  ownerFormMocks.removeBacklogItem.mockResolvedValue(undefined);
  ownerFormMocks.previewImport.mockResolvedValue(null);
  ownerFormMocks.runImport.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  const withProviders = (content: ReactElement) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmDialogProvider>{content}</ConfirmDialogProvider>
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
  const result = render(withProviders(ui));

  return {
    ...result,
    rerender(nextUi: ReactElement) {
      result.rerender(withProviders(nextUi));
    }
  };
}

export function changeInput(index: number, value: string) {
  const input = document.body.querySelectorAll("input")[index];
  expect(input).toBeDefined();
  fireEvent.change(input as HTMLInputElement, { target: { value } });
}

export function changeTextarea(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

export function clickTab(name: RegExp | string) {
  if (typeof name !== "string") {
    fireEvent.click(screen.getByRole("button", { name }));
    return;
  }

  const button = screen.getAllByRole("button").find((item) => item.textContent?.trim().startsWith(name));
  if (!button) {
    throw new Error(`Tab button not found: ${name}`);
  }
  fireEvent.click(button);
}

export function addPendingComment(text: string) {
  fireEvent.change(screen.getByPlaceholderText("Kommentar vormerken"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /Hinzuf/i }));
}

export function getFileInput(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') ?? document.body.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("File input not found");
  }
  return input;
}
