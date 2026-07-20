// @vitest-environment jsdom

/**
 * Test Scope: MilestoneForm — Katalog-Timing-Regression
 *
 * Test-Ebene:
 * - Unit/jsdom
 *
 * Realitätsgrad:
 * - Echte MilestoneForm-Komponente; useCatalogs mit leerem entries-Array (simuliert
 *   neuen Browser-Tab ohne Query-Cache); alle anderen Abhängigkeiten minimal gestubbt.
 *
 * Mock-Entscheidung:
 * - useCatalogs: entries=[] — Kernbedingung (neuer Tab, Katalog noch nicht geladen).
 *   Alle anderen Hooks sind technisch nötige Stubs ohne Einfluss auf den Status-State.
 *
 * Isolation:
 * - Kein DB- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - Effect 2 darf bei catalogs.entries=[] den aus milestone.status stammenden Wert nicht
 *   auf den Fallback "active" überschreiben.
 *
 * Fehlerfälle:
 * - milestone.status="closed" muss im Status-Select sichtbar bleiben (nicht "active").
 * - milestone.status="done"   muss im Status-Select sichtbar bleiben (nicht "active").
 *
 * Ziel:
 * Regression für "In Tab öffnen zeigt geschlossenen Meilenstein als aktiv" absichern.
 */

import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { Milestone, Project } from "@taskmanager/shared-types";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";
import { MilestoneForm } from "../../../../../apps/web/src/components/milestones/MilestoneForm";

vi.mock("../../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs: () => ({
    entries: [],
    workStatuses: [],
    featureStatuses: [],
    priorities: [],
    ticketTypes: [],
    loading: true,
    error: null,
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    reload: vi.fn(),
  }),
}));

vi.mock("../../../../../apps/web/src/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, name: "tester", fullName: "Tester", email: "t@local" }, loading: false }),
}));

