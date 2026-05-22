import type { LabelHTMLAttributes } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

/** Shared form label atom with optional required marker. */
export function Label({ required = false, children, className = "", ...props }: LabelProps) {
  return (
    <label className={`text-xs font-bold uppercase tracking-wide text-steel-700 ${className}`} {...props}>
      {children}
      {required ? <span className="ml-0.5 text-crimson">*</span> : null}
    </label>
  );
}
