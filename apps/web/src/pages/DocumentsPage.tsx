import type {
  Attachment,
  AttachmentCategory,
  AttachmentFolder,
  Tag,
} from "@taskmanager/shared-types";
import {
  Check,
  Download,
  FileText,
  FolderArchive,
  Inbox,
  Layers,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { AttachmentUploader } from "../components/attachments/AttachmentUploader";
import { describeAttachmentType } from "../components/attachments/attachmentTypes";
import { DocumentHoverPreview } from "../components/attachments/DocumentHoverPreview";
import { DocumentPreviewBody } from "../components/attachments/DocumentPreviewBody";
import { EmptyState } from "../components/ui/EmptyState";
import { ItemRow } from "../components/ui/ItemRow";
import { LoadMoreIndicator } from "../components/ui/LoadMoreIndicator";
import { TagPicker } from "../components/tags/TagPicker";
import { useToast } from "../components/ui/ToastProvider";
import {
  useCategories,
  useDocumentActions,
  useDocumentLibrary,
  useFolders,
} from "../hooks/useDocuments";
import { useHasPermission } from "../hooks/usePermissions";
import { useTags } from "../hooks/useTags";
import { toQueryError } from "../queries/queryErrors";
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
  return stripFileExtension(document.displayName ?? document.originalName);
}

