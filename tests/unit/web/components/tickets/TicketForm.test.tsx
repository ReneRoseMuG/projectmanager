// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TicketForm bindet das RichTextInlineField an den Formular-State.
 *
 * Fehlerfälle:
 * - Aktualisierte Beschreibung muss im Submit-Payload landen.
 *
 * Ziel:
 * Die Rich-Text-Integration im Ticketformular absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { Ticket } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketForm } from "../../../../../apps/web/src/components/tickets/TicketForm";

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, placeholder, testIdPrefix }: { value: string | null | undefined; onChange: (value: string) => void; placeholder?: string; testIdPrefix?: string }) {
    return <textarea aria-label={placeholder ?? "Rich Text"} data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

vi.mock("../../../../../apps/web/src/components/tags/TagPicker", () => ({
  TagPicker() {
    return <div data-testid="tag-picker" />;
  }
}));

vi.mock("../../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    const entries = [
      { id: 1, kind: "workStatus", key: "open", label: "Offen", sortOrder: 100, isClosed: false, version: 1, createdAt: "", updatedAt: "" },
      { id: 2, kind: "workStatus", key: "in_progress", label: "In Arbeit", sortOrder: 200, isClosed: false, version: 1, createdAt: "", updatedAt: "" },
      { id: 3, kind: "workStatus", key: "closed", label: "Geschlossen", sortOrder: 300, isClosed: true, version: 1, createdAt: "", updatedAt: "" },
      { id: 4, kind: "priority", key: "medium", label: "Mittel", sortOrder: 100, isClosed: false, version: 1, createdAt: "", updatedAt: "" }
    ];
    return {
      entries,
      workStatuses: entries.filter((entry) => entry.kind === "workStatus"),
      featureStatuses: [],
      priorities: entries.filter((entry) => entry.kind === "priority"),
      loading: false,
      error: null,
      createEntry: vi.fn(),
      updateEntry: vi.fn(),
      deleteEntry: vi.fn(),
      reload: vi.fn()
    };
  }
}));

const ticket: Ticket = {
  id: 50,
  parentId: null,
  type: "bug",
  title: "Ticket Alpha",
  description: "<p>Ticket Beschreibung</p>",
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
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z",
  tags: [],
  subTicketCount: 0
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TicketForm", () => {
  it("bindet RichTextInlineField an die Beschreibung", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TicketForm open ticket={ticket} onSubmit={onSubmit} onClose={vi.fn()} variant="page" />);

    expect(screen.getByTestId("ticket-description-view")).toHaveValue(ticket.description);
    fireEvent.change(screen.getByTestId("ticket-description-view"), { target: { value: "<p>Ticket aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Ticket aktualisiert</p>" })));
  });

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button, wenn onOpenInTab übergeben wird", () => {
    render(<TicketForm open ticket={ticket} onSubmit={vi.fn()} onClose={vi.fn()} onOpenInTab={vi.fn()} variant="page" />);

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
    render(<TicketForm open ticket={ticket} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });
});
