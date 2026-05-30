import type { ReactNode } from "react";
import { catalogFillStyle } from "../../utils/catalogs";

export type PillTone = "fern" | "tangerine" | "violet" | "crimson" | "steel" | "mustard";

/** Compatibility label using the shared badge geometry. */
export function Pill({ tone = "steel", color, children }: { tone?: PillTone; color?: string | null; children: ReactNode }) {
  const map: Record<PillTone, string> = {
    fern: "border-fern bg-fern",
    tangerine: "border-tangerine bg-tangerine",
    violet: "border-violet bg-violet",
    crimson: "border-crimson bg-crimson",
    steel: "border-steel-500 bg-steel-500",
    mustard: "border-mustard bg-mustard"
  };
  const style = color ? catalogFillStyle(color) : undefined;
  const toneClass = color ? "" : map[tone];

  return <span className={`${toneClass} inline-flex min-h-6 items-center gap-1 rounded-md border px-2 text-xs font-semibold text-white`} style={style}>{children}</span>;
}
