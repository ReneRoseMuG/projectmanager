import type { ReactNode } from "react";

export type PillTone = "fern" | "tangerine" | "violet" | "crimson" | "steel" | "mustard";

/** High-emphasis status pill for compact domain labels. */
export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  const map: Record<PillTone, string> = {
    fern: "bg-fern",
    tangerine: "bg-tangerine",
    violet: "bg-violet",
    crimson: "bg-crimson",
    steel: "bg-steel-500",
    mustard: "bg-mustard"
  };

  return <span className={`${map[tone]} inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white`}>{children}</span>;
}
