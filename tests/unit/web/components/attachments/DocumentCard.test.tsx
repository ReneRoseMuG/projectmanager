/**
 * Test Scope:
 * DocumentCard — zweizeilige Dokument-Karte mit Mehrfachauswahl (MS-75).
 *
 * Abgedeckte Regeln:
 * - Die Karte zeigt den Dateinamen sowie alle zugewiesenen Sammlungen und Kategorien.
 * - Ohne Zuordnung erscheint ein dezenter Platzhalter statt einer leeren Zeile.
 * - Ohne aktive Auswahl öffnet ein Klick auf die Karte die Detailansicht (onOpen).
 * - Die Auswahl-Checkbox togglet die Mehrfachauswahl (onToggleSelect).
 * - Bei aktiver Auswahl togglet ein Klick auf die Karte die Auswahl statt zu öffnen.
 * - Der Löschen-Button löst onDelete aus, ohne die Karte zu öffnen (stopPropagation).
 *
 * Fehlerfälle:
 * - Ohne Löschrecht wird kein Löschen-Button angeboten.
 *
 * Ziel:
 * Absichern, dass Anzeige, Öffnen, Auswählen und Löschen sauber getrennt auslösen.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { Attachment } from "@taskmanager/shared-types";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentCard } from "../../../../../apps/web/src/components/attachments/DocumentCard";

function doc(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 1,
    owners: [],
    originalName: "Rechnung.pdf",
    displayName: null,
    description: null,
    filename: "stored-1.pdf",
    mimetype: "application/pdf",
    size: 2048,
    url: "/uploads/stored-1.pdf",
    categories: [],
    tags: [],
    folders: [],
    createdAt: "2026-07-07T08:00:00.000Z",
    updatedAt: "2026-07-07T08:00:00.000Z",
    version: 1,
    ...overrides,
  };
}

function renderCard(props: Partial<ComponentProps<typeof DocumentCard>> = {}) {
  const merged: ComponentProps<typeof DocumentCard> = {
    document: doc(),
    selected: false,
    isSelected: false,
    selectionActive: false,
    onToggleSelect: vi.fn(),
    onOpen: vi.fn(),
    canDelete: true,
    onDelete: vi.fn(),
    ...props,
  };
  render(<DocumentCard {...merged} />);
  return merged;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DocumentCard", () => {
  it("zeigt Dateiname, Sammlungen und Kategorien", () => {
    renderCard({
      document: doc({
        folders: [{ id: 5, parentId: null, projectId: null, name: "Verträge", version: 1 }],
        categories: [{ id: 3, name: "Wichtig", color: "#ef4444", version: 1 }],
      }),
    });

    expect(screen.getByText("Rechnung")).toBeInTheDocument();
    expect(screen.getByText("Verträge")).toBeInTheDocument();
    expect(screen.getByText("Wichtig")).toBeInTheDocument();
  });

  it("zeigt einen Platzhalter, wenn keine Zuordnung besteht", () => {
    renderCard();
    expect(screen.getByText("Keine Sammlung oder Kategorie")).toBeInTheDocument();
  });

  it("öffnet die Detailansicht bei Klick auf die Karte, wenn keine Auswahl aktiv ist", () => {
    const props = renderCard();
    fireEvent.click(screen.getByText("Rechnung"));
    expect(props.onOpen).toHaveBeenCalledTimes(1);
    expect(props.onToggleSelect).not.toHaveBeenCalled();
  });

  it("togglet die Auswahl über die Checkbox", () => {
    const props = renderCard();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(props.onToggleSelect).toHaveBeenCalledTimes(1);
  });

  it("togglet bei aktiver Auswahl die Auswahl statt zu öffnen", () => {
    const props = renderCard({ selectionActive: true });
    fireEvent.click(screen.getByText("Rechnung"));
    expect(props.onToggleSelect).toHaveBeenCalledTimes(1);
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it("löscht über den Button, ohne die Karte zu öffnen", () => {
    const props = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Endgültig löschen" }));
    expect(props.onDelete).toHaveBeenCalledTimes(1);
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it("bietet ohne Löschrecht keinen Löschen-Button", () => {
    renderCard({ canDelete: false });
    expect(screen.queryByRole("button", { name: "Endgültig löschen" })).not.toBeInTheDocument();
  });
});
