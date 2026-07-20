// @vitest-environment jsdom

/**
 * Test Scope: TaskForm — Katalog-Timing-Regression
 *
 * Test-Ebene:
 * - Unit/jsdom
 *
 * Realitätsgrad:
 * - Echte TaskForm-Komponente; useCatalogs mit leerem entries-Array (simuliert neuen
 *   Browser-Tab ohne Query-Cache); alle anderen Hook-Abhängigkeiten minimal gestubbt.
 *
 * Mock-Entscheidung:
 * - useCatalogs: entries=[] — Kernbedingung des Bugs (neuer Tab, Katalog noch nicht geladen).
 *   Alle anderen Hooks/Unterkomponenten sind technisch nötige Stubs ohne Einfluss auf
 *   den geprüften Status-State (CatalogSelect, useTaskDetail, UI-Komponenten).
 *
 * Isolation:
 * - Kein DB- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - Effect 2 (Katalog-Normalisierung) darf bei catalogs.entries=[] den aus task.status
 *   stammenden Wert nicht auf den Fallback-Default überschreiben.
 *
 * Fehlerfälle:
 * - task.status="closed" muss im Status-Select sichtbar bleiben (nicht "active").
 * - task.status="done"   muss im Status-Select sichtbar bleiben (nicht "active").
 *
 * Ziel:
 * Regression für "In Tab öffnen zeigt geschlossene Aufgabe als offen" absichern.
 */

import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";
import { TaskForm } from "../../../../../apps/web/src/components/tasks/TaskForm";
import type { Task } from "@taskmanager/shared-types";

// --- Mocks ---

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
  useAuth: () => ({
    user: { id: 1, name: "tester", fullName: "Tester", email: "t@local" },
    loading: false,
  }),
}));

vi.mock("../../../../../apps/web/src/hooks/useTaskDetail", () => ({
  useTaskDetail: () => ({
    task: null,
    loading: false,
    error: null,
    reload: vi.fn(),
    updateTask: vi.fn(),
    updateTags: vi.fn(),
    createSubtask: vi.fn(),
    updateSubtask: vi.fn(),
    removeSubtask: vi.fn(),
    createComment: vi.fn(),
    updateComment: vi.fn(),
    removeComment: vi.fn(),
  }),
}));

vi.mock("../../../../../apps/web/src/hooks/useTickets", () => ({
  useTickets: () => ({ tickets: [], loading: false, error: null }),
}));

vi.mock("../../../../../apps/web/src/hooks/useNotes", () => ({
  useNotes: () => ({
    notes: [],
    loading: false,
    createNote: vi.fn(),
    updateNote: vi.fn(),
    removeNote: vi.fn(),
  }),
}));

vi.mock("../../../../../apps/web/src/hooks/useAttachments", () => ({
  useAttachments: () => ({
    attachments: [],
    loading: false,
    uploadAttachment: vi.fn(),
    unlinkAttachment: vi.fn(),
    deleteAttachmentPermanently: vi.fn(),
    openAttachment: vi.fn(),
    openingAttachmentId: null,
  }),
}));

vi.mock("../../../../../apps/web/src/hooks/useAutoSave", () => ({
  useAutoSave: () => ({ status: "idle", errorMessage: null, flush: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => false,
}));

vi.mock("../../../../../apps/web/src/hooks/useUsers", () => ({
  useUsers: () => ({
    users: [{ id: 1, name: "tester", fullName: "Tester", email: "t@local" }],
    loading: false,
  }),
}));

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField: ({
    value,
    onChange,
    testIdPrefix,
  }: {
    value: string;
    onChange: (v: string) => void;
    testIdPrefix?: string;
  }) =>
    createElement("textarea", {
      "data-testid": `${testIdPrefix ?? "rich-text"}-view`,
      "data-image-upload": "enabled",
      value,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    }),
}));

vi.mock("../../../../../apps/web/src/components/tags/TagPicker", () => ({
  TagPicker: () => createElement("button", { type: "button" }, "Tags 0"),
}));

vi.mock("../../../../../apps/web/src/components/tasks/OwnerTaskBoard", () => ({
  OwnerTaskBoard: () => null,
}));

vi.mock("../../../../../apps/web/src/components/tickets/OwnerTicketBoard", () => ({
  OwnerTicketBoard: () => null,
}));

vi.mock("../../../../../apps/web/src/components/tasks/TaskLinkDialog", () => ({
  TaskLinkDialog: () => null,
}));

vi.mock("../../../../../apps/web/src/components/tickets/TicketLinkDialog", () => ({
  TicketLinkDialog: () => null,
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

// --- Fixtures ---

const baseTask: Task = {
  id: 40,
  projectId: 1,
  parentId: null,
  title: "Testaufgabe",
  description: "",
  status: "active",
  priority: "medium",
  responsibleUserId: 1,
  responsibleUser: { id: 1, name: "tester", fullName: "Tester", email: "t@local" },
  dueDate: null,
  version: 1,
  tags: [],
  subtaskCount: 0,
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0,
  parentContexts: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderForm(props: React.ComponentProps<typeof TaskForm>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        null,
        createElement(
          ConfirmDialogProvider,
          null,
          createElement(ToastProvider, null, createElement(TaskForm, props)),
        ),
      ),
    ),
  );
}

afterEach(() => {
  cleanup();
});

// --- Tests ---

describe("TaskForm — Katalog-Timing-Regression (leerer Cache)", () => {
  it("behält task.status='closed' wenn der Katalog beim Öffnen noch leer ist", () => {
    renderForm({
      open: true,
      task: { ...baseTask, status: "closed" },
      onSubmit: vi.fn(),
      onClose: vi.fn(),
    });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[0];
    expect(statusSelect).toHaveValue("closed");
  });

  it("behält task.status='done' wenn der Katalog beim Öffnen noch leer ist", () => {
    renderForm({
      open: true,
      task: { ...baseTask, status: "done" },
      onSubmit: vi.fn(),
      onClose: vi.fn(),
    });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[0];
    expect(statusSelect).toHaveValue("done");
  });

  it("Gegenbeispiel: task.status='active' bleibt 'active' (kein unerwünschter Seiteneffekt)", () => {
    renderForm({
      open: true,
      task: { ...baseTask, status: "active" },
      onSubmit: vi.fn(),
      onClose: vi.fn(),
    });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[0];
    expect(statusSelect).toHaveValue("active");
  });
});
