// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Direkte Komponentendarstellung mit @testing-library/react.
 *
 * Mock-Entscheidung:
 * - Keine Mocks — SaveStatus ist eine reine Darstellungskomponente ohne externe Abhängigkeiten.
 *
 * Isolation:
 * - jsdom.
 *
 * Abgedeckte Regeln:
 * - "idle" → rendert nichts.
 * - "saving" → zeigt "Speichern…".
 * - "saved" → zeigt "Gespeichert".
 * - "error" → zeigt "Fehler beim Speichern", title-Attribut enthält errorMessage.
 *
 * Fehlerfälle:
 * - "error" ohne errorMessage → title-Attribut ist undefined.
 *
 * Ziel:
 * Die AutoSave-Statusanzeige gegen Regressionen in Text und Attributen absichern.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SaveStatus } from "../../../../../apps/web/src/components/ui/SaveStatus";

afterEach(() => {
  cleanup();
});

describe("SaveStatus", () => {
  it("rendert nichts im idle-Zustand", () => {
    const { container } = render(<SaveStatus status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it("zeigt 'Speichern…' im saving-Zustand", () => {
    render(<SaveStatus status="saving" />);
    expect(screen.getByText("Speichern…")).toBeInTheDocument();
  });

  it("zeigt 'Gespeichert' im saved-Zustand", () => {
    render(<SaveStatus status="saved" />);
    expect(screen.getByText("Gespeichert")).toBeInTheDocument();
  });

  it("zeigt 'Fehler beim Speichern' im error-Zustand mit errorMessage als title", () => {
    render(<SaveStatus status="error" errorMessage="Netzwerkfehler" />);
    const el = screen.getByText("Fehler beim Speichern");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("title", "Netzwerkfehler");
  });

  it("zeigt 'Fehler beim Speichern' ohne title wenn errorMessage fehlt", () => {
    render(<SaveStatus status="error" />);
    const el = screen.getByText("Fehler beim Speichern");
    expect(el).toBeInTheDocument();
    expect(el).not.toHaveAttribute("title");
  });
});
