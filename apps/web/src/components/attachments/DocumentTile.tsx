import type { Attachment } from "@taskmanager/shared-types";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { assetUrl } from "../../api/client";
import { documentThumbnailUrl } from "../../api/documents";
import { describeAttachmentType, type AttachmentFamily } from "./attachmentTypes";

// Kachel der Dokumente-Grid-Ansicht (MS-75). Quadratischer Thumbnail-Bereich (bei Bildern das
// skalierte Bild, sonst ein großes Typ-Icon + Badge) mit Dateinamen darunter. Einfachklick
// togglet die Auswahl, Doppelklick öffnet die Datei groß (Lightbox). Die volle Detail- und
// Metadatenpflege liegt in der Großansicht; hier bleibt nur ein schneller Löschen-Zugriff.

// Dokumente, aus denen der Server die erste Seite als Vorschaubild rendern kann (PDF direkt,
// Office/ODF über die PDF-Fassung). Das Typ-Icon bleibt darunter liegen: Es ist der Platzhalter,
// solange das Bild lädt, und der Rückfall, wenn es keins gibt (404) oder die Erzeugung scheitert.
const THUMBNAIL_FAMILIES: ReadonlySet<AttachmentFamily> = new Set([
  "pdf",
  "word",
  "spreadsheet",
  "presentation",
  "opendocument",
]);

function stripFileExtension(name: string): string {
  const extensionIndex = name.lastIndexOf(".");
  if (extensionIndex <= 0) {
    return name;
  }
  return name.slice(0, extensionIndex).trimEnd();
}

export function documentTitle(document: Attachment): string {
  return stripFileExtension(document.displayName ?? document.originalName);
}

// Kleingeschriebene Dateiendung ohne Punkt (leer bei fehlender Endung oder Dotfiles wie
// ".gitignore"). Basis für den Endungsfilter der Grid-Ansicht.
export function fileExtension(name: string): string {
  const index = name.lastIndexOf(".");
  if (index <= 0) {
    return "";
  }
  return name.slice(index + 1).toLowerCase();
}

interface DocumentTileProps {
  document: Attachment;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  canDelete: boolean;
  onDelete: () => void;
}

export function DocumentTile({
  document,
  isSelected,
  onToggleSelect,
  onOpen,
  canDelete,
  onDelete,
}: DocumentTileProps) {
  const meta = describeAttachmentType(document);
  const Icon = meta.Icon;
  const title = documentTitle(document);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const showThumbnail = THUMBNAIL_FAMILIES.has(meta.family) && !thumbnailFailed;

  return (
    <article
      onClick={onToggleSelect}
      onDoubleClick={onOpen}
      title={document.displayName ?? document.originalName}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-white transition ${
        isSelected
          ? "border-steel-400 shadow-panel ring-2 ring-steel-300"
          : "border-line shadow-sm hover:border-steel-300 hover:shadow-panel"
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-shell">
        {meta.family === "image" ? (
          <img
            src={assetUrl(document.url)}
            alt={document.originalName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-steel-400">
              <Icon size={40} strokeWidth={1.5} />
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.toneClassName}`}
              >
                {meta.badge}
              </span>
            </div>
            {showThumbnail ? (
              <img
                src={documentThumbnailUrl(document.id)}
                alt={`Vorschau von ${title}`}
                loading="lazy"
                onError={() => setThumbnailFailed(true)}
                className="absolute inset-0 h-full w-full bg-white object-contain"
              />
            ) : null}
          </>
        )}

        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(event) => event.stopPropagation()}
          aria-label={`„${title}" auswählen`}
          className={`absolute left-2 top-2 h-4 w-4 cursor-pointer rounded border-line text-steel-600 shadow-sm focus:ring-steel-400 ${
            isSelected ? "" : "opacity-0 transition-opacity group-hover:opacity-100"
          }`}
        />

        {canDelete ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="absolute right-2 top-2 rounded-md bg-white/90 p-1 text-steel-500 opacity-0 shadow-sm transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
            title="Endgültig löschen"
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>

      <div className="min-w-0 px-2 py-1.5">
        <p className="truncate text-center text-xs font-medium text-ink">{title}</p>
      </div>
    </article>
  );
}
