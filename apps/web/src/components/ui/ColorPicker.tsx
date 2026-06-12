import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Upload, X } from "lucide-react";
import { ShadeSlider, Wheel, hexToHsva, hsvaToHex } from "@uiw/react-color";
import { useColorPalette } from "../../hooks/useColorPalette";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const FALLBACK_HEX = "#000000";
const POPOVER_WIDTH = 224;
const POPOVER_EST_HEIGHT = 360;
const WHEEL_SIZE = 168;

function normalizeHexColor(color: string): string | undefined {
  const value = color.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }
  return undefined;
}

function resolveCssVariableColor(color: string): string | undefined {
  const match = /^var\(\s*(--[\w-]+)\s*\)$/.exec(color.trim());
  const variableName = match?.[1];
  if (!variableName || typeof document === "undefined") {
    return undefined;
  }
  return normalizeHexColor(
    getComputedStyle(document.documentElement).getPropertyValue(variableName),
  );
}

/** Liefert einen für native Farbverarbeitung gültigen Hex-Wert (löst Tokens auf). */
function colorInputValue(color: string): string {
  return normalizeHexColor(color) ?? resolveCssVariableColor(color) ?? FALLBACK_HEX;
}

/**
 * Farb-Feld mit Popover-Auswahl: ein kompaktes Swatch öffnet eine Picker-UI
 * (Farbrad + Helligkeit + Hex-Eingabe + pflegbare Palette). Die Palette ist
 * bewusst nicht dauerhaft sichtbar, sondern nur im geöffneten Popover.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const { palette, addColor, removeColor, importColors } = useColorPalette();
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [dropUp, setDropUp] = useState(false);
  const [hsva, setHsva] = useState(() => hexToHsva(colorInputValue(value)));
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Beim Öffnen Picker-Zustand aus dem aktuellen Wert ableiten.
  useEffect(() => {
    if (open) {
      setHsva(hexToHsva(colorInputValue(value)));
      setHexDraft(null);
      setShowImport(false);
      setImportText("");
    }
    // value bewusst nicht als Dependency: während offen ist hsva die Wahrheit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Portal-Position an das Trigger-Feld koppeln, auch bei Scroll/Resize.
  useEffect(() => {
    if (!open) {
      return;
    }
    const update = () => {
      const el = triggerRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      setAnchorRect(rect);
      setDropUp(window.innerHeight - rect.bottom < POPOVER_EST_HEIGHT);
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Schließen bei Außenklick/ESC. mousedown im Popover wird per stopPropagation
  // abgefangen, damit ein umgebendes Dropdown (TagPicker) geöffnet bleibt.
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) {
        return;
      }
      if (popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const currentHex = hsvaToHex(hsva);

  const applyHsva = (next: typeof hsva) => {
    setHsva(next);
    onChange(hsvaToHex(next));
  };

  const selectPaletteColor = (color: string) => {
    setHsva(hexToHsva(colorInputValue(color)));
    setHexDraft(null);
    onChange(color);
  };

  const runImport = () => {
    const count = importColors(importText);
    if (count > 0) {
      setImportText("");
      setShowImport(false);
    }
  };

  const popoverStyle: CSSProperties | undefined = anchorRect
    ? {
        position: "fixed",
        zIndex: 9999,
        width: POPOVER_WIDTH,
        left: Math.max(
          8,
          Math.min(anchorRect.left, window.innerWidth - POPOVER_WIDTH - 8),
        ),
        ...(dropUp
          ? { bottom: window.innerHeight - anchorRect.top + 6 }
          : { top: anchorRect.bottom + 6 }),
      }
    : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Farbe wählen"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="h-8 w-8 rounded-full border-2 border-white shadow-sm outline-none ring-1 ring-line transition hover:ring-2 hover:ring-steel-300 focus:ring-2 focus:ring-steel-600"
        style={{ backgroundColor: value || "var(--color-steel-200)" }}
        onClick={() => setOpen((current) => !current)}
      />
      {open && popoverStyle
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Farbauswahl"
              style={popoverStyle}
              onMouseDown={(event) => event.stopPropagation()}
              className="rounded-lg border border-line bg-white p-3 shadow-panel"
            >
              <div className="flex flex-col items-center gap-3">
                <Wheel
                  color={hsva}
                  width={WHEEL_SIZE}
                  height={WHEEL_SIZE}
                  onChange={(color) => applyHsva({ ...hsva, ...color.hsva })}
                />
                <ShadeSlider
                  hsva={hsva}
                  width={WHEEL_SIZE}
                  className="rounded-full"
                  onChange={(newShade) => applyHsva({ ...hsva, ...newShade })}
                />
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <span
                  className="h-7 w-7 shrink-0 rounded-full border border-line"
                  style={{ backgroundColor: currentHex }}
                  aria-hidden="true"
                />
                <input
                  className="h-7 min-w-0 flex-1 rounded border border-line px-2 text-xs uppercase outline-none focus:border-steel-600"
                  value={hexDraft ?? currentHex}
                  aria-label="Hex-Wert"
                  spellCheck={false}
                  onChange={(event) => {
                    const next = event.target.value;
                    setHexDraft(next);
                    const normalized = normalizeHexColor(next);
                    if (normalized) {
                      applyHsva(hexToHsva(normalized));
                    }
                  }}
                  onBlur={() => setHexDraft(null)}
                />
                <button
                  type="button"
                  aria-label="Farbe zur Palette hinzufügen"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-line text-steel-600 transition hover:bg-shell hover:text-ink"
                  onClick={() => addColor(currentHex)}
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Palette importieren"
                  aria-pressed={showImport}
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border transition ${
                    showImport
                      ? "border-steel-600 bg-shell text-ink"
                      : "border-line text-steel-600 hover:bg-shell hover:text-ink"
                  }`}
                  onClick={() => setShowImport((current) => !current)}
                >
                  <Upload size={14} />
                </button>
              </div>

              {showImport ? (
                <div className="mt-2">
                  <textarea
                    className="h-16 w-full resize-none rounded border border-line px-2 py-1 text-xs outline-none focus:border-steel-600"
                    placeholder="Hex-Farben einfügen, z. B. #ff8800, #112233"
                    value={importText}
                    aria-label="Hex-Farben zum Importieren"
                    onChange={(event) => setImportText(event.target.value)}
                  />
                  <div className="mt-1 flex justify-end gap-1.5">
                    <button
                      type="button"
                      className="h-7 rounded border border-line px-2 text-xs font-medium text-steel-600 transition hover:bg-shell hover:text-ink"
                      onClick={() => {
                        setShowImport(false);
                        setImportText("");
                      }}
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      disabled={importText.trim().length === 0}
                      className="h-7 rounded border border-steel-300 px-2 text-xs font-medium text-steel-600 transition hover:border-steel-500 hover:text-ink disabled:opacity-50"
                      onClick={runImport}
                    >
                      Importieren
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {palette.map((color) => (
                  <div key={color} className="group relative">
                    <button
                      type="button"
                      aria-label={`Farbe ${color}`}
                      className="h-6 w-6 rounded-full border border-white shadow-sm outline-none ring-1 ring-line transition hover:ring-2 hover:ring-steel-300 focus:ring-2 focus:ring-steel-600"
                      style={{ backgroundColor: color }}
                      onClick={() => selectPaletteColor(color)}
                    />
                    <button
                      type="button"
                      aria-label={`Farbe ${color} aus Palette entfernen`}
                      className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full border border-line bg-white text-steel-600 shadow-sm transition hover:text-crimson group-hover:flex"
                      onClick={() => removeColor(color)}
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
