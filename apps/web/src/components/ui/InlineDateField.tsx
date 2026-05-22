import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { formatHumanDate } from "../../utils/date";

interface InlineDateFieldProps {
  value: string | null;
  emptyLabel?: string;
  className?: string;
  onChange?: (value: string | null) => void | Promise<unknown>;
}

export function InlineDateField({ value, emptyLabel = "Ohne Datum", className = "", onChange }: InlineDateFieldProps) {
  const [editing, setEditing] = useState(false);
  const label = value ? formatHumanDate(value) : emptyLabel;

  if (!onChange) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <CalendarClock size={14} />
        {label}
      </span>
    );
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
        <CalendarClock size={14} />
        <input
          autoFocus
          aria-label="Datum ändern"
          className="h-7 rounded border border-line bg-white px-2 text-xs font-semibold text-ink outline-none focus:border-steel-500"
          type="date"
          value={value ?? ""}
          onBlur={() => setEditing(false)}
          onChange={(event) => {
            const nextValue = event.target.value || null;
            setEditing(false);
            void Promise.resolve(onChange(nextValue)).catch(() => undefined);
          }}
        />
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 rounded text-left transition hover:text-ink focus:outline-none focus:ring-2 focus:ring-steel-300 ${className}`}
      onClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
    >
      <CalendarClock size={14} />
      {label}
    </button>
  );
}
