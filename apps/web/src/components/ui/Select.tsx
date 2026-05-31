import type { ReactNode, SelectHTMLAttributes } from "react";
import { FormField } from "./FormField";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "panel";
}

export function Select({
  label,
  icon,
  action,
  variant,
  className = "",
  children,
  ...props
}: SelectProps) {
  return (
    <FormField label={label} icon={icon} action={action} variant={variant}>
      <select
        className={`h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10 ${className}`}
        {...props}
      >
        {children}
      </select>
    </FormField>
  );
}
