interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  swatches?: string[];
}

const defaultSwatches = [
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

function colorInputValue(color: string): string {
  return normalizeHexColor(color) ?? resolveCssVariableColor(color) ?? "#000000";
}

function ColorSwatch({
  color,
  selected,
  onSelect,
}: {
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`h-9 w-9 rounded-full border-2 transition ${selected ? "border-steel-900 ring-2 ring-steel-200" : "border-white shadow-sm"}`}
      style={{ backgroundColor: color }}
      aria-label={`Farbe ${color}`}
      onClick={onSelect}
    />
  );
}

/** Swatch picker with a native custom-color input. */
export function ColorPicker({
  value,
  onChange,
  swatches = defaultSwatches,
}: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {swatches.map((swatch) => (
        <ColorSwatch
          key={swatch}
          color={swatch}
          selected={value === swatch}
          onSelect={() => onChange(swatch)}
        />
      ))}
      <label className="flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-xs font-semibold text-slate-600">
        Eigene Farbe
        <input
          className="h-6 w-8 border-0 bg-transparent p-0"
          type="color"
          value={colorInputValue(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}
