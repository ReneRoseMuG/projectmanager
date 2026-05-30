// @vitest-environment jsdom

/**
 * Test Scope:
 * PageHeader
 *
 * Abgedeckte Regeln:
 * - Standalone-Hauptansichten können einen icon-only Aktualisieren-Button rendern.
 * - Ohne Refresh-Handler wird kein Refresh-Button angeboten.
 *
 * Fehlerfälle:
 * - Der Refresh-Button darf keinen sichtbaren Text erzeugen.
 *
 * Ziel:
 * Den wiederverwendbaren Seitenkopf für Standalone-Hauptansichten absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageHeader } from "../../../../../apps/web/src/components/ui/PageHeader";

afterEach(() => {
  cleanup();
});

describe("PageHeader", () => {
  it("rendert einen icon-only Aktualisieren-Button", () => {
    const onRefresh = vi.fn();
    render(<PageHeader title="Tickets" subtitle="3 Einträge" onRefresh={onRefresh} />);

    const refreshButton = screen.getByRole("button", { name: "Aktualisieren" });
    expect(refreshButton).toHaveClass("h-9", "w-9");
    expect(refreshButton).toHaveTextContent("");

    fireEvent.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("blendet den Aktualisieren-Button ohne Handler aus", () => {
    render(<PageHeader title="Tickets" />);

    expect(screen.queryByRole("button", { name: "Aktualisieren" })).not.toBeInTheDocument();
  });
});
