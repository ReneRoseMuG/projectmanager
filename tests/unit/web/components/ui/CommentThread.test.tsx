// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CommentThread rendert Empty-, Listen-, Create-, Update- und Delete-Zustände.
 * - Bestehende Kommentare werden im Modal bearbeitet, nicht über die Listenansicht gespeichert.
 * - Leere Kommentartexte werden nicht gesendet.
 * - Legacy-Markdown-Kommentare werden als Markdown an den Inline-Editor übergeben.
 *
 * Fehlerfälle:
 * - Update muss die konkrete Kommentar-ID und expectedVersion verwenden.
 * - Delete muss die konkrete Kommentar-ID verwenden.
 * - EmptyState muss den Entity-Kontext anzeigen.
 *
 * Ziel:
 * Den generischen Kommentar-Organism gegen Regressionsfehler bei Rendering und Callback-Payloads absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommentThread } from "../../../../../apps/web/src/components/ui/CommentThread";

vi.mock(
  "../../../../../apps/web/src/components/ui/rich-text-inline-field",
  () => ({
    RichTextInlineField({
      value,
      onChange,
      placeholder,
      readOnly,
      valueFormat,
      testIdPrefix,
    }: {
      value: string | null | undefined;
      onChange: (value: string) => void;
      placeholder?: string;
      readOnly?: boolean;
      valueFormat?: "html" | "markdown";
      testIdPrefix?: string;
    }) {
      if (readOnly) {
        return (
          <div data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}>
            {valueFormat === "markdown" ? (
              <div>{value}</div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: value ?? "" }} />
            )}
          </div>
        );
      }

      return (
        <div data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}>
          {valueFormat === "markdown" ? (
            <div>{value}</div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: value ?? "" }} />
          )}
          <textarea
            aria-label={placeholder ?? "Kommentar bearbeiten"}
            data-testid={testIdPrefix ? `${testIdPrefix}-input` : undefined}
            data-value-format={valueFormat ?? "html"}
            value={value ?? ""}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
        </div>
      );
    },
  }),
);

const comments = [
  {
    id: 1,
    owners: [{ type: "task" as const, id: 10 }],
    body: "<p>Erster Kommentar</p>",
    createdAt: "2026-05-17T08:00:00.000Z",
    updatedAt: "2026-05-17T08:00:00.000Z",
    version: 1,
  },
  {
    id: 2,
    owners: [{ type: "task" as const, id: 10 }],
    body: "<p>Zweiter Kommentar</p>",
    createdAt: "2026-05-17T09:00:00.000Z",
    updatedAt: "2026-05-17T09:00:00.000Z",
    version: 1,
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CommentThread", () => {
  it("zeigt EmptyState wenn comments=[]", () => {
    render(
      <CommentThread comments={[]} onCreate={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText("Noch keine Kommentare")).toBeInTheDocument();
  });

  it("rendert alle übergebenen Kommentare", () => {
    render(
      <CommentThread
        comments={comments}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Erster Kommentar")).toBeInTheDocument();
    expect(screen.getByText("Zweiter Kommentar")).toBeInTheDocument();
    expect(screen.queryByText("Single User")).not.toBeInTheDocument();
    expect(screen.queryByText("0 Reaktionen")).not.toBeInTheDocument();
    expect(screen.queryByText("Antworten")).not.toBeInTheDocument();
    expect(screen.getAllByText("17.05.26")).toHaveLength(2);
  });

  it("öffnet die Bearbeitung im Modal beim Klick auf den Kommentarinhalt", () => {
    render(
      <CommentThread
        comments={[comments[0]]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Erster Kommentar"));

    expect(screen.getByRole("button", { name: "Speichern" })).toBeInTheDocument();
    expect(screen.getByLabelText("Kommentar bearbeiten")).toHaveValue("<p>Erster Kommentar</p>");
  });

  it("onCreate wird mit body aufgerufen beim Absenden", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <CommentThread comments={[]} onCreate={onCreate} onUpdate={vi.fn()} onDelete={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("Kommentar schreiben"), {
      target: { value: "<p>Neu</p>" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kommentar" }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({ body: "<p>Neu</p>" }),
    );
  });

  it("onCreate mit leerem body wird nicht aufgerufen", () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <CommentThread comments={[]} onCreate={onCreate} onUpdate={vi.fn()} onDelete={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kommentar" }));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it("onUpdate wird mit body und expectedVersion aufgerufen", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <CommentThread
        comments={[comments[0]]}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Bearbeiten" })[0] as HTMLElement);
    fireEvent.change(screen.getByLabelText("Kommentar bearbeiten"), {
      target: { value: "<p>Aktualisiert</p>" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(1, {
        body: "<p>Aktualisiert</p>",
        expectedVersion: 1,
      }),
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Speichern" })).not.toBeInTheDocument());
  });

  it("übergibt Legacy-Markdown als Markdown und speichert Editor-HTML", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <CommentThread
        comments={[
          {
            ...comments[0],
            body: "# Titel\n\n**fett**",
            version: 3,
          },
        ]}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Bearbeiten" })[0] as HTMLElement);
    const editor = screen.getByLabelText("Kommentar bearbeiten");
    expect(editor).toHaveAttribute("data-value-format", "markdown");
    fireEvent.change(editor, {
      target: { value: "<h1>Titel</h1><p><strong>fett</strong></p>" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(1, {
        body: "<h1>Titel</h1><p><strong>fett</strong></p>",
        expectedVersion: 3,
      }),
    );
  });

  it("onDelete wird mit korrekter id aufgerufen", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <CommentThread
        comments={comments}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    );

    const deleteButton = screen.getAllByRole("button", { name: "Löschen" })[1];
    expect(deleteButton).toBeDefined();
    fireEvent.click(deleteButton as HTMLElement);

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(2));
  });

  it("entityLabel erscheint im EmptyState-Text", () => {
    render(
      <CommentThread
        comments={[]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        entityLabel="Projekt"
      />,
    );

    expect(
      screen.getByText(
        "Kommentare und Rückfragen zu diesem Projekt erscheinen hier.",
      ),
    ).toBeInTheDocument();
  });
});
