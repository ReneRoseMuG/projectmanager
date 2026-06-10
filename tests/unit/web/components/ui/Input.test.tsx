// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte Input-Atom-Komponente, jsdom-Rendering.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - jsdom ohne API-/DB-Zugriff.
 *
 * Abgedeckte Regeln:
 * - Gewöhnliche Felder erhalten standardmäßig autoComplete="off" plus Passwortmanager-Ignore-Attribute (TASK-324).
 *
 * Fehlerfälle:
 * - Felder mit semantischem autoComplete (z. B. "username") behalten keine Ignore-Attribute und bleiben für Passwortmanager nutzbar.
 *
 * Ziel:
 * Die zentrale Unterdrückung von Passwortmanager-Overlays auf normalen Formularfeldern absichern.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Input } from "../../../../../apps/web/src/components/ui/Input";

afterEach(cleanup);

describe("Input", () => {
  it("unterdrückt Passwortmanager auf gewöhnlichen Feldern", () => {
    const { getByRole } = render(<Input aria-label="Titel" />);
    const input = getByRole("textbox");

    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveAttribute("data-1p-ignore");
    expect(input).toHaveAttribute("data-lpignore", "true");
  });

  it("lässt semantische Felder für Passwortmanager und Autofill nutzbar", () => {
    const { getByRole } = render(<Input aria-label="Benutzername" autoComplete="username" />);
    const input = getByRole("textbox");

    expect(input).toHaveAttribute("autocomplete", "username");
    expect(input).not.toHaveAttribute("data-1p-ignore");
    expect(input).not.toHaveAttribute("data-lpignore");
  });
});
