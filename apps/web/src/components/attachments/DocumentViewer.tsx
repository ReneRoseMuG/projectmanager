import type { Attachment, Tag } from "@taskmanager/shared-types";
import { FolderArchive, X } from "lucide-react";
import { useEffect, useState } from "react";
import { TagPicker } from "../tags/TagPicker";
import { DocumentPreviewBody } from "./DocumentPreviewBody";

// Großansicht/Lightbox der Dokumente-Seite (MS-75). Doppelklick auf eine Kachel öffnet die
// Datei hier in voller Größe (Vorschau über DocumentPreviewBody) und bündelt zugleich die
// Metadaten- und Label-Pflege — der Platz, den früher das rechte Detail-Panel einnahm.
// Sammlungen/Kategorien werden hier nur angezeigt; ihre Zuweisung läuft über die linke
// Navigation. Schließen per Schaltfläche, Escape oder Klick auf den Hintergrund.

interface DocumentViewerProps {
  document: Attachment;
  canWrite: boolean;
  onClose: () => void;
  onSaveMetadata: (input: { displayName: string | null; description: string | null }) => void;
  onSetTags: (tags: Tag[]) => void;
  onRemoveFolder: (folderId: number) => void;
  onRemoveCategory: (categoryId: number) => void;
}

export function DocumentViewer({
  document,
  canWrite,
  onClose,
  onSaveMetadata,
  onSetTags,
  onRemoveFolder,
  onRemoveCategory,
}: DocumentViewerProps) {
  const [displayName, setDisplayName] = useState(document.displayName ?? "");
  const [description, setDescription] = useState(document.description ?? "");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const folders = document.folders ?? [];
  const categories = document.categories ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-steel-900/70 p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-panel lg:flex-row"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Vorschau (groß) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="truncate text-sm font-semibold text-ink">
              {document.displayName ?? document.originalName}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-steel-500 transition hover:bg-steel-50 hover:text-ink"
              title="Schließen"
              aria-label="Schließen"
            >
              <X size={18} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <DocumentPreviewBody attachment={document} />
          </div>
        </div>

        {/* Metadaten, Labels, Zuordnungen */}
        <aside className="flex w-full shrink-0 flex-col gap-4 overflow-auto border-t border-line p-4 lg:w-80 lg:border-l lg:border-t-0">
          <p className="text-xs text-steel-500">Originaldatei: {document.originalName}</p>

          <section className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-steel-500">
              Metadaten
            </span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Anzeigename"
              disabled={!canWrite}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-steel-300 disabled:opacity-50"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Beschreibung"
              disabled={!canWrite}
              rows={3}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-steel-300 disabled:opacity-50"
            />
            {canWrite ? (
              <button
                type="button"
                onClick={() =>
                  onSaveMetadata({
                    displayName: displayName.trim() || null,
                    description: description.trim() || null,
                  })
                }
                className="self-start rounded-md bg-steel-100 px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-steel-200 focus:outline-none focus:ring-2 focus:ring-steel-300"
              >
                Metadaten speichern
              </button>
            ) : null}
          </section>

          <section className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-steel-500">
              Labels
            </span>
            <TagPicker
              selected={(document.tags ?? []) as Tag[]}
              onChange={onSetTags}
              domain="dms"
            />
          </section>

          <section className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-steel-500">
              Zuordnungen
            </span>
            <div className="flex flex-wrap gap-1">
              {folders.map((folder) => (
                <span
                  key={`f${folder.id}`}
                  className="flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs text-steel-600"
                >
                  <FolderArchive size={11} />
                  {folder.name}
                  {canWrite ? (
                    <button
                      type="button"
                      onClick={() => onRemoveFolder(folder.id)}
                      className="text-steel-400 hover:text-crimson"
                      title="Aus Sammlung entfernen"
                    >
                      <X size={11} />
                    </button>
                  ) : null}
                </span>
              ))}
              {categories.map((category) => (
                <span
                  key={`c${category.id}`}
                  className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-white"
                  style={{ backgroundColor: category.color }}
                >
                  {category.name}
                  {canWrite ? (
                    <button
                      type="button"
                      onClick={() => onRemoveCategory(category.id)}
                      className="text-white/70 hover:text-white"
                      title="Kategorie entfernen"
                    >
                      <X size={11} />
                    </button>
                  ) : null}
                </span>
              ))}
              {folders.length === 0 && categories.length === 0 ? (
                <span className="text-xs text-steel-400">
                  Noch keine Zuordnung — über die Navigation links zuweisen.
                </span>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
