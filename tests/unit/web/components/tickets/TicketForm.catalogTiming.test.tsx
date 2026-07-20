// @vitest-environment jsdom

/**
 * Test Scope: TicketForm — Katalog-Timing-Regression
 *
 * Test-Ebene:
 * - Unit/jsdom
 *
 * Realitätsgrad:
 * - Echte TicketForm-Komponente; useCatalogs mit leerem entries-Array (simuliert
 *   neuen Browser-Tab ohne Query-Cache); alle anderen Abhängigkeiten minimal gestubbt.
 *
 * Mock-Entscheidung:
 * - useCatalogs: entries=[] — Kernbedingung (neuer Tab, Katalog noch nicht geladen).
 *   API-Funktionen für Ticket-Link-Kandidaten werden gemockt (technisch nötig für useQuery,
 *   ohne Einfluss auf den geprüften Status-State).
 *
 * Isolation:
 * - Kein DB- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - Effect 2 darf bei catalogs.entries=[] den aus ticket.status stammenden Wert nicht
 *   auf den Fallback "open" überschreiben.
 *
 * Fehlerfälle:
 * - ticket.status="closed" muss im Status-Select sichtbar bleiben (nicht "open").
 * - ticket.status="done"   muss im Status-Select sichtbar bleiben (nicht "open").
 *
 * Ziel:
 * Regression für "In Tab öffnen zeigt geschlossenes Ticket als offen" absichern.
 */

import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { Ticket } from "@taskmanager/shared-types";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";
import { TicketForm } from "../../../../../apps/web/src/components/tickets/TicketForm";

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

vi.mock("../../../../../apps/web/src/hooks/useNotes", () => ({
  useNotes: () => ({ notes: [], loading: false, createNote: vi.fn(), updateNote: vi.fn(), removeNote: vi.fn() }),
}));

vi.mock("../../../../../apps/web/src/hooks/useAttachments", () => ({
  useAttachments: () => ({ attachments: [], loading: false, uploadAttachment: vi.fn(), unlinkAttachment: vi.fn(), deleteAttachmentPermanently: vi.fn(), openAttachment: vi.fn(), openingAttachmentId: null }),
}));

vi.mock("../../../../../apps/web/src/hooks/useTicketDetail", () => ({
  useTicketDetail: () => ({
    ticket: null,
    loading: false,
    error: null,
    reload: vi.fn(),
    updateTicket: vi.fn(),
    updateTags: vi.fn(),
    createSubTicket: vi.fn(),
    updateSubTicket: vi.fn(),
    removeSubTicket: vi.fn(),
    createComment: vi.fn(),
    updateComment: vi.fn(),
    removeComment: vi.fn(),
    addRelation: vi.fn(),
    removeRelation: vi.fn(),
  }),
}));

// Used in useQuery calls inside TicketForm
vi.mock("../../../../../apps/web/src/api/tickets", () => ({
  getTicketLinkCandidates: vi.fn().mockResolvedValue([]),
  getTicketRelationCandidates: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField: ({ value, onChange, testIdPrefix }: { value: string; onChange: (v: string) => void; testIdPrefix?: string }) => (
    <textarea data-testid={`${testIdPrefix ?? "rich-text"}-view`} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("../../../../../apps/web/src/components/tags/TagPicker", () => ({
  TagPicker: () => <button type="button">Tags 0</button>,
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

vi.mock("../../../../../apps/web/src/components/ui/DetailBoardShell", () => ({
  DetailBoardShell: () => null,
}));

vi.mock("../../../../../apps/web/src/components/journal/JournalPanel", () => ({
  JournalPanel: () => null,
}));

const user = { id: 1, name: "tester", fullName: "Tester", email: "t@local" };

const baseTicket: Ticket = {
  id: 50,
  projectId: 1,
  parentId: null,
  type: "bug",
  title: "Ticket Alpha",
  description: null,
  status: "open",
  priority: "medium",
  resolution: null,
  environment: null,
  affectedVersion: null,
  reporterUserId: 1,
  reporterUser: user,
  responsibleUserId: 1,
  responsibleUser: user,
  dueDate: null,
  resolvedAt: null,
  position: 1024,
  tags: [],
  parentContexts: [],
  version: 1,
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0,
  subTicketCount: 0,
  relationCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as unknown as Ticket;

function renderForm(props: React.ComponentProps<typeof TicketForm>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ConfirmDialogProvider>
          <ToastProvider>
            <TicketForm {...props} />
          </ToastProvider>
        </ConfirmDialogProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe("TicketForm — Katalog-Timing-Regression (leerer Cache)", () => {
  // Ticket sidebar: Status [0], Type [1], Priority [2]
  it("behält ticket.status='closed' wenn der Katalog beim Öffnen noch leer ist", () => {
    renderForm({ open: true, ticket: { ...baseTicket, status: "closed" }, onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[0];
    expect(statusSelect).toHaveValue("closed");
  });

  it("behält ticket.status='done' wenn der Katalog beim Öffnen noch leer ist", () => {
    renderForm({ open: true, ticket: { ...baseTicket, status: "done" }, onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[0];
    expect(statusSelect).toHaveValue("done");
  });

  it("Gegenbeispiel: ticket.status='open' bleibt 'open' (kein unerwünschter Seiteneffekt)", () => {
    renderForm({ open: true, ticket: { ...baseTicket, status: "open" }, onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[0];
    expect(statusSelect).toHaveValue("open");
  });
});
