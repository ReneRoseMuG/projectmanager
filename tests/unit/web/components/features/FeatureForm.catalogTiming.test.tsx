// @vitest-environment jsdom

/**
 * Test Scope: FeatureForm — Katalog-Timing-Regression
 *
 * Test-Ebene:
 * - Unit/jsdom
 *
 * Realitätsgrad:
 * - Echte FeatureForm-Komponente; useCatalogs mit leerem entries-Array (simuliert
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
 * - Effect 2 darf bei catalogs.entries=[] den aus feature.status stammenden Wert nicht
 *   auf den Fallback "draft" überschreiben.
 *
 * Fehlerfälle:
 * - feature.status="done"   muss im Status-Select sichtbar bleiben (nicht "draft").
 * - feature.status="active" muss im Status-Select sichtbar bleiben (nicht "draft").
 *
 * Ziel:
 * Regression für "In Tab öffnen zeigt abgeschlossenes Feature als Entwurf" absichern.
 */

import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { Feature } from "@taskmanager/shared-types";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";
import { FeatureForm } from "../../../../../apps/web/src/components/features/FeatureForm";

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

vi.mock("../../../../../apps/web/src/hooks/useAttachments", () => ({
  useAttachments: () => ({ attachments: [], loading: false, uploadAttachment: vi.fn(), unlinkAttachment: vi.fn(), deleteAttachmentPermanently: vi.fn(), openAttachment: vi.fn(), openingAttachmentId: null }),
}));

vi.mock("../../../../../apps/web/src/hooks/useTasks", () => ({
  useTasks: () => ({ tasks: [], loading: false, createTask: vi.fn(), updateTask: vi.fn(), updateTaskStatus: vi.fn(), removeTask: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/hooks/useTickets", () => ({
  useTickets: () => ({ tickets: [], loading: false, createTicket: vi.fn(), updateTicket: vi.fn(), removeTicket: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/hooks/useEntityComments", () => ({
  useEntityComments: () => ({ comments: [], loading: false, createComment: vi.fn(), removeComment: vi.fn(), updateComment: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/hooks/useProjects", () => ({
  useProjects: () => ({ projects: [], loading: false }),
}));

vi.mock("../../../../../apps/web/src/hooks/useUseCases", () => ({
  useUseCases: () => ({ useCases: [], loading: false }),
}));

vi.mock("../../../../../apps/web/src/hooks/useDocLinks", () => ({
  useFeatureProjectLinks: () => ({ linkedProjects: [], loading: false, error: null, addLink: vi.fn(), removeLink: vi.fn() }),
  useProjectFeatureLinks: () => ({ features: [], loading: false }),
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

vi.mock("../../../../../apps/web/src/components/tickets/OwnerTicketBoard", () => ({
  OwnerTicketBoard: () => null,
}));

vi.mock("../../../../../apps/web/src/components/tickets/TicketLinkDialog", () => ({
  TicketLinkDialog: () => null,
}));

vi.mock("../../../../../apps/web/src/components/ui/CommentThread", () => ({
  CommentThread: () => null,
}));

vi.mock("../../../../../apps/web/src/components/attachments/AttachmentUploader", () => ({
  AttachmentUploader: () => null,
}));

vi.mock("../../../../../apps/web/src/components/attachments/AttachmentList", () => ({
  AttachmentList: () => null,
}));

vi.mock("../../../../../apps/web/src/components/usecases/UseCaseListBoardView", () => ({
  UseCaseListBoardView: () => null,
}));

vi.mock("../../../../../apps/web/src/components/ui/DetailBoardShell", () => ({
  DetailBoardShell: () => null,
}));

vi.mock("../../../../../apps/web/src/components/journal/JournalPanel", () => ({
  JournalPanel: () => null,
}));

vi.mock("../../../../../apps/web/src/components/features/FeatureProjectPanel", () => ({
  FeatureProjectPanel: () => null,
}));

const user = { id: 1, name: "tester", fullName: "Tester", email: "t@local" };

const baseFeature: Feature = {
  id: 10,
  title: "Feature Alpha",
  description: null,
  content: null,
  status: "draft",
  sortOrder: 1024,
  responsibleUserId: 1,
  responsibleUser: user,
  parentContexts: [{ type: "project", id: 30, label: "Projekt Alpha", origin: "direct" }],
  version: 1,
  useCaseCount: 0,
  taskCount: 0,
  ticketCount: 0,
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as unknown as Feature;

function renderForm(props: React.ComponentProps<typeof FeatureForm>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ConfirmDialogProvider>
          <ToastProvider>
            <FeatureForm {...props} />
          </ToastProvider>
        </ConfirmDialogProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe("FeatureForm — Katalog-Timing-Regression (leerer Cache)", () => {
  // Feature sidebar: Status [0], Verantwortlich [1]
  it("behält feature.status='done' wenn der Katalog beim Öffnen noch leer ist", () => {
    renderForm({ open: true, feature: { ...baseFeature, status: "done" }, onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[0];
    expect(statusSelect).toHaveValue("done");
  });

  it("behält feature.status='active' wenn der Katalog beim Öffnen noch leer ist", () => {
    renderForm({ open: true, feature: { ...baseFeature, status: "active" }, onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[0];
    expect(statusSelect).toHaveValue("active");
  });

  it("Gegenbeispiel: feature.status='draft' bleibt 'draft' (kein unerwünschter Seiteneffekt)", () => {
    renderForm({ open: true, feature: { ...baseFeature, status: "draft" }, onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[0];
    expect(statusSelect).toHaveValue("draft");
  });
});
