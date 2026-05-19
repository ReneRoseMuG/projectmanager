// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - NoteEditor bindet RichTextInlineField an contentJson.html.
 *
 * Fehlerfälle:
 * - Aktualisierter HTML-Inhalt muss beim Speichern serialisiert werden.
 *
 * Ziel:
 * Die Rich-Text-Integration im Notizeditor absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { Note } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialogProvider } from "../../ui/ConfirmDialogProvider";
import { NoteEditor } from "../NoteEditor";

vi.mock("../../ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, testIdPrefix }: { value: string | null | undefined; onChange: (value: string) => void; testIdPrefix?: string }) {
    return <textarea aria-label="Notizinhalt" data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

const note: Note = {
  id: 7,
  title: "Notiz Alpha",
  contentJson: { html: "<p>Notiz Inhalt</p>" },
  version: 5,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z"
};

function renderWithProviders(ui: ReactElement) {
  return render(<ConfirmDialogProvider>{ui}</ConfirmDialogProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NoteEditor", () => {
  it("bindet RichTextInlineField an contentJson.html", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<NoteEditor open note={note} onSave={onSave} onClose={vi.fn()} />);

    expect(screen.getByTestId("note-editor-content-view")).toHaveValue("<p>Notiz Inhalt</p>");
    fireEvent.change(screen.getByTestId("note-editor-content-view"), { target: { value: "<p>Notiz aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        note.id,
        expect.objectContaining({
          contentJson: { html: "<p>Notiz aktualisiert</p>" },
          expectedVersion: note.version
        })
      )
    );
  });
});
