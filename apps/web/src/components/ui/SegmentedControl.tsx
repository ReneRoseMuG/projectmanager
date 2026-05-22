interface SegmentOption<T extends string> {
  value: T;
  label: string;
  activeClassName?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: Array<SegmentOption<T>>;
  onChange: (value: T) => void;
}

/** Segmented option selector for compact status-like choices. */
export function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-line bg-steel-50 p-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          className={`h-9 rounded-md px-3 text-xs font-bold uppercase tracking-wide text-steel-500 transition hover:bg-white ${option.activeClassName ?? "data-[active=true]:bg-steel-700 data-[active=true]:text-white"}`}
          data-active={value === option.value}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
