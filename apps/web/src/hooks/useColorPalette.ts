import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pm:color-palette";

/**
 * Seed-Palette: dieselben Marken-Tokens, die der ColorPicker bisher als feste
 * Swatches genutzt hat. Die Palette ist ab dann benutzerseitig pflegbar.
 */
export const defaultPaletteColors = [
  "var(--color-steel-700)",
  "var(--color-crimson)",
  "var(--color-tangerine)",
  "var(--color-mustard)",
  "var(--color-fern)",
  "var(--color-teal)",
  "var(--color-violet)",
  "var(--color-magenta)",
  "var(--color-ink)",
];

const HEX_PATTERN = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g;

/** Normalisiert eine einzelne Farbe: Token-Strings bleiben, Hex wird 6-stellig/kleingeschrieben. */
function normalizeColor(color: string): string | null {
  const value = color.trim();
  if (value.startsWith("var(")) {
    return value;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }
  return null;
}

/** Extrahiert alle Hex-Farbwerte aus beliebigem Text (Import per Einfügen). */
export function parseHexColors(text: string): string[] {
  const matches = text.match(HEX_PATTERN) ?? [];
  const result: string[] = [];
  for (const raw of matches) {
    const normalized = normalizeColor(raw);
    if (normalized && !result.includes(normalized)) {
      result.push(normalized);
    }
  }
  return result;
}

function readStored(): string[] | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) {
      return parsed as string[];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Browser-lokale, pflegbare Farbpalette für den ColorPicker.
 * Persistiert in localStorage (kein Server-State → bewusst useState statt TanStack Query).
 */
export function useColorPalette() {
  const [palette, setPalette] = useState<string[]>(() => readStored() ?? defaultPaletteColors);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
    } catch {
      // localStorage nicht verfügbar (privater Modus/Quota) — Palette bleibt rein in-memory.
    }
  }, [palette]);

  const addColor = useCallback((color: string) => {
    const normalized = normalizeColor(color);
    if (!normalized) {
      return;
    }
    setPalette((prev) =>
      prev.some((entry) => entry.toLowerCase() === normalized.toLowerCase())
        ? prev
        : [...prev, normalized],
    );
  }, []);

  const removeColor = useCallback((color: string) => {
    setPalette((prev) => prev.filter((entry) => entry.toLowerCase() !== color.toLowerCase()));
  }, []);

  /** Fügt alle in `text` gefundenen Hex-Farben hinzu (dedupliziert). Liefert die Anzahl gefundener Farben. */
  const importColors = useCallback((text: string) => {
    const parsed = parseHexColors(text);
    if (parsed.length > 0) {
      setPalette((prev) => {
        const known = new Set(prev.map((entry) => entry.toLowerCase()));
        const additions = parsed.filter((entry) => !known.has(entry.toLowerCase()));
        return additions.length > 0 ? [...prev, ...additions] : prev;
      });
    }
    return parsed.length;
  }, []);

  return { palette, addColor, removeColor, importColors };
}
