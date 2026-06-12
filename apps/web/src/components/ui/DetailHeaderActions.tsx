import { ExternalLink, Pencil, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { CopyReferenceButton } from "./CopyReferenceButton";

type DetailHeaderTone = "onSteel" | "onLight";

interface DetailHeaderActionsProps {
  /** "onSteel" for the gradient detail hero, "onLight" for light surfaces (embedded Wiki bar). */
  tone?: DetailHeaderTone;
  /** Auto-save indicator node, themed by the caller. */
  saveStatus?: ReactNode;
  /** Renders an edit toggle (read → edit). */
  onEdit?: () => void;
  editLabel?: string;
  /** Renders the stable object reference (e.g. WIKI-5) with copy-to-clipboard. */
  objectReference?: string;
  /** Renders an "open in new tab" action. */
  onOpenInTab?: () => void;
  /** Renders a delete action. */
  onDelete?: () => void;
  deleteLabel?: string;
  /** Renders a close action. */
  onClose?: () => void;
  closeLabel?: string;
  /** When true the close button also shows a "Zurück" label (full-page variant). */
  showBackLabel?: boolean;
}

const iconButtonClass: Record<DetailHeaderTone, string> = {
  onSteel:
    "flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/12 hover:text-white",
  onLight:
    "flex h-8 w-8 items-center justify-center rounded-md text-steel-600 transition hover:bg-line/50 hover:text-ink",
};

const deleteButtonClass: Record<DetailHeaderTone, string> = {
  onSteel:
    "flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-crimson/30 hover:text-white",
  onLight:
    "flex h-8 w-8 items-center justify-center rounded-md text-steel-600 transition hover:bg-crimson/10 hover:text-crimson",
};

/**
 * Shared action cluster for detail headers. Used by FormModal (all entity detail
 * pages) and WikiPageForm so every detail chrome offers the same actions in the
 * same order: save status → edit → copy reference → open in tab → delete → close.
 * The cluster renders a fragment; the parent provides the flex container.
 */
export function DetailHeaderActions({
  tone = "onSteel",
  saveStatus,
  onEdit,
  editLabel = "Bearbeiten",
  objectReference,
  onOpenInTab,
  onDelete,
  deleteLabel = "Löschen",
  onClose,
  closeLabel = "Schließen",
  showBackLabel = false,
}: DetailHeaderActionsProps) {
  const iconSize = tone === "onSteel" ? 18 : 16;

  return (
    <>
      {saveStatus ? (
        <div className="flex items-center pr-1">{saveStatus}</div>
      ) : null}

      {onEdit ? (
        tone === "onLight" ? (
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-steel-600 transition hover:bg-line/50 hover:text-ink"
            aria-label={editLabel}
            title={editLabel}
            onClick={onEdit}
          >
            <Pencil size={14} />
            {editLabel}
          </button>
        ) : (
          <button
            type="button"
            className={iconButtonClass[tone]}
            aria-label={editLabel}
            title={editLabel}
            onClick={onEdit}
          >
            <Pencil size={18} />
          </button>
        )
      ) : null}

      {objectReference ? (
        <CopyReferenceButton
          reference={objectReference}
          variant={tone === "onSteel" ? "hero" : "surface"}
        />
      ) : null}

      {onOpenInTab ? (
        <button
          type="button"
          className={iconButtonClass[tone]}
          aria-label="In neuem Tab öffnen"
          title="In neuem Tab öffnen"
          onClick={onOpenInTab}
        >
          <ExternalLink size={iconSize} />
        </button>
      ) : null}

      {onDelete ? (
        <button
          type="button"
          className={deleteButtonClass[tone]}
          aria-label={deleteLabel}
          title={deleteLabel}
          onClick={onDelete}
        >
          <Trash2 size={iconSize} />
        </button>
      ) : null}

      {onClose ? (
        <button
          type="button"
          className={
            showBackLabel
              ? "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm text-white/80 transition hover:bg-white/12 hover:text-white"
              : tone === "onSteel"
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/12 hover:text-white"
                : iconButtonClass[tone]
          }
          aria-label={closeLabel}
          title={closeLabel}
          onClick={onClose}
        >
          <X size={iconSize} />
          {showBackLabel ? <span>Zurück</span> : null}
        </button>
      ) : null}
    </>
  );
}
