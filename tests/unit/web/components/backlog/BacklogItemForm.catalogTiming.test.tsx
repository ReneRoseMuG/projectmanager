// @vitest-environment jsdom

/**
 * Test Scope: BacklogItemForm — Katalog-Timing-Regression
 *
 * Test-Ebene:
 * - Unit/jsdom
 *
 * Realitätsgrad:
 * - Echte BacklogItemForm-Komponente; useCatalogs mit leerem entries-Array (simuliert
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
 * - Effect 2 darf bei catalogs.entries=[] den aus item.status stammenden Wert nicht
 *   auf den Fallback "open" überschreiben.
 *
 * Fehlerfälle:
 * - item.status="closed" muss im Status-Select sichtbar bleiben (nicht "open").
 * - item.status="done"   muss im Status-Select sichtbar bleiben (nicht "open").
 *
 * Ziel:
 * Regression für "In Tab öffnen zeigt geschlossenes Backlog-Item als offen" absichern.
 */

import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { BacklogItem, Feature } from "@taskmanager/shared-types";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";
import { BacklogItemForm } from "../../../../../apps/web/src/components/backlog/BacklogItemForm";

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

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField: ({ value, onChange, testIdPrefix }: { value: string; onChange: (v: string) => void; testIdPrefix?: string }) => (
    <textarea data-testid={`${testIdPrefix ?? "rich-text"}-view`} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const user = { id: 1, name: "tester", fullName: "Tester", email: "t@local" };

const baseItem: BacklogItem = {
  id: 60,
  title: "Backlog-Eintrag Alpha",
  description: null,
  status: "open",
  featureId: null,
  responsibleUserId: null,
  responsibleUser: null,
  sortOrder: 1024,
  parentContexts: [],
  version: 1,
  attachmentCount: 0,
  commentCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const features: Feature[] = [];

function renderForm(props: React.ComponentProps<typeof BacklogItemForm>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ConfirmDialogProvider>
          <ToastProvider>
            <BacklogItemForm {...props} />
          </ToastProvider>
        </ConfirmDialogProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe("BacklogItemForm — Katalog-Timing-Regression (leerer Cache)", () => {
  it("behält item.status='closed' wenn der Katalog beim Öffnen noch leer ist", () => {
    renderForm({ open: true, item: { ...baseItem, status: "closed" }, features, onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[0];
    expect(statusSelect).toHaveValue("closed");
  });

  it("behält item.status='done' wenn der Katalog beim Öffnen noch leer ist", () => {
    renderForm({ open: true, item: { ...baseItem, status: "done" }, features, onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[0];
    expect(statusSelect).toHaveValue("done");
  });

  it("Gegenbeispiel: item.status='open' bleibt 'open' (kein unerwünschter Seiteneffekt)", () => {
    renderForm({ open: true, item: { ...baseItem, status: "open" }, features, onSubmit: vi.fn(), onClose: vi.fn() });

    const sidebar = screen.getByTestId("form-sidebar");
    const statusSelect = within(sidebar).getAllByRole("combobox")[0];
    expect(statusSelect).toHaveValue("open");
  });
});
