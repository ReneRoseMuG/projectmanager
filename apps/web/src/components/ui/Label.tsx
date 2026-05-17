import type { LabelHTMLAttributes } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

/** Shared form label atom with optional required marker. */
export function Label({ required = false, children, className = "", ...props }: LabelProps) {
  return (
    <label className={`text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700 ${className}`} {...props}>
      {children}
      {required ? <span className="ml-0.5 text-crimson">*</span> : null}
    </label>
  );
}
