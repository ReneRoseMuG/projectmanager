import type { InputHTMLAttributes } from "react";

interface DatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  mode?: "date" | "datetime-local";
}

export function DatePicker({ label, mode = "date", className = "", ...props }: DatePickerProps) {
  return (
    <label className="grid gap-1 text-sm font-medium text-ink">
      {label}
      <input
        type={mode}
        className={`h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-fern ${className}`}
        {...props}
      />
    </label>
  );
}
