import { Check } from "lucide-react";
import { catalogFillStyle } from "../../utils/catalogs";

type RadioColor = "fern" | "tangerine" | "crimson" | "violet";

interface RadioOption<T extends string> {
  value: T;
  label: string;
  activeColor?: RadioColor;
  color?: string;
}

interface RadioListProps<T extends string> {
  value: T;
  options: Array<RadioOption<T>>;
  onChange: (value: T) => void;
}

const activeClasses: Record<RadioColor, string> = {
  fern: "border-fern bg-fern/10 text-ink",
  tangerine: "border-tangerine bg-tangerine/10 text-ink",
  crimson: "border-crimson bg-crimson/10 text-ink",
  violet: "border-violet bg-violet/10 text-ink"
};

const inactiveClasses: Record<RadioColor, string> = {
  fern: "border-line bg-shell/50 text-slate-600 hover:border-fern",
  tangerine: "border-line bg-shell/50 text-slate-600 hover:border-tangerine",
  crimson: "border-line bg-shell/50 text-slate-600 hover:border-crimson",
  violet: "border-line bg-shell/50 text-slate-600 hover:border-violet"
};

const checkClasses: Record<RadioColor, string> = {
  fern: "text-fern",
  tangerine: "text-tangerine",
  crimson: "text-crimson",
  violet: "text-violet"
};

/** Vertical radio-like selector for status and priority choices. */
export function RadioList<T extends string>({ value, options, onChange }: RadioListProps<T>) {
  return (
    <div className="grid gap-2">
      {options.map((option) => {
        const color = option.activeColor ?? "fern";
        const selected = value === option.value;
        const customStyle = selected && option.color ? catalogFillStyle(option.color) : undefined;

        return (
          <button
            key={option.value}
            type="button"
            className={`flex h-10 items-center justify-between rounded-md border px-3 text-sm font-semibold transition ${selected && option.color ? "" : selected ? activeClasses[color] : inactiveClasses[color]}`}
            style={customStyle}
            onClick={() => onChange(option.value)}
          >
            <span>{option.label}</span>
            {selected ? <Check size={16} className={option.color ? undefined : checkClasses[color]} /> : null}
          </button>
        );
      })}
    </div>
  );
}
