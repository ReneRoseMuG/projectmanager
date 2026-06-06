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
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("kollabierbare Section zeigt Inhalt standardmäßig", () => {
    render(
      <Section title="Verwandte Themen" collapsible>
        <div>Inhalt</div>
      </Section>
    );

    expect(screen.getByText("Inhalt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verwandte Themen" })).toBeInTheDocument();
  });

  it("kollabierbare Section versteckt Inhalt nach Klick", () => {
    render(
      <Section title="Verwandte Themen" collapsible>
        <div>Inhalt</div>
      </Section>
    );

    fireEvent.click(screen.getByRole("button", { name: "Verwandte Themen" }));

    expect(screen.queryByText("Inhalt")).not.toBeInTheDocument();
  });

  it("kollabierbare Section zeigt Inhalt nach erneutem Klick", () => {
    render(
      <Section title="Verwandte Themen" collapsible>
        <div>Inhalt</div>
      </Section>
    );

    fireEvent.click(screen.getByRole("button", { name: "Verwandte Themen" }));
    fireEvent.click(screen.getByRole("button", { name: "Verwandte Themen" }));

    expect(screen.getByText("Inhalt")).toBeInTheDocument();
  });

  it("kollabierbare Section startet eingeklappt bei defaultCollapsed", () => {
    render(
      <Section title="Verwandte Themen" collapsible defaultCollapsed>
        <div>Inhalt</div>
      </Section>
    );

    expect(screen.queryByText("Inhalt")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verwandte Themen" })).toBeInTheDocument();
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
