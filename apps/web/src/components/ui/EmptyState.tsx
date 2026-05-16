import type { ReactNode } from "react";
import { Button } from "./Button";

type EmptyTone = "neutral" | "violet" | "fern" | "teal" | "tangerine";
type EmptyVariant = "default" | "tinted" | "first-run";

interface EmptyAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
  icon?: ReactNode;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  body?: ReactNode;
  tone?: EmptyTone;
  variant?: EmptyVariant;
  actions?: EmptyAction[];
  className?: string;
}

const toneClass: Record<EmptyTone, string> = {
  neutral: "bg-steel-100 text-steel-700",
  violet: "bg-violet/10 text-violet",
  fern: "bg-fern/10 text-fern",
  teal: "bg-teal/10 text-teal",
  tangerine: "bg-tangerine/10 text-tangerine"
};

export function EmptyState({ icon, title, body, tone = "neutral", variant = "default", actions, className = "" }: EmptyStateProps) {
  if (variant === "first-run") {
    return (
      <section className={`rounded-lg bg-gradient-to-br from-steel-700 to-steel-900 p-8 text-center text-white shadow-steel ${className}`}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-steel-700">{icon}</span>
        <h3 className="mt-4 text-lg font-bold tracking-normal">{title}</h3>
        {body ? <div className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/75">{body}</div> : null}
        {actions?.length ? (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {actions.map((action) => (
              <Button key={action.label} className={action.primary ? "bg-white text-steel-700 hover:bg-steel-50" : "border-white/20 bg-white/10 text-white hover:bg-white/20"} variant="ghost" icon={action.icon} onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  const shell = variant === "tinted" ? "border-line bg-gradient-to-br from-steel-50 to-white" : "border-dashed border-line bg-white";

  return (
    <section className={`rounded-lg border p-8 text-center ${shell} ${className}`}>
      <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass[tone]}`}>{icon}</span>
      <h3 className="mt-3 text-base font-bold text-ink">{title}</h3>
      {body ? <div className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-600">{body}</div> : null}
      {actions?.length ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {actions.map((action) => (
            <Button key={action.label} variant={action.primary ? "primary" : "secondary"} icon={action.icon} onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
