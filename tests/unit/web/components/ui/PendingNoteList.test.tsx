// @vitest-environment jsdom

/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - EmptyState wenn keine Notizen pending.
 * - Footer-Hinweis „Notizen werden nach dem Speichern angelegt." immer sichtbar.
 * - „Neue Notiz" geklickt → Mini-Dialog öffnet sich.
 * - Titel eingeben + Bestätigen → onAdd() mit korrekter DraftNote aufgerufen.
 * - Leerer Titel: Bestätigen-Button disabled.
 * - Entfernen → onRemove(index) aufgerufen.
 * Ziel: PendingNoteList-Rendering und Interaktionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PendingNoteList } from "../../../../../apps/web/src/components/ui/PendingNoteList";

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, placeholder, testIdPrefix }: { value: string | null | undefined; onChange: (value: string) => void; placeholder?: string; testIdPrefix?: string }) {
    return <textarea aria-label={placeholder ?? "Rich Text"} data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

afterEach(() => {
  cleanup();
});

describe("PendingNoteList", () => {
  it("zeigt EmptyState wenn keine Notizen pending sind", () => {
    render(<PendingNoteList notes={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Keine Notizen vorgemerkt")).toBeInTheDocument();
    expect(screen.getByText("Notizen werden lokal gesammelt.")).toBeInTheDocument();
  });

  it("zeigt den Footer-Hinweis immer an", () => {
    const { rerender } = render(<PendingNoteList notes={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Notizen werden nach dem Speichern angelegt.")).toBeInTheDocument();

    rerender(<PendingNoteList notes={[{ title: "Konzept", contentJson: {} }]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Notizen werden nach dem Speichern angelegt.")).toBeInTheDocument();
  });

  it("öffnet den Mini-Dialog nach Klick auf Neue Notiz", () => {
    render(<PendingNoteList notes={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));

    expect(screen.getByRole("heading", { name: "Neue Notiz" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Titel/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Notizinhalt" })).toBeInTheDocument();
  });

  it("ruft onAdd nach Titel- und Inhalts-Eingabe mit der korrekten DraftNote auf", () => {
    const onAdd = vi.fn();
    render(<PendingNoteList notes={[]} onAdd={onAdd} onRemove={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    fireEvent.change(screen.getByLabelText(/Titel/), { target: { value: " Neue Notiz " } });
    fireEvent.change(screen.getByRole("textbox", { name: "Notizinhalt" }), { target: { value: "<p>Notizinhalt</p>" } });
    fireEvent.click(within(document.body).getByRole("button", { name: "Hinzufügen" }));

    expect(onAdd).toHaveBeenCalledWith({ title: "Neue Notiz", contentJson: { html: "<p>Notizinhalt</p>" } });
  });

  it("deaktiviert Bestätigen bei leerem Titel", () => {
    render(<PendingNoteList notes={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));

    expect(within(document.body).getByRole("button", { name: "Hinzufügen" })).toBeDisabled();
  });

  it("ruft onRemove mit dem korrekten Index auf", () => {
    const onRemove = vi.fn();
    render(<PendingNoteList notes={[{ title: "Erste Notiz", contentJson: {} }, { title: "Zweite Notiz", contentJson: {} }]} onAdd={vi.fn()} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: "Zweite Notiz entfernen" }));

    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
