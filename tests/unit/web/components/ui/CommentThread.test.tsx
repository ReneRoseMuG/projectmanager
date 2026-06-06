// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CommentThread rendert Empty-, Listen-, Create-, Update- und Delete-Zustände.
 * - Bestehende Kommentare werden im Modal bearbeitet, nicht über die Listenansicht gespeichert.
 * - Leere Kommentartexte werden nicht gesendet.
 * - Legacy-Markdown-Kommentare werden vor Anzeige und Bearbeitung in HTML normalisiert.
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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommentThread } from "../../../../../apps/web/src/components/ui/CommentThread";

const permissionMocks = vi.hoisted(() => ({
  useHasPermission: vi.fn(),
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: permissionMocks.useHasPermission,
}));

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

beforeEach(() => {
  permissionMocks.useHasPermission.mockReturnValue(true);
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

  it("öffnet die Bearbeitung im Modal über die Listenaktion", () => {
    render(
      <CommentThread
        comments={[comments[0]]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    expect(screen.getByRole("button", { name: "Speichern" })).toBeInTheDocument();
    expect(screen.getByLabelText("Kommentar bearbeiten")).toHaveValue("<p>Erster Kommentar</p>");
  });

  it("öffnet den Create-Dialog und ruft onCreate mit body auf", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <CommentThread comments={[]} onCreate={onCreate} onUpdate={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.queryByLabelText("Kommentar schreiben")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kommentar anlegen" }));
    fireEvent.change(screen.getByLabelText("Kommentar schreiben"), {
      target: { value: "<p>Neu</p>" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({ body: "<p>Neu</p>" }),
    );
  });

  it("onCreate mit leerem body wird nicht aufgerufen", () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <CommentThread comments={[]} onCreate={onCreate} onUpdate={vi.fn()} onDelete={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kommentar anlegen" }));
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

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

  it("normalisiert Legacy-Markdown als HTML und speichert Editor-HTML", async () => {
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
    expect(editor).toHaveAttribute("data-value-format", "html");
    expect(editor).toHaveValue("<h1>Titel</h1><p><strong>fett</strong></p>");
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

  it("rendert Legacy-Markdown-Kommentare in der Kartenansicht ohne rohe Markdown-Marker", () => {
    render(
      <CommentThread
        comments={[{ ...comments[0], body: "**fett** und `code`" }]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kanban" }));

    expect(screen.getByText("fett")).toBeInTheDocument();
    expect(screen.getByText("code")).toBeInTheDocument();
    expect(screen.queryByText(/\*\*fett\*\*/)).not.toBeInTheDocument();
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

    // Nach Sortierung absteigend (neuester zuerst): id=2 an Index 0, id=1 an Index 1
    const deleteButton = screen.getAllByRole("button", { name: "Löschen" })[0];
    expect(deleteButton).toBeDefined();
    fireEvent.click(deleteButton as HTMLElement);

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(2));
  });

  it("wechselt zwischen Listen- und Boardansicht", () => {
    const { container } = render(
      <CommentThread
        comments={comments}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(container.querySelector("[data-testid='list-board-view']")).toBeInTheDocument();
    expect(screen.queryByTestId("comment-thread-comment-1-body-view")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kanban" }));
    expect(screen.getByTestId("comment-thread-comment-1-body-view")).toBeInTheDocument();
  });

  it("blendet Create/Edit/Delete ohne Kommentarberechtigungen aus", () => {
    permissionMocks.useHasPermission.mockReturnValue(false);

    render(
      <CommentThread
        comments={[comments[0]]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Kommentar anlegen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bearbeiten" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Löschen" })).not.toBeInTheDocument();
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

  it("rendert identische Struktur für Task-, Ticket- und Projekt-Kontext", () => {
    const ownerTypes = [
      [{ type: "task" as const, id: 10 }],
      [{ type: "ticket" as const, id: 20 }],
      [{ type: "project" as const, id: 30 }],
    ];

    for (const owners of ownerTypes) {
      const ownerComments = [
        {
          id: 1,
          owners,
          body: "<p>Kommentar</p>",
          createdAt: "2026-05-17T08:00:00.000Z",
          updatedAt: "2026-05-17T08:00:00.000Z",
          version: 1,
        },
      ];

      const { unmount } = render(
        <CommentThread comments={ownerComments} onCreate={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByRole("button", { name: "Kommentar anlegen" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Löschen" })).toBeInTheDocument();

      unmount();
    }
  });
});
