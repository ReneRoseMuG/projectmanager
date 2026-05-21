import { catalogFillStyle, catalogSoftStyle } from "../../utils/catalogs";

interface FilterChipsProps<T extends string> {
  value: T | "all";
  onChange: (next: T | "all") => void;
  options: Array<{ value: T; label: string; count: number; color?: string }>;
  allLabel?: string;
  allCount: number;
}

export function FilterChips<T extends string>({ value, onChange, options, allLabel = "Alle", allCount }: FilterChipsProps<T>) {
  const chipClass = (active: boolean) =>
    `inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
      active ? "border-ink bg-steel-900 text-white" : "border-line bg-white text-slate-700 hover:border-fern hover:text-ink"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={chipClass(value === "all")} onClick={() => onChange("all")}>
        <span>{allLabel}</span>
        <span className={value === "all" ? "text-white/75" : "text-slate-500"}>{allCount}</span>
      </button>
      {options.map((option) => {
        const active = value === option.value;
        const style = option.color ? (active ? catalogFillStyle(option.color) : catalogSoftStyle(option.color)) : undefined;
        return (
          <button key={option.value} type="button" className={chipClass(active)} style={style} onClick={() => onChange(option.value)}>
            <span>{option.label}</span>
            <span className={active ? "opacity-75" : "text-slate-500"}>{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}
