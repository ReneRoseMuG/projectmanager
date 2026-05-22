import type { ReactNode } from "react";

/** Helper text shown below a form control. */
export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-xs text-steel-500">{children}</p>;
}

/** Validation text shown below a form control. */
export function FieldError({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-xs text-crimson">{children}</p>;
}
