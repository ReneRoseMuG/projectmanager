import type { StatusCatalogKind } from "@taskmanager/shared-types";
import { useEffect, useRef, useState } from "react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogEntriesByKind } from "../../utils/catalogs";
import { Pill } from "./Pill";

interface StatusPillProps {
  kind: StatusCatalogKind;
  value: string;
  onChange?: (value: string) => void | Promise<unknown>;
  disabled?: boolean;
}

/** Compact status display backed by editable status catalogs. */
export function StatusPill({ kind, value, onChange, disabled = false }: StatusPillProps) {
  const catalogs = useCatalogs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const entries = catalogEntriesByKind(catalogs.entries, kind);
  const entry = entries.find((item) => item.key === value);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
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

  if (!onChange) {
    return (
      <Pill color={entry?.color}>
        {entry?.label ?? value}
      </Pill>
    );
  }

  return (
    <span ref={ref} className="relative inline-flex" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="rounded-md text-left transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-steel-300"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <Pill color={entry?.color}>
          {entry?.label ?? value}
        </Pill>
      </button>
      {open ? (
        <span role="menu" className="absolute left-0 top-full z-50 mt-1 grid min-w-40 gap-1 rounded-lg border border-line bg-white p-1 shadow-panel">
          {entries.map((option) => (
            <button
              key={option.key}
              type="button"
              role="menuitem"
              className="rounded-md px-2 py-1.5 text-left text-xs font-semibold text-ink transition hover:bg-steel-50"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                void Promise.resolve(onChange(option.key)).catch(() => undefined);
              }}
            >
              {option.label}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}
