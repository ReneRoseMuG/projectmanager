import { Edit3, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { ActionMenu, type ActionMenuItem } from "./ActionMenu";

interface ItemCardProps {
  accentColor?: string;
  objectReference?: string;
  onOpen?: () => void;
  onEdit?: () => void;
  extraMenuItems?: ActionMenuItem[];
  onDelete?: () => void;
  deleteDisabled?: boolean;
  header: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Shared card base for domain items in board/grid layouts. */
export function ItemCard({
  accentColor,
  objectReference,
  onOpen,
  onEdit,
  extraMenuItems = [],
  onDelete,
  deleteDisabled = false,
  header,
  body,
  footer,
  className = "",
}: ItemCardProps) {
  return (
    <article
      className={`group/reference-card relative flex h-full min-w-0 max-w-full flex-col gap-3 overflow-visible rounded-lg border border-line bg-white p-5 shadow-sm transition duration-200 hover:z-30 hover:-translate-y-0.5 hover:shadow-panel focus-within:z-30 ${onOpen ? "cursor-pointer" : ""} ${className}`}
      onDoubleClick={onOpen}
    >
      {accentColor ? (
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-lg"
          style={{ backgroundColor: accentColor }}
        />
      ) : null}
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">{header}</div>
        {objectReference || onEdit || extraMenuItems.length > 0 || onDelete ? (
          <div
            className="relative z-20 flex shrink-0 items-center gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            <ActionMenu
              objectReference={objectReference}
              items={[
                ...(onEdit
                  ? [
                      {
                        label: "Bearbeiten",
                        icon: <Edit3 size={16} />,
                        onClick: onEdit,
                      },
                    ]
                  : []),
                ...extraMenuItems,
                ...(onDelete
                  ? [
                      {
                        label: "Löschen",
                        icon: <Trash2 size={16} />,
                        onClick: onDelete,
                        danger: true,
                        disabled: deleteDisabled,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        ) : null}
      </div>
      {body ? <div className="min-h-0 min-w-0 flex-1">{body}</div> : null}
      {footer ? <footer className="mt-auto min-w-0">{footer}</footer> : null}
    </article>
  );
}
