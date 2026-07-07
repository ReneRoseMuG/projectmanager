import type {
  Attachment,
  AttachmentCategory,
  AttachmentFolder,
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { AttachmentUploader } from "../components/attachments/AttachmentUploader";
import {
  DocumentTile,
  documentTitle,
  fileExtension,
} from "../components/attachments/DocumentTile";
import { DocumentViewer } from "../components/attachments/DocumentViewer";
import {
  THUMBNAIL_SIZES,
  loadThumbnailSize,
  saveThumbnailSize,
  thumbnailMinPx,
  type ThumbnailSize,
} from "../components/attachments/documentThumbnailSize";
import { DocumentSidePanel } from "../components/attachments/DocumentSidePanel";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadMoreIndicator } from "../components/ui/LoadMoreIndicator";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
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

// Sentinel für die Dropdown-Option „ohne Endung" (echte Endungen sind nie leer).
const EXT_NONE = "__none__";

export function DocumentsPage() {
  const canWrite = useHasPermission("attachments", "write");
  const canDelete = useHasPermission("attachments", "delete");
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [folderScope, setFolderScope] = useState<number | "unsorted" | "all">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [tagFilter, setTagFilter] = useState<number | "">("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [extFilter, setExtFilter] = useState<string>("");
  const [openedId, setOpenedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>(() =>
    loadThumbnailSize(),
  );
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
    updateMetadata,
    removeCategory,
    removeFromFolder,
    addToFolderBulk,
    assignCategoryBulk,
    downloadZip,
  } = useDocumentActions();

  // Führt eine Schreibaktion aus und macht Fehler (und optional Erfolg) sichtbar.
  const run = useCallback(
    async (
      action: () => Promise<unknown>,
      successTitle?: string,
    ): Promise<boolean> => {
      try {
        await action();
        if (successTitle) {
          showToast({ tone: "success", title: successTitle });
        }
        return true;
      } catch (mutationError) {
        showToast({
          tone: "error",
          title: "Aktion fehlgeschlagen",
          message: toQueryError(mutationError) ?? "Unbekannter Fehler",
        });
        return false;
      }
    },
    [showToast],
  );

  const opened = documents.find((doc) => doc.id === openedId) ?? null;
  const uploadFolder =
    typeof folderScope === "number" ? folderScope : undefined;

  const selectionActive = selectedIds.size > 0;

  // Endungsfilter über die aktuell sichtbaren (geladenen) Dokumente — rein clientseitig, damit
  // er sich auf die gewählte Ansicht (z. B. eine Sammlung) bezieht und keinen Server-Roundtrip
  // braucht. Das Dropdown bietet nur die tatsächlich vorkommenden Endungen an.
  const extInfo = useMemo(() => {
    const set = new Set<string>();
    let hasNone = false;
    for (const doc of documents) {
      const ext = fileExtension(doc.originalName);
      if (ext) {
        set.add(ext);
      } else {
        hasNone = true;
      }
    }
    return { list: [...set].sort(), hasNone };
  }, [documents]);

  const visibleDocuments = useMemo(() => {
    if (!extFilter) {
      return documents;
    }
    if (extFilter === EXT_NONE) {
      return documents.filter((doc) => fileExtension(doc.originalName) === "");
    }
    return documents.filter((doc) => fileExtension(doc.originalName) === extFilter);
  }, [documents, extFilter]);

  // Passt der gewählte Endungsfilter nicht mehr in die fertig geladene Ansicht (z. B. nach einem
  // Sammlungswechsel), zurücksetzen — sonst zeigt das Dropdown einen Wert ohne passende Option.
  useEffect(() => {
    if (loading || loadingMore || extFilter === "") {
      return;
    }
    const stillAvailable =
      extFilter === EXT_NONE ? extInfo.hasNone : extInfo.list.includes(extFilter);
    if (!stillAvailable) {
      setExtFilter("");
    }
  }, [extFilter, extInfo, loading, loadingMore]);

  const changeThumbnailSize = (size: ThumbnailSize) => {
    setThumbnailSize(size);
    saveThumbnailSize(size);
  };

  const removeFromSelection = (id: number) => {
    setSelectedIds((current) => {
      if (!current.has(id)) {
        return current;
      }
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDeleteDocument = (doc: Attachment) => {
    if (
      window.confirm(`Dokument „${documentTitle(doc)}" endgültig löschen?`)
    ) {
      void run(() => deleteDocument(doc.id), "Dokument gelöscht");
      if (openedId === doc.id) {
        setOpenedId(null);
      }
      removeFromSelection(doc.id);
    }
  };

  // Nach einer erfolgreichen Bulk-Operation nachfragen, ob weitere Aktionen auf derselben
  // Auswahl folgen. Bei „Nein" wird die (in gefilterten Ansichten sonst verwaiste) Auswahl
  // vollständig aufgehoben — sie zeigt sonst auf Dokumente, die aus der Liste gefallen sind.
  const promptContinueOrClear = async () => {
    const keepSelection = await confirm({
      title: "Weitere Bulk-Operation?",
      body: `${selectedIds.size} ${
        selectedIds.size === 1 ? "Dokument bleibt" : "Dokumente bleiben"
      } ausgewählt. Möchtest du eine weitere Bulk-Operation ausführen?`,
      confirmLabel: "Ausgewählt lassen",
      cancelLabel: "Auswahl aufheben",
    });
    if (!keepSelection) {
      clearSelection();
    }
  };

  const handleBulkAssignFolder = async (folderId: number) => {
    const ok = await run(
      () => addToFolderBulk(folderId, [...selectedIds]),
      "Auswahl in Sammlung einsortiert",
    );
    if (ok) {
      await promptContinueOrClear();
    }
  };

  const handleBulkAssignCategory = async (categoryId: number) => {
    const ok = await run(
      () => assignCategoryBulk(categoryId, [...selectedIds]),
      "Kategorie zugewiesen",
    );
    if (ok) {
      await promptContinueOrClear();
    }
  };

  const handleBulkDownload = async () => {
    const ids = [...selectedIds];
    const ok = await run(async () => {
      const blob = await downloadZip(ids);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = "dokumente.zip";
      link.click();
      URL.revokeObjectURL(url);
    });
    if (ok) {
      await promptContinueOrClear();
    }
  };

  // Navigation im Doppelmodus: ohne Auswahl filtert ein Klick, mit aktiver Auswahl sortiert er
  // die markierten Dokumente in die Sammlung ein bzw. weist die Kategorie zu.
  const handleNavFolderClick = (folderId: number) => {
    if (selectionActive) {
      void handleBulkAssignFolder(folderId);
    } else {
      setFolderScope(folderId);
    }
  };

  const handleNavCategoryClick = (categoryId: number) => {
    if (selectionActive) {
      void handleBulkAssignCategory(categoryId);
    } else {
      setCategoryFilter((current) => (current === categoryId ? "" : categoryId));
    }
  };

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
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
        folderScope === scope
          ? "bg-white/10 font-semibold text-white"
          : "text-white/70 hover:bg-white/5 hover:text-white"
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
        className="min-w-0 flex-1 rounded-md border border-white/15 bg-steel-900/50 px-2 py-1 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
      />
      <button
        type="button"
        onClick={onSave}
        className="rounded-md p-1 text-emerald-300 hover:bg-white/10"
        title="Speichern"
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        onClick={cancelEdit}
        className="rounded-md p-1 text-white/55 hover:bg-white/10 hover:text-white"
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

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Verwaltung: Sammlungen & Kategorien */}
        <DocumentSidePanel
          side="left"
          title="Verwaltung"
          storageKey="ui.documents.folders.collapsed"
          railIcon={FolderArchive}
        >
          {selectionActive ? (
            <div className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs text-white/80">
              {selectedIds.size} ausgewählt — auf eine Sammlung oder Kategorie
              klicken, um sie zuzuweisen.
            </div>
          ) : null}

          <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-2">
            <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
              Sammlungen
            </span>
            {scopeButton("all", "Alle Dokumente", <Layers size={16} />)}
            {scopeButton("unsorted", "Nicht einsortiert", <Inbox size={16} />)}
            {folders.length > 0 ? (
              <div className="my-1 border-t border-white/10" />
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
                    onClick={() => handleNavFolderClick(folder.id)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                      folderScope === folder.id && !selectionActive
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                    title={
                      selectionActive
                        ? `${selectedIds.size} Dokument(e) hier einsortieren`
                        : undefined
                    }
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
                        className="rounded-md p-1 text-white/45 hover:bg-white/10 hover:text-white"
                        title="Umbenennen"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(folder)}
                        className="rounded-md p-1 text-white/45 hover:bg-crimson/20 hover:text-crimson"
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
                className="mt-1 flex items-center gap-1 border-t border-white/10 px-1 pt-2"
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
                  className="min-w-0 flex-1 rounded-md border border-white/15 bg-steel-900/50 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <button
                  type="submit"
                  className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/15"
                >
                  +
                </button>
              </form>
            ) : null}
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-2">
            <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
              Kategorien
            </span>
            {categories.length === 0 ? (
              <span className="px-3 py-1 text-xs text-white/40">
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
                  <button
                    type="button"
                    onClick={() => handleNavCategoryClick(category.id)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition ${
                      categoryFilter === category.id && !selectionActive
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                    title={
                      selectionActive
                        ? `${selectedIds.size} Dokument(e) dieser Kategorie zuweisen`
                        : undefined
                    }
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate">{category.name}</span>
                  </button>
                  {canWrite ? (
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(category.id, category.name, "category")
                        }
                        className="rounded-md p-1 text-white/45 hover:bg-white/10 hover:text-white"
                        title="Umbenennen"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        className="rounded-md p-1 text-white/45 hover:bg-crimson/20 hover:text-crimson"
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
                className="mt-1 flex items-center gap-1 border-t border-white/10 px-1 pt-2"
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
                  className="min-w-0 flex-1 rounded-md border border-white/15 bg-steel-900/50 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <button
                  type="submit"
                  className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/15"
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
              tone="dark"
            />
          ) : null}
        </DocumentSidePanel>

        {/* Bibliothek */}
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Dokumente durchsuchen…"
              className="min-w-[180px] flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
            />
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
            <select
              value={extFilter}
              onChange={(event) => setExtFilter(event.target.value)}
              disabled={extInfo.list.length === 0 && !extInfo.hasNone}
              className="rounded-md border border-line bg-white px-2 py-2 text-sm text-ink disabled:opacity-50"
              title="Nach Dateiendung in der aktuellen Ansicht filtern"
            >
              <option value="">Alle Endungen</option>
              {extInfo.list.map((ext) => (
                <option key={ext} value={ext}>
                  .{ext}
                </option>
              ))}
              {extInfo.hasNone ? (
                <option value={EXT_NONE}>(ohne Endung)</option>
              ) : null}
            </select>
            {/* Kachelgröße */}
            <div
              className="flex items-center gap-0.5 rounded-md border border-line bg-white p-0.5"
              role="group"
              aria-label="Kachelgröße"
            >
              {THUMBNAIL_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => changeThumbnailSize(size.value)}
                  className={`h-8 w-8 rounded text-xs font-semibold transition ${
                    thumbnailSize === size.value
                      ? "bg-steel-800 text-white"
                      : "text-steel-500 hover:bg-steel-50"
                  }`}
                  title={`Kachelgröße ${size.label}`}
                  aria-pressed={thumbnailSize === size.value}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {selectionActive ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-steel-300 bg-steel-100 px-3 py-2">
              <span className="text-sm font-medium text-ink">
                {selectedIds.size} ausgewählt
              </span>
              <span className="text-xs text-steel-500">
                Auf eine Sammlung oder Kategorie links klicken zum Zuweisen.
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleBulkDownload()}
                  className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition hover:bg-steel-50"
                >
                  <Download size={15} />
                  Als Zip
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-steel-600 transition hover:bg-white"
                >
                  Auswahl aufheben
                </button>
              </div>
            </div>
          ) : null}

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
          ) : visibleDocuments.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} />}
              title="Keine Treffer"
              body="Keine sichtbare Datei mit dieser Endung."
            />
          ) : (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailMinPx(
                  thumbnailSize,
                )}px, 1fr))`,
              }}
            >
              {visibleDocuments.map((doc) => (
                <DocumentTile
                  key={doc.id}
                  document={doc}
                  isSelected={selectedIds.has(doc.id)}
                  onToggleSelect={() => toggleSelect(doc.id)}
                  onOpen={() => setOpenedId(doc.id)}
                  canDelete={canDelete}
                  onDelete={() => handleDeleteDocument(doc)}
                />
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

      {opened ? (
        <DocumentViewer
          key={opened.id}
          document={opened}
          canWrite={canWrite}
          onClose={() => setOpenedId(null)}
          onSaveMetadata={(input) =>
            run(
              () =>
                updateMetadata(opened.id, {
                  ...input,
                  expectedVersion: opened.version,
                }),
              "Gespeichert",
            )
          }
          onSetTags={(next) =>
            run(
              () =>
                setTags(
                  opened.id,
                  next.map((tag) => tag.id),
                ),
              undefined,
            )
          }
          onRemoveFolder={(folderId) =>
            run(
              () => removeFromFolder(folderId, opened.id),
              "Aus Sammlung entfernt",
            )
          }
          onRemoveCategory={(categoryId) =>
            run(() => removeCategory(opened.id, categoryId), "Kategorie entfernt")
          }
        />
      ) : null}
    </div>
  );
}
