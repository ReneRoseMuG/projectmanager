import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  variant?: "default" | "label";
  actions?: ReactNode;
}

/** Shared section heading with optional description and action slot. */
export function SectionHeader({ title, description, variant = "default", actions }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className={variant === "label" ? "text-sm font-bold uppercase tracking-wide text-slate-500" : "text-sm font-semibold text-ink"}>{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