function stripFileExtension(name: string): string {
  const extensionIndex = name.lastIndexOf(".");
  if (extensionIndex <= 0) {
    return name;
  }
  return name.slice(0, extensionIndex).trimEnd();
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

export function DocumentsPage() {
  const canWrite = useHasPermission("attachments", "write");
  const canDelete = useHasPermission("attachments", "delete");
  const { showToast } = useToast();

  const [folderScope, setFolderScope] = useState<number | "unsorted" | "all">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [tagFilter, setTagFilter] = useState<number | "">("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );
  const [editName, setEditName] = useState("");

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

  // Progressives Nachladen: der erste Block erscheint sofort, weitere Blöcke laden automatisch
  // nach. Ein Filter-/Suchwechsel ändert den queryKey und startet das Laden von vorne.
  const { documents, total, loadedCount, loading, loadingMore, error } =
    useDocumentLibrary(filter);
  const { folders, createFolder, updateFolder, deleteFolder } = useFolders();
  const { categories, createCategory, updateCategory, deleteCategory } =
    useCategories();
  const { tags } = useTags("dms");
  const {
    uploadDocument,
    deleteDocument,
    setTags,
    assignCategory,
    removeCategory,
    updateMetadata,
    addToFolder,
    removeFromFolder,
  } = useDocumentActions();

  // Führt eine Schreibaktion aus und macht Fehler (und optional Erfolg) sichtbar.
  const run = useCallback(
    async (action: () => Promise<unknown>, successTitle?: string) => {
      try {
        await action();
        if (successTitle) {
          showToast({ tone: "success", title: successTitle });
        }
      } catch (mutationError) {
        showToast({
          tone: "error",
          title: "Aktion fehlgeschlagen",
          message: toQueryError(mutationError) ?? "Unbekannter Fehler",
        });
      }
    },
    [showToast],
  );

  const selected =
    documents.find((document) => document.id === selectedId) ?? null;
  const uploadFolder =
    typeof folderScope === "number" ? folderScope : undefined;

  const startEdit = (
    id: number,
    currentName: string,
    kind: "folder" | "category",
  ) => {
    setEditName(currentName);
    if (kind === "folder") {
      setEditingFolderId(id);
      setEditingCategoryId(null);
    } else {
      setEditingCategoryId(id);
      setEditingFolderId(null);
    }
  };

  const cancelEdit = () => {
    setEditingFolderId(null);
    setEditingCategoryId(null);
    setEditName("");
  };

  const saveFolderName = (folder: AttachmentFolder) => {
    const name = editName.trim();
    if (name && name !== folder.name) {
      void run(
        () =>
          updateFolder(folder.id, { name, expectedVersion: folder.version }),
        "Sammlung umbenannt",
      );
    }
    cancelEdit();
  };

  const saveCategoryName = (category: AttachmentCategory) => {
    const name = editName.trim();
    if (name && name !== category.name) {
      void run(
        () =>
          updateCategory(category.id, {
            name,
            expectedVersion: category.version,
          }),
        "Kategorie umbenannt",
      );
    }
    cancelEdit();
  };

  const handleDeleteFolder = (folder: AttachmentFolder) => {
    const hasChildren = folders.some(
      (candidate) => candidate.parentId === folder.id,
    );
    const message = hasChildren
      ? `„${folder.name}" enthält Unter-Sammlungen. Mit allen Unter-Sammlungen löschen? Die enthaltenen Dokumente bleiben erhalten.`
      : `Sammlung „${folder.name}" löschen? Die enthaltenen Dokumente bleiben erhalten.`;
    if (window.confirm(message)) {
      if (folderScope === folder.id) {
        setFolderScope("all");
      }
      void run(() => deleteFolder(folder.id, hasChildren), "Sammlung gelöscht");
    }
  };

  const handleDeleteCategory = (category: AttachmentCategory) => {
    if (
      window.confirm(
        `Kategorie „${category.name}" löschen? Die Zuordnung wird von allen Dokumenten entfernt, die Dokumente bleiben erhalten.`,
      )
    ) {
      if (categoryFilter === category.id) {
        setCategoryFilter("");
      }
      void run(() => deleteCategory(category.id), "Kategorie gelöscht");
    }
  };

  const scopeButton = (
    scope: number | "unsorted" | "all",
    label: string,
    icon: JSX.Element,
  ) => (
    <button
      type="button"
      onClick={() => setFolderScope(scope)}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
        folderScope === scope
          ? "bg-steel-100 text-ink"
          : "text-steel-600 hover:bg-steel-50"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );

  const editRow = (onSave: () => void) => (
    <div className="flex items-center gap-1 px-1">
      <input
        autoFocus
        value={editName}
        onChange={(event) => setEditName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSave();
          }
          if (event.key === "Escape") {
            cancelEdit();
          }
        }}
        className="min-w-0 flex-1 rounded-md border border-line bg-white px-2 py-1 text-sm text-ink"
      />
      <button
        type="button"
        onClick={onSave}
        className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50"
        title="Speichern"
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        onClick={cancelEdit}
        className="rounded-md p-1 text-steel-500 hover:bg-steel-50"
        title="Abbrechen"
      >
        <X size={14} />
      </button>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Dokumente</h1>
        <p className="text-sm text-steel-500">
          Zentrale Bibliothek für alle Anhänge – kategorisieren, labeln und in
          Sammlungen bündeln.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Verwaltung: Sammlungen & Kategorien */}
        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-white p-2">
            <span className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-steel-400">
              Sammlungen
            </span>
            {scopeButton("all", "Alle Dokumente", <Layers size={16} />)}
            {scopeButton("unsorted", "Nicht einsortiert", <Inbox size={16} />)}
            {folders.length > 0 ? (
              <div className="my-1 border-t border-line" />
            ) : null}
            {folders.map((folder) =>
              editingFolderId === folder.id ? (
                <div key={folder.id}>
                  {editRow(() => saveFolderName(folder))}
                </div>
              ) : (
                <div
                  key={folder.id}
                  className="group flex items-center gap-1"
                  style={{ paddingLeft: folder.parentId ? 12 : 0 }}
                >
                  <button
                    type="button"
                    onClick={() => setFolderScope(folder.id)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                      folderScope === folder.id
                        ? "bg-steel-100 text-ink"
                        : "text-steel-600 hover:bg-steel-50"
                    }`}
                  >
                    <FolderArchive size={16} />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  {canWrite ? (
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(folder.id, folder.name, "folder")
                        }
                        className="rounded-md p-1 text-steel-400 hover:bg-steel-50 hover:text-ink"
                        title="Umbenennen"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(folder)}
                        className="rounded-md p-1 text-steel-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
              ),
            )}
            {canWrite ? (
              <form
                className="mt-1 flex items-center gap-1 border-t border-line px-1 pt-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = newFolderName.trim();
                  if (!name) {
                    return;
                  }
                  void run(
                    () =>
                      createFolder({
                        name,
                        parentId:
                          typeof folderScope === "number" ? folderScope : null,
                      }),
                    "Sammlung angelegt",
                  );
                  setNewFolderName("");
                }}
              >
                <input
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  placeholder="Neue Sammlung…"
                  className="min-w-0 flex-1 rounded-md border border-line bg-white px-2 py-1 text-xs text-ink"
                />
                <button
                  type="submit"
                  className="rounded-md bg-steel-800 px-2 py-1 text-xs text-white"
                >
                  +
                </button>
              </form>
            ) : null}
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-line bg-white p-2">
            <span className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-steel-400">
              Kategorien
            </span>
            {categories.length === 0 ? (
              <span className="px-3 py-1 text-xs text-steel-400">
                Noch keine Kategorien.
              </span>
            ) : null}
            {categories.map((category) =>
              editingCategoryId === category.id ? (
                <div key={category.id}>
                  {editRow(() => saveCategoryName(category))}
                </div>
              ) : (
                <div
                  key={category.id}
                  className="group flex items-center gap-1"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-sm text-steel-600">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate">{category.name}</span>
                  </span>
                  {canWrite ? (
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(category.id, category.name, "category")
                        }
                        className="rounded-md p-1 text-steel-400 hover:bg-steel-50 hover:text-ink"
                        title="Umbenennen"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        className="rounded-md p-1 text-steel-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
              ),
            )}
            {canWrite ? (
              <form
                className="mt-1 flex items-center gap-1 border-t border-line px-1 pt-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = newCategoryName.trim();
                  if (!name) {
                    return;
                  }
                  void run(
                    () => createCategory({ name }),
                    "Kategorie angelegt",
                  );
                  setNewCategoryName("");
                }}
              >
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Neue Kategorie…"
                  className="min-w-0 flex-1 rounded-md border border-line bg-white px-2 py-1 text-xs text-ink"
                />
                <button
                  type="submit"
                  className="rounded-md bg-steel-800 px-2 py-1 text-xs text-white"
                >
                  +
                </button>
              </form>
            ) : null}
          </div>

          {canWrite ? (
            <AttachmentUploader
              onUpload={(file) =>
                run(
                  () => uploadDocument(file, uploadFolder),
                  "Dokument hochgeladen",
                )
              }
              size="sm"
            />
          ) : null}
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
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value ? Number(event.target.value) : "",
                )
              }
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
              onChange={(event) =>
                setTagFilter(
                  event.target.value ? Number(event.target.value) : "",
                )
              }
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

          {error ? (
            <p className="text-sm text-rose-600">
              Dokumente konnten nicht geladen werden: {error}
            </p>
          ) : null}

          {loading ? (
            <p className="text-sm text-steel-500">Wird geladen…</p>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} />}
              title="Keine Dokumente"
              body="Für die aktuelle Auswahl gibt es keine Dokumente."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map((document) => (
                <DocumentHoverPreview key={document.id} document={document}>
                  <ItemRow
                    title={documentTitle(document)}
                    description={document.description ?? undefined}
                    onOpen={() => setSelectedId(document.id)}
                    pills={
                      <div className="flex flex-wrap gap-1">
                        {(document.categories ?? []).map((category) => (
                          <span
                            key={`c${category.id}`}
                            className="rounded-md px-2 py-0.5 text-xs text-white"
                            style={{ backgroundColor: category.color }}
                          >
                            {category.name}
                          </span>
                        ))}
                        {(document.tags ?? []).map((tag) => (
                          <span
                            key={`t${tag.id}`}
                            className="rounded-md border border-line px-2 py-0.5 text-xs text-steel-600"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    }
                    meta={<DocumentMeta document={document} />}
                    metaClassName="w-32"
                    pillsClassName="w-44 justify-start"
                    actionsClassName="w-16"
                    actions={
                      <div className="flex items-center gap-1">
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
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Dokument „${documentTitle(document)}" endgültig löschen?`,
                                )
                              ) {
                                void run(
                                  () => deleteDocument(document.id),
                                  "Dokument gelöscht",
                                );
                                if (selectedId === document.id) {
                                  setSelectedId(null);
                                }
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
                </DocumentHoverPreview>
              ))}
            </div>
          )}

          <LoadMoreIndicator
            loadedCount={loadedCount}
            total={total}
            loadingMore={loadingMore}
          />
        </section>
      </div>

      {selected ? (
        <DocumentDetailPanel
          key={selected.id}
          document={selected}
          categories={categories}
          folders={folders}
          canWrite={canWrite}
          onClose={() => setSelectedId(null)}
          onSetTags={(next) =>
            run(
              () =>
                setTags(
                  selected.id,
                  next.map((tag) => tag.id),
                ),
              undefined,
            )
          }
          onAssignCategory={(categoryId) =>
            run(() => assignCategory(selected.id, categoryId))
          }
          onRemoveCategory={(categoryId) =>
            run(() => removeCategory(selected.id, categoryId))
          }
          onAddToFolder={(folderId) =>
            run(
              () => addToFolder(folderId, selected.id),
              "In Sammlung einsortiert",
            )
          }
          onRemoveFromFolder={(folderId) =>
            run(
              () => removeFromFolder(folderId, selected.id),
              "Aus Sammlung entfernt",
            )
          }
          onSaveMetadata={(input) =>
            run(
              () =>
                updateMetadata(selected.id, {
                  ...input,
                  expectedVersion: selected.version,
                }),
              "Gespeichert",
            )
          }
        />
      ) : null}
    </div>
  );
}

