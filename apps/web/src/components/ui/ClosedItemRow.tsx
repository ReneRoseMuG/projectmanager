import { CheckCircle2, ExternalLink } from "lucide-react";
import { ActionMenu } from "./ActionMenu";

interface ClosedItemRowProps {
  title: string;
  objectReference?: string;
  accentColor?: string;
  childCount?: number;
  onOpen?: () => void;
  onOpenInTab?: () => void;
}

/** Compact readonly card for items in the closed-status sidebar. */
export function ClosedItemRow({ title, objectReference: ref, accentColor, childCount, onOpen, onOpenInTab }: ClosedItemRowProps) {
  return (
    <article
      className={`group relative grid min-w-0 gap-1.5 rounded-lg border border-l-[3px] border-line bg-white px-2.5 py-2.5 shadow-sm transition hover:border-steel-300 hover:shadow-panel${onOpen ? " cursor-pointer" : ""}`}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
      onClick={onOpen}
    >
      <div className="flex min-w-0 items-start gap-2">
        <h3 className="line-clamp-2 min-w-0 flex-1 text-[13px] font-semibold leading-snug text-ink">{title}</h3>
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
      </div>
      {childCount !== undefined && childCount > 0 ? (
        <div className="flex items-center gap-1 text-xs text-steel-500">
          <CheckCircle2 size={12} aria-hidden="true" />
          <span>{childCount}</span>
        </div>
      ) : null}
    </article>
  );
}
