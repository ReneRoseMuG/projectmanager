// @vitest-environment jsdom

/**
 * Test Scope: UseCaseForm — Katalog-Timing-Regression
 *
 * Test-Ebene:
 * - Unit/jsdom
 *
 * Realitätsgrad:
 * - Echte UseCaseForm-Komponente; useCatalogs mit leerem entries-Array (simuliert
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
 * - Effect 2 darf bei catalogs.entries=[] den aus useCase.status stammenden Wert nicht
 *   auf den Fallback "draft" überschreiben.
 *
 * Fehlerfälle:
 * - useCase.status="done"   muss im Status-Select sichtbar bleiben (nicht "draft").
 * - useCase.status="active" muss im Status-Select sichtbar bleiben (nicht "draft").
 *
 * Ziel:
 * Regression für "In Tab öffnen zeigt abgeschlossenen Use Case als Entwurf" absichern.
 */

import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { Feature, UseCase } from "@taskmanager/shared-types";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";
import { UseCaseForm } from "../../../../../apps/web/src/components/usecases/UseCaseForm";

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

vi.mock("../../../../../apps/web/src/hooks/useUsers", () => ({
  useUsers: () => ({ users: [{ id: 1, name: "tester", fullName: "Tester", email: "t@local" }], loading: false }),
}));

vi.mock("../../../../../apps/web/src/hooks/useEntityComments", () => ({
  useEntityComments: () => ({ comments: [], loading: false, createComment: vi.fn(), removeComment: vi.fn(), updateComment: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/hooks/useTasks", () => ({
  useTasks: () => ({ tasks: [], loading: false, createTask: vi.fn(), updateTask: vi.fn(), updateTaskStatus: vi.fn(), removeTask: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/hooks/useTickets", () => ({
  useTickets: () => ({ tickets: [], loading: false, createTicket: vi.fn(), updateTicket: vi.fn(), removeTicket: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField: ({ value, onChange, testIdPrefix }: { value: string; onChange: (v: string) => void; testIdPrefix?: string }) => (
    <textarea data-testid={`${testIdPrefix ?? "rich-text"}-view`} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("../../../../../apps/web/src/components/tasks/OwnerTaskBoard", () => ({
  OwnerTaskBoard: () => null,
}));

vi.mock("../../../../../apps/web/src/components/tasks/TaskLinkDialog", () => ({
  TaskLinkDialog: () => null,
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

vi.mock("../../../../../apps/web/src/components/ui/DetailBoardShell", () => ({
  DetailBoardShell: () => null,
}));

vi.mock("../../../../../apps/web/src/components/journal/JournalPanel", () => ({
  JournalPanel: () => null,
}));

const user = { id: 1, name: "tester", fullName: "Tester", email: "t@local" };

const feature: Feature = {
  id: 10,
  title: "Feature Alpha",
  status: "active",
  sortOrder: 1024,
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as unknown as Feature;

const baseUseCase: UseCase = {
  id: 20,
  featureId: 10,
  title: "Use Case Alpha",
  description: null,
  content: null,
  status: "draft",
  sortOrder: 1024,
  responsibleUserId: 1,
  responsibleUser: user,
  parentContexts: [],
  version: 1,
  taskCount: 0,
  ticketCount: 0,
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as unknown as UseCase;

function renderForm(props: React.ComponentProps<typeof UseCaseForm>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ConfirmDialogProvider>
          <ToastProvider>
            <UseCaseForm {...props} />
          </ToastProvider>
        </ConfirmDialogProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe("UseCaseForm — Katalog-Timing-Regression (leerer Cache)", () => {
  // UseCase sidebar: Feature [0], Verantwortlich [1], Status [2]
  it("behält useCase.status='done' wenn der Katalog beim Öffnen noch leer ist", () => {
    renderForm({ open: true, useCase: { ...baseUseCase, status: "done" }, features: [feature], onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[2];
    expect(statusSelect).toHaveValue("done");
  });

  it("behält useCase.status='active' wenn der Katalog beim Öffnen noch leer ist", () => {
    renderForm({ open: true, useCase: { ...baseUseCase, status: "active" }, features: [feature], onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[2];
    expect(statusSelect).toHaveValue("active");
  });

  it("Gegenbeispiel: useCase.status='draft' bleibt 'draft' (kein unerwünschter Seiteneffekt)", () => {
    renderForm({ open: true, useCase: { ...baseUseCase, status: "draft" }, features: [feature], onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[2];
    expect(statusSelect).toHaveValue("draft");
  });
});
