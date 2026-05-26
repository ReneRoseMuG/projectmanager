// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echter NoteEditor mit ConfirmDialogProvider; RichTextInlineField als kleines UI-Double.
 *
 * Mock-Entscheidung:
 * - Unit-Mock für den RichText-Editor, weil hier Modal-, Serialisierungs- und Submit-Verhalten des NoteEditors geprüft wird.
 *
 * Isolation:
 * - jsdom ohne DB- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - NoteEditor bindet RichTextInlineField an contentJson.html.
 * - Legacy-/Markdown-Inhalte werden roh an den Editor übergeben.
 * - Nicht editiertes Legacy-Markdown wird bei Titelspeicherung nicht als HTML überschrieben.
 * - Speichern im Notizmodal propagiert nicht in die übergeordnete Detail-Form.
 *
 * Fehlerfälle:
 * - Aktualisierter HTML-Inhalt muss beim Speichern serialisiert werden.
 * - Parent-Submit darf beim Speichern der Notiz nicht ausgelöst werden.
 *
 * Ziel:
 * Die Rich-Text-Integration und das Modal-Verhalten im Notizeditor absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { Note } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { FormEvent, ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NoteEditor } from "../../../../../apps/web/src/components/notes/NoteEditor";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
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

const legacyMarkdownNote: Note = {
  ...note,
  id: 8,
  title: "Markdown Notiz",
  contentJson: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "# Entscheidung\n\n- Punkt A" }]
      }
    ]
  }
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

  it("übergibt Legacy-Markdown roh an RichTextInlineField", () => {
    renderWithProviders(<NoteEditor open note={legacyMarkdownNote} onSave={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("note-editor-content-view")).toHaveValue("# Entscheidung\n\n- Punkt A");
  });

  it("bewahrt Legacy-Markdown beim Speichern ohne Editor-Konvertierung", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<NoteEditor open note={legacyMarkdownNote} onSave={onSave} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Titel"), { target: { value: "Markdown Notiz aktualisiert" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        legacyMarkdownNote.id,
        expect.objectContaining({
          title: "Markdown Notiz aktualisiert",
          contentJson: legacyMarkdownNote.contentJson,
          expectedVersion: legacyMarkdownNote.version
        })
      )
    );
  });

  it("stoppt Submit-Propagation zur übergeordneten Detail-Form", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const onParentSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());

    renderWithProviders(
      <form onSubmit={onParentSubmit}>
        <NoteEditor open note={note} onSave={onSave} onClose={onClose} />
      </form>
    );

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onParentSubmit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
