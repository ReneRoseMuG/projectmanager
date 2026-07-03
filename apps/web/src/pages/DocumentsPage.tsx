import type { Attachment, Tag } from "@taskmanager/shared-types";
import { Download, FileText, FolderArchive, Inbox, Layers, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AttachmentUploader } from "../components/attachments/AttachmentUploader";
import { EmptyState } from "../components/ui/EmptyState";
import { ItemRow } from "../components/ui/ItemRow";
import { TagPicker } from "../components/tags/TagPicker";
import { useCategories, useDocumentActions, useDocumentLibrary, useFolders } from "../hooks/useDocuments";
import { useHasPermission } from "../hooks/usePermissions";
import { useTags } from "../hooks/useTags";
import type { DocumentLibraryFilter } from "../api/documents";

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function documentTitle(document: Attachment): string {
  return document.displayName ?? document.originalName;
}

export function DocumentsPage() {
  const canWrite = useHasPermission("attachments", "write");
  const canDelete = useHasPermission("attachments", "delete");

  const [folderScope, setFolderScope] = useState<number | "unsorted" | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [tagFilter, setTagFilter] = useState<number | "">("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  const filter = useMemo<DocumentLibraryFilter>(() => {
    const next: DocumentLibraryFilter = {};
    if (folderScope !== "all") {
      next.folder = folderScope;
    }
    if (categoryFilter !== "") {
      next.category = categoryFilter;
    }
    if (tagFilter !== "") {
      next.tag = tagFilter;
    }
    if (typeFilter) {
      next.type = typeFilter;
    }
    if (search.trim()) {
      next.q = search.trim();
    }
    return next;
  }, [folderScope, categoryFilter, tagFilter, typeFilter, search]);

  const { documents, loading, error } = useDocumentLibrary(filter);
  const { folders, createFolder } = useFolders();
  const { categories, createCategory } = useCategories();
  const { tags } = useTags();
  const { uploadDocument, deleteDocument, setTags, assignCategory, removeCategory, updateMetadata } = useDocumentActions();

  const selected = documents.find((document) => document.id === selectedId) ?? null;
  const uploadFolder = typeof folderScope === "number" ? folderScope : undefined;

  const scopeButton = (scope: number | "unsorted" | "all", label: string, icon: JSX.Element) => (
    <button
      type="button"
      onClick={() => setFolderScope(scope)}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
        folderScope === scope ? "bg-steel-100 text-ink" : "text-steel-600 hover:bg-steel-50"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-0 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Dokumente</h1>
        <p className="text-sm text-steel-500">Zentrale Bibliothek für alle Anhänge – kategorisieren, labeln und in Sammlungen bündeln.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Sammlungen */}
        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-white p-2">
            {scopeButton("all", "Alle Dokumente", <Layers size={16} />)}
            {scopeButton("unsorted", "Nicht einsortiert", <Inbox size={16} />)}
            {folders.length > 0 ? <div className="my-1 border-t border-line" /> : null}
            {folders.map((folder) => (
              <div key={folder.id} style={{ paddingLeft: folder.parentId ? 16 : 0 }}>
                {scopeButton(folder.id, folder.name, <FolderArchive size={16} />)}
              </div>
            ))}
            {canWrite ? (
              <form
                className="mt-1 flex items-center gap-1 border-t border-line px-1 pt-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = newFolderName.trim();
                  if (!name) {
                    return;
                  }
                  void createFolder({ name, parentId: typeof folderScope === "number" ? folderScope : null });
                  setNewFolderName("");
                }}
              >
                <input
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  placeholder="Neue Sammlung…"
                  className="min-w-0 flex-1 rounded-md border border-line bg-white px-2 py-1 text-xs text-ink"
                />
                <button type="submit" className="rounded-md bg-steel-800 px-2 py-1 text-xs text-white">+</button>
              </form>
            ) : null}
          </div>
          {canWrite ? <AttachmentUploader onUpload={(file) => uploadDocument(file, uploadFolder)} size="sm" /> : null}
        </aside>

        {/* Bibliothek */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Dokumente durchsuchen…"
              className="min-w-[180px] flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value ? Number(event.target.value) : "")}
              className="rounded-md border border-line bg-white px-2 py-2 text-sm text-ink"
            >
              <option value="">Alle Kategorien</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value ? Number(event.target.value) : "")}
              className="rounded-md border border-line bg-white px-2 py-2 text-sm text-ink"
            >
              <option value="">Alle Labels</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-md border border-line bg-white px-2 py-2 text-sm text-ink"
            >
              <option value="">Alle Typen</option>
              <option value="image/">Bild</option>
              <option value="application/pdf">PDF</option>
              <option value="text/">Text</option>
              <option value="video/">Video</option>
              <option value="audio/">Audio</option>
            </select>
          </div>

          {error ? <p className="text-sm text-rose-600">Dokumente konnten nicht geladen werden: {error}</p> : null}

          {loading ? (
            <p className="text-sm text-steel-500">Wird geladen…</p>
          ) : documents.length === 0 ? (
            <EmptyState icon={<FileText size={28} />} title="Keine Dokumente" body="Für die aktuelle Auswahl gibt es keine Dokumente." />
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map((document) => (
                <ItemRow
                  key={document.id}
                  title={documentTitle(document)}
                  description={document.description ?? undefined}
                  onOpen={() => setSelectedId(document.id)}
                  pills={
                    <div className="flex flex-wrap gap-1">
                      {(document.categories ?? []).map((category) => (
                        <span key={`c${category.id}`} className="rounded-md px-2 py-0.5 text-xs text-white" style={{ backgroundColor: category.color }}>
                          {category.name}
                        </span>
                      ))}
                      {(document.tags ?? []).map((tag) => (
                        <span key={`t${tag.id}`} className="rounded-md border border-line px-2 py-0.5 text-xs text-steel-600">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  }
                  meta={<span className="text-xs text-steel-500">{formatBytes(document.size)} · {document.mimetype}</span>}
                  actions={
                    <div className="flex items-center gap-1">
                      <a href={document.url} download className="rounded-md p-1.5 text-steel-500 hover:bg-steel-50" title="Herunterladen">
                        <Download size={16} />
                      </a>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => {
                            void deleteDocument(document.id);
                            if (selectedId === document.id) {
                              setSelectedId(null);
                            }
                          }}
                          className="rounded-md p-1.5 text-steel-500 hover:bg-rose-50 hover:text-rose-600"
                          title="Endgültig löschen"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selected ? (
        <DocumentDetailPanel
          key={selected.id}
          document={selected}
          categories={categories}
          canWrite={canWrite}
          onClose={() => setSelectedId(null)}
          onSetTags={(next) => setTags(selected.id, next.map((tag) => tag.id))}
          onAssignCategory={(categoryId) => assignCategory(selected.id, categoryId)}
          onRemoveCategory={(categoryId) => removeCategory(selected.id, categoryId)}
          onCreateCategory={(name) => createCategory({ name })}
          onSaveMetadata={(input) => updateMetadata(selected.id, { ...input, expectedVersion: selected.version })}
        />
      ) : null}
    </div>
  );
}

interface DocumentDetailPanelProps {
  document: Attachment;
  categories: { id: number; name: string; color: string }[];
  canWrite: boolean;
  onClose: () => void;
  onSetTags: (tags: Tag[]) => void;
  onAssignCategory: (categoryId: number) => void;
  onRemoveCategory: (categoryId: number) => void;
  onCreateCategory: (name: string) => void;
  onSaveMetadata: (input: { displayName: string | null; description: string | null }) => void;
}

function DocumentDetailPanel({
  document,
  categories,
  canWrite,
  onClose,
  onSetTags,
  onAssignCategory,
  onRemoveCategory,
  onCreateCategory,
  onSaveMetadata
}: DocumentDetailPanelProps) {
  const [displayName, setDisplayName] = useState(document.displayName ?? "");
  const [description, setDescription] = useState(document.description ?? "");
  const [newCategory, setNewCategory] = useState("");
  const assignedCategoryIds = new Set((document.categories ?? []).map((category) => category.id));

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col gap-5 overflow-auto bg-white p-6 shadow-steel" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">{document.displayName ?? document.originalName}</h2>
          <button type="button" onClick={onClose} className="text-sm text-steel-500 hover:text-ink">
            Schließen
          </button>
        </div>
        <p className="text-xs text-steel-500">Originaldatei: {document.originalName}</p>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-steel-400">Metadaten</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Anzeigename"
            disabled={!canWrite}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Beschreibung"
            disabled={!canWrite}
            rows={3}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
          />
          {canWrite ? (
            <button
              type="button"
              onClick={() => onSaveMetadata({ displayName: displayName.trim() || null, description: description.trim() || null })}
              className="self-start rounded-md bg-steel-800 px-3 py-1.5 text-sm text-white hover:bg-steel-700"
            >
              Metadaten speichern
            </button>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-steel-400">Labels</span>
          <TagPicker selected={(document.tags ?? []) as Tag[]} onChange={onSetTags} />
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-steel-400">Kategorien</span>
          <div className="flex flex-wrap gap-1">
            {categories.map((category) => {
              const assigned = assignedCategoryIds.has(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  disabled={!canWrite}
                  onClick={() => (assigned ? onRemoveCategory(category.id) : onAssignCategory(category.id))}
                  className={`rounded-md px-2 py-0.5 text-xs ${assigned ? "text-white" : "border border-line text-steel-600"}`}
                  style={assigned ? { backgroundColor: category.color } : undefined}
                >
                  {category.name}
                </button>
              );
            })}
            {categories.length === 0 ? <span className="text-xs text-steel-400">Noch keine Kategorien angelegt.</span> : null}
          </div>
          {canWrite ? (
            <form
              className="flex items-center gap-1"
              onSubmit={(event) => {
                event.preventDefault();
                const name = newCategory.trim();
                if (!name) {
                  return;
                }
                onCreateCategory(name);
                setNewCategory("");
              }}
            >
              <input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Neue Kategorie…"
                className="min-w-0 flex-1 rounded-md border border-line bg-white px-2 py-1 text-xs text-ink"
              />
              <button type="submit" className="rounded-md bg-steel-800 px-2 py-1 text-xs text-white">+</button>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}
