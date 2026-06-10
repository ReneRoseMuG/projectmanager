import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "mono";
  iconLeft?: ReactNode;
}

const baseClassName = "h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10";

/**
 * Shared text input atom with optional monospace mode and leading icon.
 *
 * Gewöhnliche App-Felder unterdrücken standardmäßig Passwortmanager-Overlays
 * (1Password/LastPass) und Browser-Autofill via `autoComplete="off"`. Semantische
 * Felder (Login, Passwort, E-Mail, Adresse, Einmalcode) setzen `autoComplete`
 * explizit und bleiben dann voll mit Passwortmanagern und Autofill nutzbar (TASK-324).
 */
export function Input({ variant = "default", iconLeft, className = "", autoComplete = "off", ...props }: InputProps) {
  const inputClassName = `${baseClassName} ${variant === "mono" ? "font-mono" : ""} ${iconLeft ? "pl-9" : ""} ${className}`;
  const suppressManagers = autoComplete === "off";

  if (!iconLeft) {
    return (
      <input
        className={inputClassName}
        autoComplete={autoComplete}
        data-1p-ignore={suppressManagers || undefined}
        data-lpignore={suppressManagers ? "true" : undefined}
        {...props}
      />
    );
  }

  return (
    <span className="relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-steel-400">{iconLeft}</span>
      <input
        className={inputClassName}
        autoComplete={autoComplete}
        data-1p-ignore={suppressManagers || undefined}
        data-lpignore={suppressManagers ? "true" : undefined}
        {...props}
      />
    </span>
  );
}
