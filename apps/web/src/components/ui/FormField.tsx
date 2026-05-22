import { Children, cloneElement, isValidElement, useId } from "react";
import type { ReactElement, ReactNode } from "react";
import { FieldError, FieldHint } from "./FieldHint";
import { Label } from "./Label";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

/** Shared form field wrapper for label, control and helper text. */
export function FormField({ label, htmlFor, required = false, hint, error, children, className = "" }: FormFieldProps) {
  const generatedId = useId();
  const childArray = Children.toArray(children);
  const onlyChild =
    childArray.length === 1 && isValidElement(childArray[0])
      ? (childArray[0] as ReactElement<{ id?: string }>)
      : null;
  const childId = onlyChild?.props.id;
  const controlId = htmlFor ?? childId ?? (onlyChild ? generatedId : undefined);
  const linkedChildren =
    onlyChild && controlId && !childId
      ? cloneElement(onlyChild, { id: controlId })
      : children;

  return (
    <div className={`grid gap-1 ${className}`}>
      <Label htmlFor={controlId} required={required}>{label}</Label>
      {linkedChildren}
      {error ? <FieldError>{error}</FieldError> : hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  );
}
