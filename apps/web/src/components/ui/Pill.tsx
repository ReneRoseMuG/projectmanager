import type { ReactNode } from "react";
import { catalogFillStyle } from "../../utils/catalogs";

export type PillTone = "fern" | "tangerine" | "violet" | "crimson" | "steel" | "mustard";

/** High-emphasis status pill for compact domain labels. */
export function Pill({ tone = "steel", color, children }: { tone?: PillTone; color?: string | null; children: ReactNode }) {
  const map: Record<PillTone, string> = {
    fern: "bg-fern",
    tangerine: "bg-tangerine",
    violet: "bg-violet",
    crimson: "bg-crimson",
    steel: "bg-steel-500",
    mustard: "bg-mustard"
  };
  const style = color ? catalogFillStyle(color) : undefined;
  const toneClass = color ? "" : map[tone];

  return <span className={`${toneClass} inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white`} style={style}>{children}</span>;
}
