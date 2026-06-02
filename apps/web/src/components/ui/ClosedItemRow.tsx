import { ExternalLink } from "lucide-react";
import { ActionMenu } from "./ActionMenu";

interface ClosedItemRowProps {
  title: string;
  objectReference?: string;
  accentColor?: string;
  onOpenInTab?: () => void;
}

/** Compact readonly row for items in the closed-status sidebar. */
export function ClosedItemRow({ title, objectReference: ref, accentColor, onOpenInTab }: ClosedItemRowProps) {
  return (
    <article
      className="group relative flex min-w-0 items-center gap-2 rounded-lg border border-l-[3px] border-line bg-white px-2.5 py-2 shadow-sm transition hover:border-steel-300 hover:shadow-panel"
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{title}</h3>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <ActionMenu
          objectReference={ref}
          items={
            onOpenInTab
              ? [{ label: "In Tab öffnen", icon: <ExternalLink size={16} />, onClick: onOpenInTab }]
              : []
          }
        />
      </div>
    </article>
  );
}
