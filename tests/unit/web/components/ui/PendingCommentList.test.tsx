// @vitest-environment jsdom

/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - EmptyState wenn keine Kommentare pending.
 * - Footer-Hinweis „Kommentare werden nach dem Speichern angelegt." immer sichtbar.
 * - Text eingeben + „Hinzufügen" → onAdd() mit korrektem DraftComment aufgerufen.
 * - Leeres Textfeld: „Hinzufügen"-Button disabled oder Aufruf verhindert.
 * - Nach Hinzufügen: Textfeld geleert.
 * - Entfernen → onRemove(index) aufgerufen.
 * Ziel: PendingCommentList-Rendering und Interaktionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PendingCommentList } from "../../../../../apps/web/src/components/ui/PendingCommentList";

afterEach(() => {
  cleanup();
});

describe("PendingCommentList", () => {
  it("zeigt EmptyState wenn keine Kommentare pending sind", () => {
    render(<PendingCommentList comments={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Keine Kommentare vorgemerkt")).toBeInTheDocument();
    expect(screen.getByText("Kommentare werden lokal gesammelt.")).toBeInTheDocument();
  });

  it("zeigt den Footer-Hinweis immer an", () => {
    const { rerender } = render(<PendingCommentList comments={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Kommentare werden nach dem Speichern angelegt.")).toBeInTheDocument();

    rerender(<PendingCommentList comments={[{ text: "Bereits vorgemerkt" }]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Kommentare werden nach dem Speichern angelegt.")).toBeInTheDocument();
  });

  it("ruft onAdd mit dem korrekten DraftComment auf", () => {
    const onAdd = vi.fn();
    render(<PendingCommentList comments={[]} onAdd={onAdd} onRemove={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Kommentar vormerken"), { target: { value: " Neuer Kommentar " } });
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(onAdd).toHaveBeenCalledWith({ text: "Neuer Kommentar" });
  });

  it("deaktiviert Hinzufügen bei leerem Textfeld", () => {
    const onAdd = vi.fn();
    render(<PendingCommentList comments={[]} onAdd={onAdd} onRemove={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Hinzufügen" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("leert das Textfeld nach dem Hinzufügen", () => {
    render(<PendingCommentList comments={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);
    const textarea = screen.getByPlaceholderText("Kommentar vormerken") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "Kommentar" } });
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(textarea.value).toBe("");
  });

  it("ruft onRemove mit dem korrekten Index auf", () => {
    const onRemove = vi.fn();
    render(<PendingCommentList comments={[{ text: "Erster Kommentar" }, { text: "Zweiter Kommentar" }]} onAdd={vi.fn()} onRemove={onRemove} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Kommentar entfernen" })[1]!);

    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
