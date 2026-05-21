import type { Priority } from "@taskmanager/shared-types";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogEntriesByKind, defaultCatalogColor } from "../../utils/catalogs";

interface PrioritySelectProps {
  value: Priority;
  onChange: (value: Priority) => void;
}

/** Shared priority dropdown backed by editable priority catalog entries. */
export function PrioritySelect({ value, onChange }: PrioritySelectProps) {
  const catalogs = useCatalogs();
  const entries = catalogEntriesByKind(catalogs.entries, "priority");
  const options = entries.some((entry) => entry.key === value) ? entries : [{ id: 0, kind: "priority" as const, key: value, label: value, sortOrder: -1, isClosed: false, color: defaultCatalogColor("priority", value), version: 1, createdAt: "", updatedAt: "" }, ...entries];

  return (
    <select className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
