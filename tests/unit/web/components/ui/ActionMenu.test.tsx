// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ActionMenu öffnet und schließt ein kompaktes Aktionsmenü per Trigger, Eintrag, Escape und Outside-Klick.
 * - Der Trigger bleibt trotz kompakter Darstellung als sichtbares Drei-Punkte-Menü erkennbar.
 * - Danger-Einträge erhalten eine rote Textklasse und Menü-Klicks bleiben innerhalb der Karte/Zeile.
 *
 * Fehlerfälle:
 * - Menüeinträge dürfen keine Parent-Click-Handler auslösen.
 * - Geschlossene Menüs dürfen keine Einträge im DOM halten.
 *
 * Ziel:
 * Die gemeinsame Drei-Punkt-Menü-Interaktion für Board- und Listenaktionen gegen Regressionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { Edit3, Trash2 } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionMenu } from "../../../../../apps/web/src/components/ui/ActionMenu";

afterEach(() => {
  cleanup();
});

describe("ActionMenu", () => {
  it("ist standardmäßig geschlossen", () => {
    render(<ActionMenu items={[{ label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: vi.fn() }]} />);

    expect(screen.getByRole("button", { name: "Aktionen" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Bearbeiten" })).not.toBeInTheDocument();
  });

  it("rendert den Trigger kompakt, aber sichtbar", () => {
    render(<ActionMenu items={[{ label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: vi.fn() }]} />);

    const trigger = screen.getByRole("button", { name: "Aktionen" });

    expect(trigger).toHaveClass("h-8", "w-8", "border-line", "bg-white", "text-ink", "shadow-sm");
    expect(trigger).not.toHaveClass("border-transparent", "bg-transparent", "shadow-none");
  });

  it("öffnet das Dropdown per Trigger", () => {
    render(<ActionMenu items={[{ label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: vi.fn() }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    expect(screen.getByRole("button", { name: "Aktionen" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Bearbeiten" })).toBeInTheDocument();
  });

  it("ruft einen Menüeintrag auf und schließt danach", () => {
    const onEdit = vi.fn();
    render(<ActionMenu items={[{ label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: onEdit }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Bearbeiten" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("schließt bei Klick außerhalb des Dropdowns", () => {
    render(<ActionMenu items={[{ label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: vi.fn() }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("schließt bei Escape", () => {
    render(<ActionMenu items={[{ label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: vi.fn() }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("markiert Danger-Einträge rot", () => {
    render(<ActionMenu items={[{ label: "Löschen", icon: <Trash2 size={16} />, onClick: vi.fn(), danger: true }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    expect(screen.getByRole("menuitem", { name: "Löschen" })).toHaveClass("text-crimson");
  });

  it("verhindert Event-Bubbling von Menüeinträgen", () => {
    const onParentClick = vi.fn();
    const onEdit = vi.fn();
    render(
      <div onClick={onParentClick}>
        <ActionMenu items={[{ label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: onEdit }]} />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Bearbeiten" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
