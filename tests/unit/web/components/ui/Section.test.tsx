// @vitest-environment jsdom

/**
 * Test Scope:
 * Section
 *
 * Abgedeckte Regeln:
 * - Normale Sections behalten den Kartenrahmen für Formularfelder.
 * - Fill-Sections für List-/Board-Tabs verzichten auf zusätzlichen Außenrahmen und Padding.
 *
 * Fehlerfälle:
 * - Board-/List-Tabs dürfen nicht wieder durch eine gepolsterte Section-Karte eingeengt werden.
 *
 * Ziel:
 * Die gemeinsame Section-Komponente gegen Layout-Regressionen zwischen Formularfeldern und füllenden Tab-Inhalten absichern.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Section } from "../../../../../apps/web/src/components/ui/Section";

afterEach(() => {
  cleanup();
});

describe("Section", () => {
  it("behält für normale Inhalte den Kartenrahmen", () => {
    render(
      <Section title="Details">
        <div>Inhalt</div>
      </Section>
    );

    const section = screen.getByText("Details").closest("section");

    expect(section).toHaveClass("rounded-lg", "border", "border-line", "bg-white", "p-2.5", "shadow-panel");
  });

  it("rendert Fill-Sections ohne zusätzlichen Außenrand", () => {
    render(
      <Section title="Aufgaben" fill>
        <div>Board</div>
      </Section>
    );

    const section = screen.getByText("Aufgaben").closest("section");

    expect(section).toHaveClass("flex", "min-h-0", "flex-1", "flex-col");
    expect(section).not.toHaveClass("rounded-lg", "border", "border-line", "bg-white", "p-2.5", "shadow-panel");
  });
});
