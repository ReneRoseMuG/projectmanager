// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte ColorPicker-Komponente inkl. echtem useColorPalette-Hook (jsdom-
 *   localStorage) und echtem @uiw/react-color-Picker. Keine UI-Hooks gestubbt.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. onChange ist eine vi.fn()-Spy als Test-Sonde, kein Verhaltens-Double.
 *
 * Isolation:
 * - jsdom, localStorage.clear() vor jedem Test, kein Netzwerk/FS.
 *
 * Abgedeckte Regeln:
 * - Die Palette ist nicht dauerhaft sichtbar: ohne Öffnen kein Popover/Swatches.
 * - Klick auf das Feld öffnet das Popover (role=dialog) mit Palette.
 * - Klick auf einen Paletten-Swatch meldet exakt dessen Farbe an onChange.
 * - Gültige Hex-Eingabe meldet den normalisierten Wert an onChange.
 * - "Hinzufügen" ergänzt die aktuelle Farbe als neuen Paletten-Swatch.
 * - Import fügt eingefügte Hex-Farben als Swatches hinzu.
 * - Außenklick schließt das Popover.
 *
 * Fehlerfälle:
 * - Ungültige Hex-Eingabe ("#12") löst kein onChange aus.
 *
 * Ziel:
 * ColorPicker (Feld + Popover, pflegbare Palette) gegen Regressionen absichern —
 * insbesondere das bewusste Verbergen der Palette hinter dem Feld.
 */

import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorPicker } from "../../../../../apps/web/src/components/ui/ColorPicker";
import { defaultPaletteColors } from "../../../../../apps/web/src/hooks/useColorPalette";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
});

function openPopover() {
  fireEvent.click(screen.getByRole("button", { name: "Farbe wählen" }));
  return screen.getByRole("dialog", { name: "Farbauswahl" });
}

describe("ColorPicker", () => {
  it("zeigt die Palette nicht dauerhaft, sondern erst nach Öffnen des Feldes", () => {
    render(<ColorPicker value="#ff8800" onChange={vi.fn()} />);

    expect(screen.queryByRole("dialog", { name: "Farbauswahl" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: `Farbe ${defaultPaletteColors[0]}` }),
    ).not.toBeInTheDocument();

    expect(openPopover()).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Farbe ${defaultPaletteColors[0]}` }),
    ).toBeInTheDocument();
  });

  it("meldet die exakte Farbe eines Paletten-Swatches an onChange", () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#ff8800" onChange={onChange} />);

    const dialog = openPopover();
    fireEvent.click(within(dialog).getByRole("button", { name: `Farbe ${defaultPaletteColors[0]}` }));

    expect(onChange).toHaveBeenCalledWith(defaultPaletteColors[0]);
  });

  it("meldet eine gültige Hex-Eingabe normalisiert an onChange", () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#ff8800" onChange={onChange} />);

    openPopover();
    fireEvent.change(screen.getByLabelText("Hex-Wert"), { target: { value: "#123456" } });

    expect(onChange).toHaveBeenCalledWith("#123456");
  });

  it("löst bei ungültiger Hex-Eingabe kein onChange aus", () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#ff8800" onChange={onChange} />);

    openPopover();
    fireEvent.change(screen.getByLabelText("Hex-Wert"), { target: { value: "#12" } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("fügt die aktuelle Farbe der Palette hinzu", () => {
    render(<ColorPicker value="#ff8800" onChange={vi.fn()} />);

    const dialog = openPopover();
    expect(
      within(dialog).queryByRole("button", { name: "Farbe #ff8800" }),
    ).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Farbe zur Palette hinzufügen" }));

    expect(within(dialog).getByRole("button", { name: "Farbe #ff8800" })).toBeInTheDocument();
  });

  it("importiert eingefügte Hex-Farben als neue Swatches", () => {
    const dialog = (() => {
      render(<ColorPicker value="#ff8800" onChange={vi.fn()} />);
      return openPopover();
    })();

    fireEvent.click(within(dialog).getByRole("button", { name: "Palette importieren" }));
    fireEvent.change(within(dialog).getByLabelText("Hex-Farben zum Importieren"), {
      target: { value: "#abcdef, #001122" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Importieren" }));

    expect(within(dialog).getByRole("button", { name: "Farbe #abcdef" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Farbe #001122" })).toBeInTheDocument();
  });

  it("schließt das Popover bei Außenklick", () => {
    render(<ColorPicker value="#ff8800" onChange={vi.fn()} />);

    openPopover();
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("dialog", { name: "Farbauswahl" })).not.toBeInTheDocument();
  });
});
