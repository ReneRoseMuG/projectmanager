import type { ReactNode } from "react";
import type { CatalogKind } from "@taskmanager/shared-types";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogEntriesByKind, defaultCatalogColor } from "../../utils/catalogs";
import { FormField } from "./FormField";

interface CatalogSelectProps<T extends string> {
  label: string;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "panel";
  kind: CatalogKind;
  value: T;
  onChange: (value: T) => void;
}

export function CatalogSelect<T extends string>({ label, icon, action, variant, kind, value, onChange }: CatalogSelectProps<T>) {
  const catalogs = useCatalogs();
  const entries = catalogEntriesByKind(catalogs.entries, kind);
  const options = entries.some((entry) => entry.key === value)
    ? entries
    : [
        {
          id: 0,
          kind,
          key: value,
          label: value,
          sortOrder: -1,
          isClosed: false,
          color: defaultCatalogColor(kind, value),
          version: 1,
          createdAt: "",
          updatedAt: "",
        },
        ...entries,
      ];
  const selectedEntry = options.find((o) => o.key === value);

  return (
    <FormField label={label} icon={icon} action={action} variant={variant}>
      <div className="relative flex items-center">
        {selectedEntry ? (
          <span
            className="pointer-events-none absolute left-3 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: selectedEntry.color }}
          />
        ) : null}
        <select
          className="h-10 w-full rounded-md border border-line bg-white py-0 pl-8 pr-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
        >
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </FormField>
  );
}
