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
  "var(--color-ink)"
];

function ColorSwatch({ color, selected, onSelect }: { color: string; selected: boolean; onSelect: () => void }) {
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
export function ColorPicker({ value, onChange, swatches = defaultSwatches }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {swatches.map((swatch) => (
      <ColorSwatch key={swatch} color={swatch} selected={value === swatch} onSelect={() => onChange(swatch)} />
      ))}
      <label className="flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-xs font-semibold text-slate-600">
        Custom
        <input className="h-6 w-8 border-0 bg-transparent p-0" type="color" onChange={(event) => onChange(event.target.value)} />
      </label>
    </div>
  );
}
