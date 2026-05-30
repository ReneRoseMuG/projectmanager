import type { StatusCatalogKind } from "@taskmanager/shared-types";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogEntriesByKind, catalogFillStyle, defaultCatalogColor } from "../../utils/catalogs";

interface StatusToggleProps<TStatus extends string> {
  kind: StatusCatalogKind;
  value: TStatus;
  onChange: (value: TStatus) => void;
}

/** Shared one-row status selector backed by editable status catalogs. */
export function StatusToggle<TStatus extends string>({ kind, value, onChange }: StatusToggleProps<TStatus>) {
  const catalogs = useCatalogs();
  const entries = catalogEntriesByKind(catalogs.entries, kind);
  const options = entries.some((entry) => entry.key === value)
    ? entries
    : [{ id: 0, kind, key: value, label: value, sortOrder: -1, isClosed: false, color: defaultCatalogColor(kind, value), version: 1, createdAt: "", updatedAt: "" }, ...entries];

  return (
    <div className="flex min-h-12 gap-2 overflow-x-auto whitespace-nowrap rounded-xl border border-line bg-steel-50 p-1.5">
      {options.map((option) => (
        <button
          key={option.key}
          className="h-9 shrink-0 rounded-lg border border-transparent px-3 text-xs font-bold uppercase tracking-wide text-steel-500 transition hover:bg-white data-[active=true]:text-white"
          data-active={value === option.key}
          type="button"
          style={value === option.key ? catalogFillStyle(option.color) : undefined}
          onClick={() => onChange(option.key as TStatus)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
