import { Children, cloneElement, isValidElement, useId } from "react";
import type { ReactElement, ReactNode } from "react";
import { FieldError, FieldHint } from "./FieldHint";
import { Label } from "./Label";

interface FormFieldProps {
  label: string;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "panel";
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

/** Shared form field wrapper for label, control and helper text. */
export function FormField({ label, icon, action, variant = "default", htmlFor, required = false, hint, error, children, className = "" }: FormFieldProps) {
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

  if (variant === "panel") {
    return (
      <div className={`rounded-lg border border-line bg-white shadow-sm ${className}`}>
        <div className="flex h-9 items-center gap-2 border-b border-line px-2.5">
          {icon ? <span className="shrink-0 text-steel-500">{icon}</span> : null}
          <label
            htmlFor={controlId}
            className="flex-1 text-xs font-bold uppercase tracking-wide text-steel-700"
          >
            {label}
            {required ? <span className="ml-0.5 text-crimson">*</span> : null}
          </label>
          {action ? <span className="shrink-0">{action}</span> : null}
        </div>
        <div className="p-2.5">{linkedChildren}</div>
        {error ? (
          <div className="px-2.5 pb-2.5"><FieldError>{error}</FieldError></div>
        ) : hint ? (
          <div className="px-2.5 pb-2.5"><FieldHint>{hint}</FieldHint></div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`grid gap-1 ${className}`}>
      {icon ? (
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-steel-400">{icon}</span>
          <Label htmlFor={controlId} required={required}>{label}</Label>
        </div>
      ) : (
        <Label htmlFor={controlId} required={required}>{label}</Label>
      )}
      {linkedChildren}
      {error ? <FieldError>{error}</FieldError> : hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  );
}
