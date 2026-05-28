// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - jsdom-Komponententest mit echten Props und lokalen Draft-Kommentaren.
 *
 * Mock-Entscheidung:
 * - RichTextInlineField wird als kontrolliertes Textfeld gemockt.
 * - useHasPermission wird als direkte UI-Berechtigungsgrenze gemockt.
 *
 * Isolation:
 * - Keine DB- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - PendingCommentList zeigt Draft-Kommentare als List/Board-Oberfläche ohne Inline-Editor.
 * - Erstellen und Bearbeiten laufen über ein Modal.
 * - Add, Update und Remove melden den korrekten Draft-Index beziehungsweise Payload.
 * - Schreibaktionen werden ohne comments:write nicht angeboten.
 *
 * Fehlerfälle:
 * - Leere Kommentare dürfen nicht vorgemerkt werden.
 *
 * Ziel:
 * Pending-Kommentare im Create-Pfad gegen Regressionen beim Modal-Workflow absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingCommentList } from "../../../../../apps/web/src/components/ui/PendingCommentList";

const permissionMocks = vi.hoisted(() => ({
  useHasPermission: vi.fn(),
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: permissionMocks.useHasPermission,
}));

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
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
      <textarea
        aria-label={placeholder ?? "Kommentar bearbeiten"}
        data-testid={testIdPrefix ? `${testIdPrefix}-input` : undefined}
        value={value ?? ""}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    );
  },
}));

beforeEach(() => {
  permissionMocks.useHasPermission.mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PendingCommentList", () => {
  it("zeigt EmptyState und keinen Inline-Editor wenn keine Kommentare pending sind", () => {
    render(<PendingCommentList comments={[]} onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Keine Kommentare vorgemerkt")).toBeInTheDocument();
    expect(screen.getByText("Kommentare werden lokal gesammelt.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Kommentar vormerken" })).not.toBeInTheDocument();
  });

  it("zeigt den Footer-Hinweis immer an", () => {
    const { rerender } = render(<PendingCommentList comments={[]} onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Kommentare werden nach dem Speichern angelegt.")).toBeInTheDocument();

    rerender(<PendingCommentList comments={[{ text: "Bereits vorgemerkt" }]} onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Kommentare werden nach dem Speichern angelegt.")).toBeInTheDocument();
  });

  it("öffnet das Modal und ruft onAdd mit dem DraftComment auf", () => {
    const onAdd = vi.fn();
    render(<PendingCommentList comments={[]} onAdd={onAdd} onUpdate={vi.fn()} onRemove={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Kommentar vormerken" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Kommentar vormerken" }), { target: { value: "<p>Neuer Kommentar</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(onAdd).toHaveBeenCalledWith({ text: "<p>Neuer Kommentar</p>" });
  });

  it("sendet keine leeren Kommentare", () => {
    const onAdd = vi.fn();
    render(<PendingCommentList comments={[]} onAdd={onAdd} onUpdate={vi.fn()} onRemove={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Kommentar vormerken" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Kommentar vormerken" }), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("bearbeitet einen vorhandenen Draft über das Modal", () => {
    const onUpdate = vi.fn();
    render(
      <PendingCommentList
        comments={[{ text: "<p>Erster Kommentar</p>" }]}
        onAdd={vi.fn()}
        onUpdate={onUpdate}
        onRemove={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kommentar bearbeiten" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Kommentar bearbeiten" }), { target: { value: "<p>Aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(onUpdate).toHaveBeenCalledWith(0, { text: "<p>Aktualisiert</p>" });
  });

  it("ruft onRemove mit dem korrekten Index auf", () => {
    const onRemove = vi.fn();
    render(
      <PendingCommentList
        comments={[{ text: "Erster Kommentar" }, { text: "Zweiter Kommentar" }]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Kommentar entfernen" })[1]!);

    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("wechselt von Liste zu Board", () => {
    const { container } = render(
      <PendingCommentList
        comments={[{ text: "Erster Kommentar" }]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(container.querySelector("[data-testid='list-board-view']")).toBeInTheDocument();
    expect(screen.queryByTestId("pending-comment-0-body-view")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kanban" }));
    expect(screen.getByTestId("pending-comment-0-body-view")).toBeInTheDocument();
  });

  it("blendet Schreibaktionen ohne comments:write aus", () => {
    permissionMocks.useHasPermission.mockReturnValue(false);

    render(
      <PendingCommentList
        comments={[{ text: "Erster Kommentar" }]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Kommentar vormerken" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kommentar bearbeiten" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kommentar entfernen" })).not.toBeInTheDocument();
  });
});
