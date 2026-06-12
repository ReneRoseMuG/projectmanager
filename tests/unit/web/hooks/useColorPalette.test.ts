// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echter React-Hook (renderHook aus @testing-library/react) mit echtem
 *   jsdom-localStorage. Keine Simulation des Speicherverhaltens.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. localStorage ist in jsdom real vorhanden; das Persistenz-
 *   verhalten wird über einen zweiten Hook-Mount real nachgewiesen.
 *
 * Isolation:
 * - jsdom, localStorage.clear() vor jedem Test, kein Netzwerk/FS.
 *
 * Abgedeckte Regeln:
 * - parseHexColors extrahiert 6- und 3-stellige Hex, normalisiert (6-stellig, lowercase), dedupliziert.
 * - Ohne gespeicherte Palette startet der Hook mit den Marken-Seeds (defaultPaletteColors).
 * - addColor ergänzt normalisierte Farben, dedupliziert case-insensitiv.
 * - removeColor entfernt case-insensitiv.
 * - importColors ergänzt alle gefundenen Hex (dedupe) und liefert deren Anzahl.
 * - Änderungen werden in localStorage persistiert und von einem zweiten Hook gelesen.
 *
 * Fehlerfälle:
 * - parseHexColors auf Text ohne Hex → leeres Array.
 * - addColor mit ungültigem Wert ("nope", "#12") → Palette unverändert.
 * - addColor mit Duplikat in anderer Schreibweise → keine Dopplung.
 * - importColors ohne Hex → 0, Palette unverändert.
 * - removeColor auf nicht vorhandene Farbe → Palette unverändert.
 *
 * Ziel:
 * useColorPalette gegen Regressionen bei Parsing, Dedupe, Entfernen und
 * localStorage-Persistenz absichern.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  defaultPaletteColors,
  parseHexColors,
  useColorPalette,
} from "../../../../apps/web/src/hooks/useColorPalette";

const STORAGE_KEY = "pm:color-palette";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("parseHexColors", () => {
  it("extrahiert, normalisiert und dedupliziert Hex-Farben aus Text", () => {
    const input = "Palette: #FFF, #00ff00 #00FF00\nund #112233; plus rgb(1,2,3)";
    expect(parseHexColors(input)).toEqual(["#ffffff", "#00ff00", "#112233"]);
  });

  it("liefert ein leeres Array wenn kein Hex enthalten ist", () => {
    expect(parseHexColors("keine farben hier, nur text und #zz")).toEqual([]);
  });
});

describe("useColorPalette", () => {
  it("startet mit den Marken-Seeds wenn localStorage leer ist", () => {
    const { result } = renderHook(() => useColorPalette());
    expect(result.current.palette).toEqual(defaultPaletteColors);
  });

  it("fügt eine normalisierte Farbe hinzu und ignoriert Duplikate (case-insensitiv)", () => {
    const { result } = renderHook(() => useColorPalette());

    act(() => result.current.addColor("#ABCDEF"));
    act(() => result.current.addColor("#abcdef"));

    const occurrences = result.current.palette.filter((c) => c === "#abcdef");
    expect(occurrences).toEqual(["#abcdef"]);
    expect(result.current.palette).toEqual([...defaultPaletteColors, "#abcdef"]);
  });

  it("ignoriert ungültige Farbwerte", () => {
    const { result } = renderHook(() => useColorPalette());

    act(() => result.current.addColor("nope"));
    act(() => result.current.addColor("#12"));

    expect(result.current.palette).toEqual(defaultPaletteColors);
  });

  it("entfernt eine Farbe case-insensitiv und lässt andere unberührt", () => {
    const { result } = renderHook(() => useColorPalette());

    act(() => result.current.addColor("#abcdef"));
    act(() => result.current.removeColor("#ABCDEF"));
    act(() => result.current.removeColor("#nichtvorhanden"));

    expect(result.current.palette).toEqual(defaultPaletteColors);
  });

  it("importiert alle gefundenen Hex-Farben dedupliziert und liefert die Anzahl", () => {
    const { result } = renderHook(() => useColorPalette());

    let count = 0;
    act(() => {
      count = result.current.importColors("#111111 #222222 #111111 ungültig");
    });

    expect(count).toBe(2);
    expect(result.current.palette).toEqual([
      ...defaultPaletteColors,
      "#111111",
      "#222222",
    ]);
  });

  it("liefert 0 und ändert die Palette nicht wenn der Import keine Hex enthält", () => {
    const { result } = renderHook(() => useColorPalette());

    let count = -1;
    act(() => {
      count = result.current.importColors("nur text");
    });

    expect(count).toBe(0);
    expect(result.current.palette).toEqual(defaultPaletteColors);
  });

  it("persistiert Änderungen in localStorage und liest sie in einem neuen Hook", () => {
    const first = renderHook(() => useColorPalette());
    act(() => first.result.current.addColor("#abcdef"));

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toEqual([...defaultPaletteColors, "#abcdef"]);

    const second = renderHook(() => useColorPalette());
    expect(second.result.current.palette).toEqual([...defaultPaletteColors, "#abcdef"]);
  });
});
