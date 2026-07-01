// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte NoteList, NoteCard, NoteListViewItem und ListBoardView mit kontrollierten Note-Daten.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; API, Query und DB sind nicht beteiligt.
 *
 * Isolation:
 * - jsdom ohne DB- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - Persistierte Notizen werden im Board/List-Standardlayout dargestellt.
 * - Karten und Listenzeilen öffnen die Notiz per Doppelklick oder Bearbeiten-Aktion.
 * - Ein einfacher Klick auf die Karte öffnet den Editor nicht.
 *
 * Fehlerfälle:
 * - Versehentliches Öffnen bei einfachem Klick.
 * - Fehlender Listenmodus oder fehlende Doppelklick-Weiterleitung.
 *
 * Ziel:
 * Die neue Notizen-Board/List-Darstellung gegen Interaktionsregressionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { Note } from "@taskmanager/shared-types";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NoteCard } from "../../../../../apps/web/src/components/notes/NoteCard";
import { NoteList } from "../../../../../apps/web/src/components/notes/NoteList";
import { NoteListViewItem } from "../../../../../apps/web/src/components/notes/NoteListViewItem";

const notes: Note[] = [
  {
    id: 1,
    title: "Entscheidung Alpha",
    contentJson: { html: "<p>Board Preview</p>" },
    version: 1,
    createdAt: "2026-05-19T08:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    parentContexts: [{ type: "project", id: 10, label: "Projekt Alpha", origin: "direct" }]
  },
  {
    id: 2,
    title: "Konzept Beta",
    contentJson: { html: "<p>Listen Preview</p>" },
    version: 1,
    createdAt: "2026-05-20T08:00:00.000Z",
    updatedAt: "2026-05-20T09:00:00.000Z",
    parentContexts: [{ type: "task", id: 5, label: "Aufgabe Beta", origin: "direct" }]
  }
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function articleFor(title: string) {
  const titleNode = screen.getByText(title);
  const article = titleNode.closest("article");
  if (!article) {
    throw new Error(`Article for ${title} not found`);
  }
  return article;
}

describe("NoteList", () => {
  it("rendert Notizen im Board-Modus und öffnet Karten per Doppelklick", () => {
    const onEdit = vi.fn();

    render(<NoteList notes={notes} onCreate={vi.fn().mockResolvedValue(undefined)} onEdit={onEdit} onDelete={vi.fn()} />);

    expect(screen.getByTestId("list-board-view")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kanban" })).toHaveClass("bg-steel-900");
    expect(screen.getByText("Board Preview")).toBeInTheDocument();
    expect(screen.getByText("Projekt: Projekt Alpha")).toBeInTheDocument();

    fireEvent.click(articleFor("Entscheidung Alpha"));
    expect(onEdit).not.toHaveBeenCalled();

    fireEvent.doubleClick(articleFor("Entscheidung Alpha"));
    expect(onEdit).toHaveBeenCalledWith(notes[0]);
  });

  it("rendert Legacy-Markdown-Notizen ohne rohe Markdown-Marker", () => {
    const legacyNote: Note = {
      ...notes[0],
      contentJson: { markdown: "**fett** und `code`" },
    };

    render(<NoteList notes={[legacyNote]} onCreate={vi.fn().mockResolvedValue(undefined)} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("fett und code")).toBeInTheDocument();
    expect(screen.queryByText(/\*\*fett\*\*/)).not.toBeInTheDocument();
  });

  it("wechselt in den Listenmodus und öffnet Rows per Doppelklick", () => {
    const onEdit = vi.fn();

    render(<NoteList notes={notes} onCreate={vi.fn().mockResolvedValue(undefined)} onEdit={onEdit} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Liste" }));

    expect(screen.getByRole("button", { name: "Liste" })).toHaveClass("bg-steel-900");
    expect(screen.getByText("Listen Preview")).toBeInTheDocument();
    expect(screen.getByText("Aufgabe: Aufgabe Beta")).toBeInTheDocument();

    fireEvent.doubleClick(articleFor("Konzept Beta"));
    expect(onEdit).toHaveBeenCalledWith(notes[1]);
  });

  it("ruft onCreate über die Toolbar auf", () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(<NoteList notes={notes} onCreate={onCreate} onEdit={vi.fn()} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
  it("oeffnet Notizen aus dem Board als eigene Detailseite im neuen Tab", () => {
    vi.spyOn(window, "open").mockImplementation(() => null);

    render(<NoteList notes={notes} owner={{ type: "project", id: 10 }} onCreate={vi.fn().mockResolvedValue(undefined)} onEdit={vi.fn()} onDelete={vi.fn()} />);

    fireEvent.click(within(articleFor("Entscheidung Alpha")).getByRole("button", { name: "Aktionen" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /In Tab/ }));

    expect(window.open).toHaveBeenCalledWith(
      "/notes/1?returnTo=%2Fprojects%2F10%3Ftab%3Dnotes&standalone=1",
      "_blank"
    );
  });

  it("oeffnet Notizen aus dem Listenmodus als eigene Detailseite im neuen Tab", () => {
    vi.spyOn(window, "open").mockImplementation(() => null);

    render(<NoteList notes={notes} owner={{ type: "ticket", id: 5 }} onCreate={vi.fn().mockResolvedValue(undefined)} onEdit={vi.fn()} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Liste" }));
    fireEvent.click(within(articleFor("Konzept Beta")).getByRole("button", { name: "Aktionen" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /In Tab/ }));

    expect(window.open).toHaveBeenCalledWith(
      "/notes/2?returnTo=%2Ftickets%2F5%3Ftab%3Dnotes&standalone=1",
      "_blank"
    );
  });
});

describe("NoteCard", () => {
  it("öffnet per Bearbeiten-Aktion und nicht per einfachem Kartenklick", () => {
    const onEdit = vi.fn();

    render(<NoteCard note={notes[0]} onEdit={onEdit} onDelete={vi.fn()} />);

    fireEvent.click(articleFor("Entscheidung Alpha"));
    expect(onEdit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Bearbeiten" }));

    expect(onEdit).toHaveBeenCalledWith(notes[0]);
  });
});

describe("NoteListViewItem", () => {
  it("öffnet per Bearbeiten-Aktion und Doppelklick", () => {
    const onEdit = vi.fn();

    render(<NoteListViewItem note={notes[1]} onEdit={onEdit} onDelete={vi.fn()} />);

    fireEvent.doubleClick(articleFor("Konzept Beta"));
    expect(onEdit).toHaveBeenCalledWith(notes[1]);

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Bearbeiten" }));

    expect(onEdit).toHaveBeenCalledTimes(2);
  });
});
