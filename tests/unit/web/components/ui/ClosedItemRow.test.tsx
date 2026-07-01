// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ClosedItemRow rendert Titel als h3 mit line-clamp-2.
 * - childCount > 0 zeigt einen Footer mit Zähler; 0 oder undefined unterdrückt ihn.
 * - onOpen macht die Karte klickbar (cursor-pointer) und leitet Klicks weiter.
 * - accentColor steuert borderLeftColor.
 * - onOpenInTab erzeugt einen "In Tab öffnen"-Eintrag im ActionMenu.
 *
 * Fehlerfälle:
 * - Klick auf den ActionMenu-Bereich darf kein onOpen auslösen.
 *
 * Ziel:
 * ClosedItemRow gegen Regressionen bei childCount, onOpen-Propagation und ActionMenu absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClosedItemRow } from "../../../../../apps/web/src/components/ui/ClosedItemRow";

afterEach(() => {
  cleanup();
});

describe("ClosedItemRow", () => {
  it("rendert Titel als h3 mit line-clamp-2", () => {
    render(<ClosedItemRow title="Aufgabe Alpha" />);

    const heading = screen.getByRole("heading", { name: "Aufgabe Alpha" });
    expect(heading.tagName).toBe("H3");
    expect(heading).toHaveClass("line-clamp-2");
  });

  it("zeigt childCount-Footer wenn childCount > 0", () => {
    const { container } = render(<ClosedItemRow title="Aufgabe Alpha" childCount={3} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(container.querySelectorAll("article > div")).toHaveLength(2);
  });

  it("zeigt keinen Footer wenn childCount=0", () => {
    const { container } = render(<ClosedItemRow title="Aufgabe Alpha" childCount={0} />);

    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(container.querySelectorAll("article > div")).toHaveLength(1);
  });

  it("zeigt keinen Footer wenn childCount nicht übergeben wird", () => {
    const { container } = render(<ClosedItemRow title="Aufgabe Alpha" />);

    expect(container.querySelectorAll("article > div")).toHaveLength(1);
  });

  it("setzt cursor-pointer wenn onOpen übergeben wird", () => {
    render(<ClosedItemRow title="Aufgabe Alpha" onOpen={vi.fn()} />);

    const card = screen.getByRole("heading", { name: "Aufgabe Alpha" }).closest("article");
    expect(card).toHaveClass("cursor-pointer");
  });

  it("zeigt Parent-Kontext als Badge", () => {
    render(
      <ClosedItemRow
        title="Aufgabe Alpha"
        parent={{ type: "milestone", id: 7, label: "Launch", origin: "direct" }}
      />,
    );

    expect(screen.getByText("Meilenstein: Launch")).toBeInTheDocument();
  });

  it("setzt kein cursor-pointer ohne onOpen", () => {
    render(<ClosedItemRow title="Aufgabe Alpha" />);

    const card = screen.getByRole("heading", { name: "Aufgabe Alpha" }).closest("article");
    expect(card).not.toHaveClass("cursor-pointer");
  });

  it("ruft onOpen beim Klick auf die Karte auf", () => {
    const onOpen = vi.fn();
    render(<ClosedItemRow title="Aufgabe Alpha" onOpen={onOpen} />);

    fireEvent.click(screen.getByRole("heading", { name: "Aufgabe Alpha" }).closest("article")!);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("setzt accentColor als borderLeftColor", () => {
    render(<ClosedItemRow title="Aufgabe Alpha" accentColor="#4f46e5" />);

    const card = screen.getByRole("heading", { name: "Aufgabe Alpha" }).closest("article");
    expect(card).toHaveStyle({ borderLeftColor: "#4f46e5" });
  });

  it("rendert 'In Tab öffnen' im ActionMenu wenn onOpenInTab übergeben", () => {
    const onOpenInTab = vi.fn();
    render(<ClosedItemRow title="Aufgabe Alpha" onOpenInTab={onOpenInTab} />);

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "In Tab öffnen" }));

    expect(onOpenInTab).toHaveBeenCalledTimes(1);
  });

  it("Klick auf den ActionMenu-Bereich stoppt Propagation zu onOpen", () => {
    const onOpen = vi.fn();
    render(<ClosedItemRow title="Aufgabe Alpha" onOpen={onOpen} onOpenInTab={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    expect(onOpen).not.toHaveBeenCalled();
  });
});
