// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - BacklogItemForm bindet das RichTextInlineField an den Formular-State.
 *
 * Fehlerfälle:
 * - Aktualisierte Beschreibung muss im Submit-Payload landen.
 *
 * Ziel:
 * Die Rich-Text-Integration im Backlog-Formular absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { BacklogItem, Feature } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BacklogItemForm } from "../../../../../apps/web/src/components/backlog/BacklogItemForm";

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, placeholder, testIdPrefix }: { value: string | null | undefined; onChange: (value: string) => void; placeholder?: string; testIdPrefix?: string }) {
    return <textarea aria-label={placeholder ?? "Rich Text"} data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  hasPermission: () => false,
  useHasPermission: () => false
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

vi.mock("../../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    const entries = [
      { id: 1, kind: "workStatus", key: "open", label: "Offen", sortOrder: 100, isClosed: false, color: "var(--color-fern)", version: 1, createdAt: "", updatedAt: "" },
      { id: 2, kind: "workStatus", key: "done", label: "Erledigt", sortOrder: 200, isClosed: true, color: "var(--color-steel-500)", version: 1, createdAt: "", updatedAt: "" },
      { id: 3, kind: "priority", key: "medium", label: "Mittel", sortOrder: 100, isClosed: false, color: "var(--color-mustard)", version: 1, createdAt: "", updatedAt: "" }
    ];
    return {
      entries,
      workStatuses: entries.filter((entry) => entry.kind === "workStatus"),
      featureStatuses: [],
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

const backlogItem: BacklogItem = {
  id: 1,
  projectId: 10,
  featureId: null,
  useCaseId: null,
  title: "Backlog Alpha",
  description: "<p>Backlog Beschreibung</p>",
  status: "open",
  importKey: null,
  sortOrder: 0,
  responsibleUserId: 1,
  responsibleUser: { id: 1, name: "test.admin", fullName: "Test Admin", email: "admin@local" },
  parentContexts: [{ type: "project", id: 10, label: "Projekt Alpha", origin: "direct" }],
  version: 2,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z"
};

const feature: Feature = {
  id: 2,
  title: "Feature Beta",
  status: "active",
  description: null,
  content: "<p>Feature</p>",
  sortOrder: 1,
  responsibleUserId: 1,
  responsibleUser: { id: 1, name: "test.admin", fullName: "Test Admin", email: "admin@local" },
  useCaseCount: 0,
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0,
  version: 1,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z"
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BacklogItemForm", () => {
  it("rendert das FormModal-Header-Icon mit 20px", () => {
    const { container } = render(<BacklogItemForm open item={backlogItem} features={[]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    const headerIcon = container.querySelector(".lucide-inbox");

    expect(headerIcon).toBeInTheDocument();
    expect(headerIcon).toHaveAttribute("width", "20");
    expect(headerIcon).toHaveAttribute("height", "20");
    expect(container.querySelector(".lucide-inbox[width='21']")).not.toBeInTheDocument();
  });

  it("verdrahtet Body, Parent-Kontext und Sidebar-Felder mit Submit-Payload", async () => {
    const onAutoSave = vi.fn().mockResolvedValue(undefined);
    render(<BacklogItemForm open item={backlogItem} features={[feature]} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={vi.fn()} variant="page" />);

    const sidebar = screen.getByTestId("form-sidebar");
    const sidebarSelects = within(sidebar).getAllByRole("combobox");
    expect(screen.getByTestId("parent-context-field")).toHaveTextContent("PROJ-10");
    expect(screen.getByDisplayValue(backlogItem.title)).toBeInTheDocument();
    expect(screen.getByTestId("backlog-item-description-view")).toHaveValue(backlogItem.description);
    expect(sidebarSelects[0]).toHaveValue("open");
    expect(within(sidebar).getByRole("combobox", { name: "Verantwortlich" })).toHaveValue("1");
    expect(within(sidebar).getByRole("combobox", { name: "Feature" })).toHaveValue("");
    expect(within(sidebar).getByLabelText("Sortierung")).toHaveValue(0);

    fireEvent.change(screen.getByDisplayValue(backlogItem.title), { target: { value: "Backlog Beta" } });
    fireEvent.change(sidebarSelects[0], { target: { value: "done" } });
    fireEvent.change(within(sidebar).getByRole("combobox", { name: "Verantwortlich" }), { target: { value: "" } });
    fireEvent.change(within(sidebar).getByRole("combobox", { name: "Feature" }), { target: { value: String(feature.id) } });
    fireEvent.change(within(sidebar).getByLabelText("Sortierung"), { target: { value: "12" } });

    await waitFor(() =>
      expect(onAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Backlog Beta",
          status: "done",
          featureId: feature.id,
          responsibleUserId: null,
          sortOrder: 12
        })
      )
    );
  });

  it("bindet RichTextInlineField an die Beschreibung", async () => {
    const onAutoSave = vi.fn().mockResolvedValue(undefined);
    render(<BacklogItemForm open item={backlogItem} features={[]} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={vi.fn()} variant="page" />);

    expect(screen.getByTestId("backlog-item-description-view")).toHaveValue(backlogItem.description);
    fireEvent.change(screen.getByTestId("backlog-item-description-view"), { target: { value: "<p>Backlog aktualisiert</p>" } });

    await waitFor(() => expect(onAutoSave).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Backlog aktualisiert</p>" })));
  });

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button, wenn onOpenInTab übergeben wird", () => {
    render(<BacklogItemForm open item={backlogItem} features={[]} onSubmit={vi.fn()} onClose={vi.fn()} onOpenInTab={vi.fn()} variant="page" />);

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
    render(<BacklogItemForm open item={backlogItem} features={[]} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });
});
