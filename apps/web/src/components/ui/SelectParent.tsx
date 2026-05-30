import type { StatusCatalogKind } from "@taskmanager/shared-types";
import { ChevronDown, Flag, Folder, Puzzle, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FormField } from "./FormField";
import { ItemRow } from "./ItemRow";
import { StatusPill } from "./StatusPill";

export interface SelectParentItem {
  id: number | string;
  title: string;
  accentColor?: string;
  statusKind?: StatusCatalogKind;
  statusValue?: string;
  meta?: string;
}

export interface SelectParentProps {
  type: "project" | "milestone" | "feature";
  label: string;
  placeholder?: string;
  items: SelectParentItem[];
  value: SelectParentItem | null;
  onChange: (item: SelectParentItem | null) => void;
  disabled?: boolean;
}

const typeIcons: Record<SelectParentProps["type"], ReactNode> = {
  project: <Folder size={17} />,
  milestone: <Flag size={17} />,
  feature: <Puzzle size={17} />,
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("de-DE");
}

function itemKey(item: SelectParentItem) {
  return String(item.id);
}

/** Controlled parent selector with a searchable dropdown and selected item row. */
export function SelectParent({
  type,
  label,
  placeholder,
  items,
  value,
  onChange,
  disabled = false,
}: SelectParentProps) {
  const triggerId = useId();
  const searchId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedKey = value ? itemKey(value) : null;

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) =>
      normalize(`${item.title} ${item.meta ?? ""}`).includes(normalizedQuery),
    );
  }, [items, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open && typeof activeItemRef.current?.scrollIntoView === "function") {
      activeItemRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [open, filteredItems]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  const selectItem = (item: SelectParentItem) => {
    onChange(item);
    setOpen(false);
    setQuery("");
  };

  return (
    <FormField label={label}>
      <div ref={rootRef} id={`${triggerId}-root`} className="relative grid gap-3">
        <button
          id={triggerId}
          type="button"
          className="flex h-11 w-full items-center justify-between gap-3 rounded-md border border-line bg-white px-3 text-left text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10 disabled:cursor-not-allowed disabled:opacity-50"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-steel-500">{typeIcons[type]}</span>
            <span
              className={`truncate ${value ? "text-ink" : "text-steel-400"}`}
            >
              {value?.title ?? placeholder ?? `${label} wählen ...`}
            </span>
          </span>
          <ChevronDown
            size={17}
            className={`shrink-0 text-steel-500 transition ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {open ? (
          <div className="absolute left-0 top-11 z-50 mt-1 grid max-h-80 w-full gap-2 overflow-hidden rounded-lg border border-line bg-white p-2 shadow-panel">
            <label
              htmlFor={searchId}
              className="flex h-10 items-center gap-2 rounded-md bg-steel-100 px-3 text-sm text-steel-500"
            >
              <Search size={16} />
              <input
                id={searchId}
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-steel-400"
                placeholder={`${label} suchen`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div role="listbox" aria-labelledby={triggerId} className="max-h-60 overflow-auto">
              {items.length === 0 ? (
                <p className="px-3 py-4 text-sm font-medium text-steel-500">
                  Keine Einträge vorhanden
                </p>
              ) : filteredItems.length === 0 ? (
                <p className="px-3 py-4 text-sm font-medium text-steel-500">
                  Keine Ergebnisse für „{query}“
                </p>
              ) : (
                <div className="grid gap-1">
                  {filteredItems.map((item) => {
                    const isSelected = selectedKey === itemKey(item);
                    return (
                      <button
                        key={itemKey(item)}
                        ref={isSelected ? activeItemRef : undefined}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition hover:bg-steel-50 ${
                          isSelected ? "bg-steel-50" : ""
                        }`}
                        onClick={() => selectItem(item)}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full bg-steel-400"
                          style={
                            item.accentColor
                              ? { backgroundColor: item.accentColor }
                              : undefined
                          }
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">
                            {item.title}
                          </span>
                          {item.meta ? (
                            <span className="block truncate text-xs font-medium text-steel-500">
                              {item.meta}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {value ? (
          <ItemRow
            accentColor={value.accentColor}
            title={value.title}
            pills={
              value.statusKind && value.statusValue ? (
                <StatusPill kind={value.statusKind} value={value.statusValue} />
              ) : undefined
            }
            meta={
              value.meta ? (
                <span className="text-xs font-semibold text-steel-500">
                  {value.meta}
                </span>
              ) : undefined
            }
            actions={
              disabled ? undefined : (
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-steel-500 transition hover:bg-steel-100 hover:text-crimson focus:outline-none focus:ring-2 focus:ring-steel-700/10"
                  title={`${label} entfernen`}
                  aria-label={`${value.title} entfernen`}
                  onClick={() => onChange(null)}
                >
                  <X size={16} />
                </button>
              )
            }
          />
        ) : null}
      </div>
    </FormField>
  );
}
