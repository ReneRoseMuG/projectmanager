import type { InputHTMLAttributes } from "react";
import { FormField } from "./FormField";

interface DatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  mode?: "date" | "datetime-local";
}

export function DatePicker({
  label,
  mode = "date",
  className = "",
  ...props
}: DatePickerProps) {
  return (
    <FormField label={label}>
      <input
        type={mode}
        className={`h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10 ${className}`}
        {...props}
      />
    </FormField>
  );
}
