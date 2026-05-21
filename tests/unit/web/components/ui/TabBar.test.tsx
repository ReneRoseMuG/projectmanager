// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TabBar zeigt Count-Badges nur für positive Werte.
 *
 * Fehlerfälle:
 * - Null-Zähler dürfen nicht wie vorhandene Inhalte wirken.
 *
 * Ziel:
 * Die Tab-Zähler-Darstellung gegen leere, positive und fehlende Counts absichern.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TabBar } from "../../../../../apps/web/src/components/ui/TabBar";

afterEach(() => {
  cleanup();
});

describe("TabBar", () => {
  it("blendet Count-Badges mit Wert 0 aus", () => {
    render(
      <TabBar
        active="comments"
        onChange={vi.fn()}
        tabs={[
          { value: "comments", label: "Kommentare", count: 0 },
          { value: "notes", label: "Notizen", count: 2 },
          { value: "files", label: "Dateien" },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Kommentare" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Kommentare\s+0$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Notizen\s+2$/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dateien" })).toBeInTheDocument();
  });
});
