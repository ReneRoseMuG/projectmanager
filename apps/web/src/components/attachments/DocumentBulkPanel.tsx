import type { AttachmentCategory, AttachmentFolder } from "@taskmanager/shared-types";
import { CheckSquare, Download } from "lucide-react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { DocumentSidePanel } from "./DocumentSidePanel";

// Mehrfachauswahl-Leiste (MS-75): ersetzt im rechten Panel die Einzel-Vorschau, sobald
// mehrere Dokumente markiert sind. Vorschau ist dann nicht möglich; stattdessen lassen sich
// alle markierten Dokumente einer Sammlung oder Kategorie zuweisen oder als Zip herunterladen.

interface DocumentBulkPanelProps {
  count: number;
  categories: AttachmentCategory[];
  folders: AttachmentFolder[];
  canWrite: boolean;
  widthPx?: number;
  onResizeStart?: (event: ReactMouseEvent) => void;
  onAssignFolder: (folderId: number) => void;
  onAssignCategory: (categoryId: number) => void;
  onDownload: () => void;
  onClear: () => void;
}

export function DocumentBulkPanel({
  count,
  categories,
  folders,
  canWrite,
  widthPx,
  onResizeStart,
  onAssignFolder,
  onAssignCategory,
  onDownload,
  onClear,
}: DocumentBulkPanelProps) {
  return (
    <DocumentSidePanel
      side="right"
      title="Mehrfachauswahl"
      storageKey="ui.documents.detail.collapsed"
      railIcon={CheckSquare}
      widthPx={widthPx}
      onResizeStart={onResizeStart}
      headerActions={
        <button
          type="button"
          onClick={onClear}
          className="flex h-7 shrink-0 items-center rounded-md px-2 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          Aufheben
        </button>
      }
    >
      <p className="text-sm font-medium text-white/80">
        {count} {count === 1 ? "Dokument" : "Dokumente"} ausgewählt
      </p>
      <p className="text-xs text-white/40">
        In der Mehrfachauswahl ist keine Vorschau möglich. Weise die Auswahl einer
        Sammlung oder Kategorie zu oder lade sie gebündelt herunter.
      </p>

      <section className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/55">
          Download
        </span>
        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-2 self-start rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          <Download size={16} />
          Als Zip herunterladen
        </button>
      </section>

      {canWrite ? (
        <section className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/55">
            Sammlungen
          </span>
          {folders.length > 0 ? (
            <select
              value=""
              onChange={(event) => {
                if (event.target.value) {
                  onAssignFolder(Number(event.target.value));
                }
              }}
              className="rounded-md border border-white/15 bg-steel-900/50 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="" className="text-ink">
                Auswahl in Sammlung einsortieren…
              </option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id} className="text-ink">
                  {folder.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-white/40">
              Sammlungen werden links verwaltet.
            </span>
          )}
        </section>
      ) : null}

      {canWrite ? (
        <section className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/55">
            Kategorien
          </span>
          <div className="flex flex-wrap gap-1">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onAssignCategory(category.id)}
                className="rounded-md px-2 py-0.5 text-xs text-white"
                style={{ backgroundColor: category.color }}
              >
                {category.name}
              </button>
            ))}
            {categories.length === 0 ? (
              <span className="text-xs text-white/40">
                Kategorien werden links verwaltet.
              </span>
            ) : null}
          </div>
        </section>
      ) : null}
    </DocumentSidePanel>
  );
}
