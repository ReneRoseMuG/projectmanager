import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function Select({ label, className = "", children, ...props }: SelectProps) {
  return (
    <label className="grid gap-1 text-sm font-medium text-ink">
      {label}
      <select className={`h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-teal ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}
