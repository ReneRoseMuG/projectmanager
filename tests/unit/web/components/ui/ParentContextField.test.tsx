// @vitest-environment jsdom

/**
 * Test Scope:
 * ParentContextField
 *
 * Abgedeckte Regeln:
 * - Sichtbare Parent-Kontexte werden als read-only Badges mit Referenz gerendert.
 * - Leere oder fehlende Parent-Kontexte erzeugen keine UI.
 * - Bei onUnlink erscheint ein ×-Button nur für direct-Einträge mit unlinkbarem Typ (TKT-65).
 * - inherited-Einträge und nicht-unlinkbare Typen (task, ticket) erhalten keinen ×-Button.
 *
 * Fehlerfälle:
 * - Leere Labels dürfen keine Badge-Zeile erzeugen.
 *
 * Ziel:
 * Den neuen Stammdaten-Kontext gegen falsche oder überflüssige Anzeige absichern.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
          { type: "task", id: 11, label: "Checkliste", origin: "direct" },
          { type: "ticket", id: 25, label: "Login Bug", origin: "direct" },
          { type: "useCase", id: 3, label: "Anmelden", origin: "direct" }
        ]}
      />
    );

    expect(screen.getByTestId("parent-context-field")).toBeInTheDocument();
    expect(screen.getByText("PROJ-7")).toBeInTheDocument();
    expect(screen.getByText("Apollo")).toBeInTheDocument();
    expect(screen.getByText("TASK-11")).toBeInTheDocument();
    expect(screen.getByText("Checkliste")).toBeInTheDocument();
    expect(screen.getByText("TKT-25")).toBeInTheDocument();
    expect(screen.getByText("Login Bug")).toBeInTheDocument();
    expect(screen.getByText("UC-3")).toBeInTheDocument();
    expect(screen.getByText("Anmelden")).toBeInTheDocument();
    expect(document.querySelector(".lucide-list-todo")).toBeInTheDocument();
    expect(document.querySelector(".lucide-bug")).toBeInTheDocument();
    expect(document.querySelector(".lucide-layers3")).toBeInTheDocument();
    expect(document.querySelector(".lucide-clipboard-list")).not.toBeInTheDocument();
  });

  it("rendert bei leeren Kontexten nichts", () => {
    const { container } = render(
      <ParentContextField parents={[{ type: "task", id: 1, label: "   ", origin: "direct" }]} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("zeigt ×-Button nur für direct-Einträge mit unlinkbarem Typ (TKT-65)", () => {
    const onUnlink = vi.fn();
    render(
      <ParentContextField
        onUnlink={onUnlink}
        parents={[
          { type: "milestone", id: 1, label: "MS Alpha", origin: "direct" },
          { type: "project",   id: 2, label: "Proj Beta", origin: "inherited" },
          { type: "task",      id: 3, label: "Aufgabe",  origin: "direct" },
          { type: "ticket",    id: 4, label: "TKT",      origin: "direct" },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: /Verknüpfung mit Meilenstein „MS Alpha"/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Verknüpfung mit Projekt „Proj Beta"/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Verknüpfung mit Aufgabe/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Verknüpfung mit Ticket/ })).not.toBeInTheDocument();
  });

  it("ruft onUnlink mit dem korrekten Parent-Kontext auf (TKT-65)", () => {
    const onUnlink = vi.fn();
    const parent = { type: "milestone" as const, id: 5, label: "Release 1.0", origin: "direct" as const };
    render(<ParentContextField onUnlink={onUnlink} parents={[parent]} />);

    fireEvent.click(screen.getByRole("button", { name: /Verknüpfung mit Meilenstein „Release 1.0"/ }));

    expect(onUnlink).toHaveBeenCalledOnce();
    expect(onUnlink).toHaveBeenCalledWith(parent);
  });

  it("zeigt keinen ×-Button wenn onUnlink nicht übergeben wird", () => {
    render(
      <ParentContextField
        parents={[{ type: "milestone", id: 1, label: "MS Alpha", origin: "direct" }]}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
