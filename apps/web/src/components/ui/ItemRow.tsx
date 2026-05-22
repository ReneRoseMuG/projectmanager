import type { ReactNode } from "react";

interface ItemRowProps {
  accentColor?: string;
  statusIndicator?: ReactNode;
  title: string;
  description?: string;
  pills?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  onOpen?: () => void;
  className?: string;
  pillsClassName?: string;
  metaClassName?: string;
  actionsClassName?: string;
}

/** Shared row base for domain items in list layouts. */
export function ItemRow({
  accentColor,
  statusIndicator,
  title,
  description,
  pills,
  meta,
  actions,
  footer,
  onOpen,
  className = "",
  pillsClassName = "",
  metaClassName = "",
  actionsClassName = "",
}: ItemRowProps) {
  const columns = statusIndicator
    ? "grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]"
    : "grid-cols-[minmax(0,1fr)_auto_auto_auto]";

  return (
    <article
      className={`grid h-full ${columns} items-center gap-4 rounded-xl border border-l-[4px] border-line bg-white px-4 py-3.5 shadow-sm transition hover:border-steel-300 hover:shadow-md ${onOpen ? "cursor-pointer" : ""} ${className}`}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
      onDoubleClick={onOpen}
    >
      {statusIndicator ? (
        <span onClick={(event) => event.stopPropagation()}>
          {statusIndicator}
        </span>
      ) : null}
      <div className="min-w-0 text-left">
        <h3 className="truncate text-[14px] font-semibold text-ink">{title}</h3>
        {description ? (
          <p className="truncate text-[12px] text-slate-500">{description}</p>
        ) : null}
      </div>
      {pills ? (
        <div
          className={`flex shrink-0 items-center gap-2 ${pillsClassName}`}
          onClick={(event) => event.stopPropagation()}
        >
          {pills}
        </div>
      ) : null}
      {meta ? (
        <div
          className={`min-w-0 shrink-0 ${metaClassName}`}
          onClick={(event) => event.stopPropagation()}
        >
          {meta}
        </div>
      ) : null}
      {actions ? (
        <div
          className={`relative z-20 flex shrink-0 justify-end gap-1 ${actionsClassName}`}
          onClick={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
      {footer ? (
        <footer className="col-span-full flex min-w-0 flex-wrap gap-2 border-t border-line pt-2" onClick={(event) => event.stopPropagation()}>
          {footer}
        </footer>
      ) : null}
    </article>
  );
}
