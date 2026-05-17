import type { ReactNode } from "react";

export type BadgeTone = "crimson" | "tangerine" | "mustard" | "fern" | "teal" | "violet" | "magenta" | "steel" | "mute";

interface BadgeProps {
  children: ReactNode;
  color?: string | null;
  muted?: boolean;
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  crimson: "border-crimson/20 bg-crimson/10 text-crimson",
  tangerine: "border-tangerine/20 bg-tangerine/10 text-tangerine",
  mustard: "border-mustard/25 bg-mustard/15 text-mustard-dark",
  fern: "border-fern/20 bg-fern/10 text-fern",
  teal: "border-teal/20 bg-teal/10 text-teal",
  violet: "border-violet/20 bg-violet/10 text-violet",
  magenta: "border-magenta/20 bg-magenta/10 text-magenta",
  steel: "border-steel-200 bg-steel-100 text-steel-700",
  mute: "border-line bg-shell text-slate-600"
};

/** Compact label for metadata, statuses and custom color tags. */
export function Badge({ children, color, muted = false, tone }: BadgeProps) {
  const style = color
    ? {
        borderColor: color,
        color,
        backgroundColor: `${color}14`
      }
    : undefined;
  const toneClass = tone ? toneClasses[tone] : muted ? toneClasses.mute : "border";

  return (
    <span className={`inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-semibold ${toneClass}`} style={style}>
      {children}
    </span>
  );
}
