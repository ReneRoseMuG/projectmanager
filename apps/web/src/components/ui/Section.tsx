import type { ReactNode } from "react";
import { Divider } from "./Divider";
import { SectionHeader } from "./SectionHeader";

interface SectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  fill?: boolean;
}

/** Shared panel section for form and detail content. */
export function Section({ title, description, actions, children, className = "", fill = false }: SectionProps) {
  return (
    <section className={`rounded-xl border border-line bg-white p-4 shadow-panel ${fill ? "flex min-h-0 flex-1 flex-col" : ""} ${className}`}>
      {title ? (
        <div className={fill ? "flex min-h-0 flex-1 flex-col gap-4" : "grid gap-4"}>
          <SectionHeader title={title} description={description} actions={actions} />
          <Divider />
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