vi.mock("../../../../../apps/web/src/hooks/useAutoSave", () => ({
  useAutoSave: () => ({ status: "idle", errorMessage: null, flush: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => false,
}));

vi.mock("../../../../../apps/web/src/hooks/useEntityComments", () => ({
  useEntityComments: () => ({ comments: [], loading: false, createComment: vi.fn(), removeComment: vi.fn(), updateComment: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/hooks/useUsers", () => ({
  useUsers: () => ({ users: [{ id: 1, name: "tester", fullName: "Tester", email: "t@local" }], loading: false }),
}));

vi.mock("../../../../../apps/web/src/hooks/useTasks", () => ({
  useTasks: () => ({ tasks: [], loading: false, createTask: vi.fn(), updateTask: vi.fn(), updateTaskStatus: vi.fn(), removeTask: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/hooks/useTickets", () => ({
  useTickets: () => ({ tickets: [], loading: false, createTicket: vi.fn(), updateTicket: vi.fn(), removeTicket: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/hooks/useNotes", () => ({
  useNotes: () => ({ notes: [], loading: false, createNote: vi.fn(), updateNote: vi.fn(), removeNote: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/hooks/useAttachments", () => ({
  useAttachments: () => ({ attachments: [], loading: false, uploadAttachment: vi.fn(), unlinkAttachment: vi.fn(), deleteAttachmentPermanently: vi.fn(), openAttachment: vi.fn(), openingAttachmentId: null }),
}));

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField: ({ value, onChange, testIdPrefix }: { value: string; onChange: (v: string) => void; testIdPrefix?: string }) => (
    <textarea data-testid={`${testIdPrefix ?? "rich-text"}-view`} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("../../../../../apps/web/src/components/tags/TagPicker", () => ({
  TagPicker: () => <button type="button">Tags 0</button>,
}));

vi.mock("../../../../../apps/web/src/components/tasks/OwnerTaskBoard", () => ({
  OwnerTaskBoard: () => null,
}));

vi.mock("../../../../../apps/web/src/components/tasks/TaskLinkDialog", () => ({
  TaskLinkDialog: () => null,
}));

vi.mock("../../../../../apps/web/src/components/tasks/TaskListBoardView", () => ({
  TaskListBoardView: () => null,
}));

vi.mock("../../../../../apps/web/src/components/tasks/TaskForm", () => ({
  TaskDraftDialog: () => null,
  TicketDraftDialog: () => null,
}));

vi.mock("../../../../../apps/web/src/components/tickets/OwnerTicketBoard", () => ({
  OwnerTicketBoard: () => null,
}));

vi.mock("../../../../../apps/web/src/components/tickets/TicketLinkDialog", () => ({
  TicketLinkDialog: () => null,
}));

vi.mock("../../../../../apps/web/src/components/tickets/TicketListBoardView", () => ({
  TicketListBoardView: () => null,
}));

vi.mock("../../../../../apps/web/src/components/ui/CommentThread", () => ({
  CommentThread: () => null,
}));

vi.mock("../../../../../apps/web/src/components/notes/NoteList", () => ({
  NoteList: () => null,
}));

vi.mock("../../../../../apps/web/src/components/notes/NoteEditor", () => ({
  NoteEditor: () => null,
}));

vi.mock("../../../../../apps/web/src/components/attachments/AttachmentUploader", () => ({
  AttachmentUploader: () => null,
}));

vi.mock("../../../../../apps/web/src/components/attachments/AttachmentList", () => ({
  AttachmentList: () => null,
}));

vi.mock("../../../../../apps/web/src/components/dashboard/DashboardView", () => ({
  MilestoneDashboard: () => null,
}));

vi.mock("../../../../../apps/web/src/components/ui/DetailBoardShell", () => ({
  DetailBoardShell: () => null,
}));

vi.mock("../../../../../apps/web/src/components/journal/JournalPanel", () => ({
  JournalPanel: () => null,
}));

const project: Project = {
  id: 30,
  name: "Projekt Alpha",
  description: null,
  status: "active",
  color: null,
  startDate: null,
  dueDate: null,
  responsibleUserId: null,
  responsibleUser: null,
  wikiPageId: null,
  tags: [],
  version: 1,
  milestoneCount: 0,
  taskCount: 0,
  ticketCount: 0,
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0,
  featureCount: 0,
  backlogCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as unknown as Project;

const baseMilestone: Milestone = {
  id: 40,
  projectId: 30,
  name: "Meilenstein Alpha",
  description: null,
  status: "active",
  color: null,
  startDate: null,
  dueDate: null,
  responsibleUserId: null,
  responsibleUser: null,
  tags: [],
  version: 1,
  taskCount: 0,
  ticketCount: 0,
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as unknown as Milestone;

function renderForm(props: React.ComponentProps<typeof MilestoneForm>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ConfirmDialogProvider>
          <ToastProvider>
            <MilestoneForm {...props} />
          </ToastProvider>
        </ConfirmDialogProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe("MilestoneForm — Katalog-Timing-Regression (leerer Cache)", () => {
  // Milestone sidebar: Projekt-Select [0], Status [1], Verantwortlich [2]
  it("behält milestone.status='closed' wenn der Katalog beim Öffnen noch leer ist", () => {
    renderForm({ open: true, milestone: { ...baseMilestone, status: "closed" }, projects: [project], onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[1];
    expect(statusSelect).toHaveValue("closed");
  });

  it("behält milestone.status='done' wenn der Katalog beim Öffnen noch leer ist", () => {
    renderForm({ open: true, milestone: { ...baseMilestone, status: "done" }, projects: [project], onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[1];
    expect(statusSelect).toHaveValue("done");
  });

  it("Gegenbeispiel: milestone.status='active' bleibt 'active' (kein unerwünschter Seiteneffekt)", () => {
    renderForm({ open: true, milestone: { ...baseMilestone, status: "active" }, projects: [project], onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[1];
    expect(statusSelect).toHaveValue("active");
  });
});
