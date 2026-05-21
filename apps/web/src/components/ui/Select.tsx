import type { SelectHTMLAttributes } from "react";
import { FormField } from "./FormField";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function Select({
  label,
  className = "",
  children,
  ...props
}: SelectProps) {
  return (
    <FormField label={label}>
      <select
        className={`h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10 ${className}`}
        {...props}
      >
        {children}
      </select>
    </FormField>
  );
}
