import type { ReactNode } from "react";
import { FieldError, FieldHint } from "./FieldHint";
import { Label } from "./Label";

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

/** Shared form field wrapper for label, control and helper text. */
export function FormField({ label, required = false, hint, error, children, className = "" }: FormFieldProps) {
  return (
    <div className={`grid gap-1 ${className}`}>
      <Label required={required}>{label}</Label>
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  );
}
