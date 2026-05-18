// @vitest-environment jsdom

/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - EmptyState wenn existingItems und draftItems beide leer.
 * - Kein EmptyState wenn existingItems vorhanden.
 * - Kein EmptyState wenn draftItems vorhanden.
 * - Footer-Hinweis „Diese Zuordnungen werden nach dem Speichern verknüpft." immer sichtbar.
 * - showLinkExisting=false: „Verknüpfen"-Button nicht sichtbar.
 * - showCreateNew=false: „Neu erstellen"-Button nicht sichtbar.
 * - „Verknüpfen" geklickt → onLinkExisting() aufgerufen.
 * - „Neu erstellen" geklickt → onCreateNew() aufgerufen.
 * - Entfernen-Button bei existingItem → onRemoveExisting(korrekter Index) aufgerufen.
 * - Entfernen-Button bei draftItem → onRemoveDraft(korrekter Index) aufgerufen.
 * Ziel: PendingRelationList-Rendering und alle Interaktionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { Link2 } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PendingRelationList } from "../PendingRelationList";

afterEach(() => {
  cleanup();
});

function renderPendingRelationList(overrides: Partial<Parameters<typeof PendingRelationList>[0]> = {}) {
  return render(
    <PendingRelationList
      existingItems={[]}
      draftItems={[]}
      emptyIcon={<Link2 />}
      emptyTitle="Keine Zuordnungen"
      onRemoveExisting={vi.fn()}
      onRemoveDraft={vi.fn()}
      {...overrides}
    />
  );
}

describe("PendingRelationList", () => {
  it("zeigt EmptyState wenn existingItems und draftItems leer sind", () => {
    renderPendingRelationList();

    expect(screen.getByText("Keine Zuordnungen")).toBeInTheDocument();
    expect(screen.getByText("Noch keine Zuordnungen vorgemerkt.")).toBeInTheDocument();
  });

  it("zeigt keinen EmptyState wenn existingItems vorhanden sind", () => {
    renderPendingRelationList({
      existingItems: [{ id: 1, title: "Bestehende Aufgabe" }]
    });

    expect(screen.getByText("Bestehende Aufgabe")).toBeInTheDocument();
    expect(screen.queryByText("Keine Zuordnungen")).not.toBeInTheDocument();
  });

  it("zeigt keinen EmptyState wenn draftItems vorhanden sind", () => {
    renderPendingRelationList({
      draftItems: [{ title: "Neue Aufgabe" }]
    });

    expect(screen.getByText("Neue Aufgabe")).toBeInTheDocument();
    expect(screen.queryByText("Keine Zuordnungen")).not.toBeInTheDocument();
  });

  it("zeigt den Footer-Hinweis immer an", () => {
    const { rerender } = render(
      <PendingRelationList
        existingItems={[]}
        draftItems={[]}
        emptyIcon={<Link2 />}
        emptyTitle="Keine Zuordnungen"
        onRemoveExisting={vi.fn()}
        onRemoveDraft={vi.fn()}
      />
    );

    expect(screen.getByText("Diese Zuordnungen werden nach dem Speichern verknüpft.")).toBeInTheDocument();

    rerender(
      <PendingRelationList
        existingItems={[{ id: 2, title: "Bestehendes Ticket" }]}
        draftItems={[{ title: "Neues Ticket" }]}
        emptyIcon={<Link2 />}
        emptyTitle="Keine Zuordnungen"
        onRemoveExisting={vi.fn()}
        onRemoveDraft={vi.fn()}
      />
    );

    expect(screen.getByText("Diese Zuordnungen werden nach dem Speichern verknüpft.")).toBeInTheDocument();
  });

  it("blendet den Verknüpfen-Button bei showLinkExisting=false aus", () => {
    renderPendingRelationList({ showLinkExisting: false });

    expect(screen.queryByRole("button", { name: "Verknüpfen" })).not.toBeInTheDocument();
  });

  it("blendet den Neu-erstellen-Button bei showCreateNew=false aus", () => {
    renderPendingRelationList({ showCreateNew: false });

    expect(screen.queryByRole("button", { name: "Neu erstellen" })).not.toBeInTheDocument();
  });

  it("ruft onLinkExisting beim Klick auf Verknüpfen auf", () => {
    const onLinkExisting = vi.fn();
    renderPendingRelationList({ onLinkExisting });

    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));

    expect(onLinkExisting).toHaveBeenCalledTimes(1);
  });

  it("ruft onCreateNew beim Klick auf Neu erstellen auf", () => {
    const onCreateNew = vi.fn();
    renderPendingRelationList({ onCreateNew });

    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));

    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it("ruft onRemoveExisting mit dem korrekten Index auf", () => {
    const onRemoveExisting = vi.fn();
    renderPendingRelationList({
      existingItems: [
        { id: 1, title: "Erste Aufgabe" },
        { id: 2, title: "Zweite Aufgabe" }
      ],
      onRemoveExisting
    });

    fireEvent.click(screen.getByRole("button", { name: "Zweite Aufgabe entfernen" }));

    expect(onRemoveExisting).toHaveBeenCalledWith(1);
  });

  it("ruft onRemoveDraft mit dem korrekten Index auf", () => {
    const onRemoveDraft = vi.fn();
    renderPendingRelationList({
      draftItems: [{ title: "Erster Entwurf" }, { title: "Zweiter Entwurf" }],
      onRemoveDraft
    });

    fireEvent.click(screen.getByRole("button", { name: "Zweiter Entwurf entfernen" }));

    expect(onRemoveDraft).toHaveBeenCalledWith(1);
  });
});
