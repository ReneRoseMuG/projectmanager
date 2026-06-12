// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte React-Komponente; nur die Aktions-Callbacks sind Spies.
 *
 * Mock-Entscheidung:
 * - Keine Modul-Mocks; vi.fn()-Spies prüfen die Verdrahtung der Klick-Handler.
 *
 * Isolation:
 * - jsdom ohne API- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - Der geteilte Detail-Kopf-Cluster rendert die Aktionen in fester Reihenfolge
 *   (Speicherstatus → Bearbeiten → Kopieren → In neuem Tab → Löschen → Schließen).
 * - Nur Aktionen mit übergebenem Handler/Referenz werden gerendert.
 * - Das Delete-Label ist überschreibbar; showBackLabel ergänzt den "Zurück"-Text.
 * - Der onLight-Modus rendert Bearbeiten als Textbutton.
 *
 * Fehlerfälle:
 * - Klicks dürfen nur den jeweils zugehörigen Handler auslösen.
 * - Ohne Referenz darf keine Kopieraktion erscheinen.
 *
 * Ziel:
 * Den einheitlichen Aktions-Cluster absichern, den FormModal und WikiPageForm teilen.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DetailHeaderActions } from "../../../../../apps/web/src/components/ui/DetailHeaderActions";

afterEach(cleanup);

describe("DetailHeaderActions", () => {
  it("rendert die Aktionen in kanonischer Reihenfolge", () => {
    render(
      <DetailHeaderActions
        tone="onSteel"
        saveStatus={<span>Gespeichert</span>}
        onEdit={vi.fn()}
        objectReference="WIKI-9"
        onOpenInTab={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const names = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label") ?? button.textContent);

    expect(names).toEqual([
      "Bearbeiten",
      "ID WIKI-9 kopieren",
      "In neuem Tab öffnen",
      "Löschen",
      "Schließen",
    ]);
    expect(screen.getByText("Gespeichert")).toBeInTheDocument();
  });

  it("rendert nur die übergebenen Aktionen", () => {
    render(<DetailHeaderActions objectReference="WIKI-1" />);

    expect(screen.getByRole("button", { name: "ID WIKI-1 kopieren" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Schließen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Löschen" })).not.toBeInTheDocument();
  });

  it("löst nur den geklickten Handler aus und nutzt das Delete-Label", () => {
    const onEdit = vi.fn();
    const onOpenInTab = vi.fn();
    const onDelete = vi.fn();
    const onClose = vi.fn();
    render(
      <DetailHeaderActions
        onEdit={onEdit}
        onOpenInTab={onOpenInTab}
        onDelete={onDelete}
        deleteLabel="Seite löschen"
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Seite löschen" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
    expect(onOpenInTab).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("zeigt das Zurück-Label nur bei showBackLabel", () => {
    const { rerender } = render(<DetailHeaderActions onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Schließen" })).not.toHaveTextContent("Zurück");

    rerender(<DetailHeaderActions onClose={vi.fn()} showBackLabel />);
    expect(screen.getByRole("button", { name: "Schließen" })).toHaveTextContent("Zurück");
  });

  it("rendert Bearbeiten im onLight-Modus als Textbutton", () => {
    render(<DetailHeaderActions tone="onLight" onEdit={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Bearbeiten" })).toHaveTextContent("Bearbeiten");
  });
});
