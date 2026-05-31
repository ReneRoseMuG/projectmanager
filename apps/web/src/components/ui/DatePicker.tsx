import type { InputHTMLAttributes } from "react";
import { useRef } from "react";
import { CalendarClock } from "lucide-react";
import { FormField } from "./FormField";

interface DatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  mode?: "date" | "datetime-local";
  variant?: "default" | "panel";
}

export function DatePicker({
  label,
  mode = "date",
  variant,
  className = "",
  onClick,
  ...props
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openNativePicker = () => {
    const input = inputRef.current;
    if (!input || input.disabled || input.readOnly) {
      return;
    }
    input.focus();
    try {
      input.showPicker?.();
    } catch {
      // Some browsers only allow showPicker during trusted pointer events.
    }
  };

  if (variant === "panel") {
    return (
      <FormField
        label={label}
        icon={<CalendarClock size={14} />}
        variant="panel"
      >
        <input
          ref={inputRef}
          type={mode}
          className={`h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10 ${className}`}
          onClick={(event) => {
            onClick?.(event);
            openNativePicker();
          }}
          {...props}
        />
      </FormField>
    );
  }

  return (
    <FormField label={label}>
      <div className="relative">
        <input
          ref={inputRef}
          type={mode}
          className={`h-11 w-full rounded-md border border-line bg-white px-3 pr-10 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10 ${className}`}
          onClick={(event) => {
            onClick?.(event);
            openNativePicker();
          }}
          {...props}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-steel-500 transition hover:bg-shell hover:text-ink focus:outline-none focus:ring-2 focus:ring-steel-300 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`${label} öffnen`}
          disabled={props.disabled}
          onClick={openNativePicker}
        >
          <CalendarClock size={16} />
        </button>
      </div>
    </FormField>
  );
}