interface DocumentDetailPanelProps {
  document: Attachment;
  categories: AttachmentCategory[];
  folders: AttachmentFolder[];
  canWrite: boolean;
  onClose: () => void;
  onSetTags: (tags: Tag[]) => void;
  onAssignCategory: (categoryId: number) => void;
  onRemoveCategory: (categoryId: number) => void;
  onAddToFolder: (folderId: number) => void;
  onRemoveFromFolder: (folderId: number) => void;
  onSaveMetadata: (input: {
    displayName: string | null;
    description: string | null;
  }) => void;
}

function DocumentDetailPanel({
  document,
  categories,
  folders,
  canWrite,
  onClose,
  onSetTags,
  onAssignCategory,
  onRemoveCategory,
  onAddToFolder,
  onRemoveFromFolder,
  onSaveMetadata,
}: DocumentDetailPanelProps) {
  const [displayName, setDisplayName] = useState(document.displayName ?? "");
  const [description, setDescription] = useState(document.description ?? "");
  const assignedCategoryIds = new Set(
    (document.categories ?? []).map((category) => category.id),
  );
  const documentFolders = document.folders ?? [];
  const assignedFolderIds = new Set(documentFolders.map((folder) => folder.id));
  const availableFolders = folders.filter(
    (folder) => !assignedFolderIds.has(folder.id),
  );

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/20"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col gap-5 overflow-auto bg-white p-6 shadow-steel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">
            {document.displayName ?? document.originalName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-steel-500 hover:text-ink"
          >
            Schließen
          </button>
        </div>
        <p className="text-xs text-steel-500">
          Originaldatei: {document.originalName}
        </p>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-steel-400">
            Vorschau
          </span>
          <DocumentPreviewBody attachment={document} />
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-steel-400">
            Metadaten
          </span>
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
              onClick={() =>
                onSaveMetadata({
                  displayName: displayName.trim() || null,
                  description: description.trim() || null,
                })
              }
              className="self-start rounded-md bg-steel-800 px-3 py-1.5 text-sm text-white hover:bg-steel-700"
            >
              Metadaten speichern
            </button>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-steel-400">
            Sammlungen
          </span>
          <div className="flex flex-wrap gap-1">
            {documentFolders.map((folder) => (
              <span
                key={folder.id}
                className="flex items-center gap-1 rounded-md bg-steel-100 px-2 py-0.5 text-xs text-ink"
              >
                <FolderArchive size={12} />
                {folder.name}
                {canWrite ? (
                  <button
                    type="button"
                    onClick={() => onRemoveFromFolder(folder.id)}
                    className="text-steel-500 hover:text-rose-600"
                    title="Aus Sammlung entfernen"
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </span>
            ))}
            {documentFolders.length === 0 ? (
              <span className="text-xs text-steel-400">
                In keiner Sammlung.
              </span>
            ) : null}
          </div>
          {canWrite && availableFolders.length > 0 ? (
            <select
              value=""
              onChange={(event) => {
                if (event.target.value) {
                  onAddToFolder(Number(event.target.value));
                }
              }}
              className="rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink"
            >
              <option value="">In Sammlung einsortieren…</option>
              {availableFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-steel-400">
            Labels
          </span>
          <TagPicker
            selected={(document.tags ?? []) as Tag[]}
            onChange={onSetTags}
            domain="dms"
          />
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-steel-400">
            Kategorien
          </span>
          <div className="flex flex-wrap gap-1">
            {categories.map((category) => {
              const assigned = assignedCategoryIds.has(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  disabled={!canWrite}
                  onClick={() =>
                    assigned
                      ? onRemoveCategory(category.id)
                      : onAssignCategory(category.id)
                  }
                  className={`rounded-md px-2 py-0.5 text-xs ${assigned ? "text-white" : "border border-line text-steel-600"}`}
                  style={
                    assigned ? { backgroundColor: category.color } : undefined
                  }
                >
                  {category.name}
                </button>
              );
            })}
            {categories.length === 0 ? (
              <span className="text-xs text-steel-400">
                Kategorien werden links verwaltet.
              </span>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
