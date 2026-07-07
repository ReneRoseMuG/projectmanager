import type { Attachment } from "@taskmanager/shared-types";
import { Download, FolderArchive, Trash2 } from "lucide-react";
import { describeAttachmentType } from "./attachmentTypes";

// Dokument-Karte der Bibliotheks-Liste (MS-75). Zwei Spalten: links breit mit zwei Zeilen
// (oben Dateiname, darunter die zugewiesenen Sammlungen und Kategorien, im Extremfall
// abgeschnitten), rechts schmal mit Typ-Badge, Größe und den Aktions-Icons. Die Karte selbst
// öffnet die Detail-/Vorschau-Ansicht; die Aktions-Icons lösen das nicht aus (stopPropagation).

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

// Verständliche Typ-Darstellung: Kürzel-Badge und Größe statt rohem MIME-Type.
// Der technische MIME-Type bleibt als Tooltip (title) erreichbar.
function DocumentMeta({ document }: { document: Attachment }) {
  const typeMeta = describeAttachmentType(document);
  const size = formatBytes(document.size);
  return (
    <span
      className="flex w-32 items-center justify-end gap-2 text-xs text-steel-500"
      title={document.mimetype}
      aria-label={`${typeMeta.label}, ${size}`}
    >
      <span className="flex w-10 justify-end">
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${typeMeta.toneClassName}`}
        >
          {typeMeta.badge}
        </span>
      </span>
      <span className="w-20 whitespace-nowrap text-right tabular-nums">
        {size}
      </span>
    </span>
  );
}

// Zweite Zeile: alle zugewiesenen Sammlungen (Ordner-Icon) und Kategorien (Katalogfarbe).
// Einzeilig mit overflow-hidden — passt nicht alles, wird rechts abgeschnitten; die volle
// Liste bleibt per title-Tooltip erreichbar.
function AssignmentLine({ document }: { document: Attachment }) {
  const folders = document.folders ?? [];
  const categories = document.categories ?? [];

  if (folders.length === 0 && categories.length === 0) {
    return <span className="text-xs text-steel-400">Keine Sammlung oder Kategorie</span>;
  }

  const titleText = [
    ...folders.map((folder) => folder.name),
    ...categories.map((category) => category.name),
  ].join(" · ");

  return (
    <div
      className="flex items-center gap-1 overflow-hidden"
      title={titleText}
    >
      {folders.map((folder) => (
        <span
          key={`f${folder.id}`}
          className="flex shrink-0 items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-xs text-steel-600"
        >
          <FolderArchive size={11} className="shrink-0" />
          <span className="max-w-[9rem] truncate">{folder.name}</span>
        </span>
      ))}
      {categories.map((category) => (
        <span
          key={`c${category.id}`}
          className="max-w-[9rem] shrink-0 truncate rounded-md px-2 py-0.5 text-xs text-white"
          style={{ backgroundColor: category.color }}
        >
          {category.name}
        </span>
      ))}
    </div>
  );
}

interface DocumentCardProps {
  document: Attachment;
  selected: boolean;
  isSelected: boolean;
  selectionActive: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  canDelete: boolean;
  onDelete: () => void;
}

export function DocumentCard({
  document,
  selected,
  isSelected,
  selectionActive,
  onToggleSelect,
  onOpen,
  canDelete,
  onDelete,
}: DocumentCardProps) {
  // Bei aktiver Mehrfachauswahl (mind. ein Dokument markiert) togglet ein Klick auf die Karte
  // die Auswahl, statt die Vorschau zu öffnen — sonst öffnet er wie gewohnt die Detailansicht.
  const highlighted = selected || isSelected;
  return (
    <article
      onClick={selectionActive ? onToggleSelect : onOpen}
      className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-4 py-3 transition ${
        highlighted
          ? "border-steel-400 bg-steel-100 shadow-panel"
          : "border-line bg-white shadow-sm hover:border-steel-300 hover:shadow-panel"
      }`}
    >
      {/* Auswahl-Checkbox (Mehrfachauswahl) */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        onClick={(event) => event.stopPropagation()}
        aria-label={`„${documentTitle(document)}" auswählen`}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-line text-steel-600 focus:ring-steel-400"
      />

      {/* Linke Spalte: Dateiname über Sammlungen/Kategorien */}
      <div className="flex min-w-0 flex-col gap-1 text-left">
        <h3 className="truncate text-[14px] font-semibold text-ink">
          {documentTitle(document)}
        </h3>
        <AssignmentLine document={document} />
      </div>

      {/* Rechte Spalte: Typ, Größe, Aktionen */}
      <div className="flex shrink-0 items-center gap-2">
        <DocumentMeta document={document} />
        <div
          className="flex items-center gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          <a
            href={document.url}
            download
            className="rounded-md p-1.5 text-steel-500 hover:bg-steel-50"
            title="Herunterladen"
          >
            <Download size={16} />
          </a>
          {canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md p-1.5 text-steel-500 hover:bg-rose-50 hover:text-rose-600"
              title="Endgültig löschen"
            >
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
