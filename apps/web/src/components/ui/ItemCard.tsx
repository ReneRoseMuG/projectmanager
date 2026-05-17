import { Edit3, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

interface ItemCardProps {
  accentColor?: string;
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  header: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Shared card base for domain items in board/grid layouts. */
export function ItemCard({ accentColor, onOpen, onEdit, onDelete, header, body, footer, className = "" }: ItemCardProps) {
  return (
    <article
      className={`relative grid gap-3 overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-panel ${onOpen ? "cursor-pointer" : ""} ${className}`}
      onDoubleClick={onOpen}
    >
      {accentColor ? <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accentColor }} /> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">{header}</div>
        {onEdit || onDelete ? (
          <div className="relative z-20 flex shrink-0 gap-1">
            {onEdit ? (
              <Button
                aria-label="Bearbeiten"
                title="Bearbeiten"
                icon={<Edit3 size={16} />}
                variant="ghost"
                className="h-8 w-8"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
              />
            ) : null}
            {onDelete ? (
              <Button
                aria-label="Löschen"
                title="Löschen"
                icon={<Trash2 size={16} />}
                variant="ghost"
                className="h-8 w-8"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {body ? <div className="min-w-0">{body}</div> : null}
      {footer ? <footer className="mt-auto min-w-0">{footer}</footer> : null}
    </article>
  );
}
