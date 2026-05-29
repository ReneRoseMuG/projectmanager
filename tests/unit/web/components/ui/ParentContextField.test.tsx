// @vitest-environment jsdom

/**
 * Test Scope:
 * ParentContextField
 *
 * Abgedeckte Regeln:
 * - Sichtbare Parent-Kontexte werden als read-only Badges mit Referenz gerendert.
 * - Leere oder fehlende Parent-Kontexte erzeugen keine UI.
 *
 * Fehlerfälle:
 * - Leere Labels dürfen keine Badge-Zeile erzeugen.
 *
 * Ziel:
 * Den neuen Stammdaten-Kontext gegen falsche oder überflüssige Anzeige absichern.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ParentContextField } from "../../../../../apps/web/src/components/ui/ParentContextField";

afterEach(() => {
  cleanup();
});

describe("ParentContextField", () => {
  it("rendert Parent-Badges mit Typ, Referenz und Label", () => {
    render(
      <ParentContextField
        parents={[
          { type: "project", id: 7, label: "Apollo", origin: "direct" },
          { type: "ticket", id: 25, label: "Login Bug", origin: "direct" }
        ]}
      />
    );

    expect(screen.getByTestId("parent-context-field")).toBeInTheDocument();
    expect(screen.getByText("PROJ-7")).toBeInTheDocument();
    expect(screen.getByText("Apollo")).toBeInTheDocument();
    expect(screen.getByText("TKT-25")).toBeInTheDocument();
    expect(screen.getByText("Login Bug")).toBeInTheDocument();
  });

  it("rendert bei leeren Kontexten nichts", () => {
    const { container } = render(
      <ParentContextField parents={[{ type: "task", id: 1, label: "   ", origin: "direct" }]} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
