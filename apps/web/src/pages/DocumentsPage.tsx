import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
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
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import {
  categoryDropId,
  documentDragId,
  dragDocumentIds,
  dragIdsFromData,
  folderDropId,
  parseDropTarget,
} from "../components/attachments/documentDnd";
import {
  PANEL_MIN_WIDTH,
  computePanelWidth,
  type PanelRow,
} from "../components/attachments/documentPanelWidth";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadMoreIndicator } from "../components/ui/LoadMoreIndicator";
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

// Ziehbare Hülle um eine Dokumentkachel. Bewusst ein Wrapper statt einer Änderung an DocumentTile:
// dessen Klick-Verdrahtung (Einfachklick markiert, Doppelklick öffnet, Checkbox und Löschen mit
// stopPropagation) bleibt so unangetastet. `drag.attributes` wird nicht gespreizt — es setzt
// role="button" und tabIndex auf einen Container, der bereits Checkbox und Button enthält, und
// bringt ohne KeyboardSensor keinen Nutzen.
function DraggableTile({
  documentId,
  ids,
  disabled,
  children,
}: {
  documentId: number;
  ids: number[];
  disabled: boolean;
  children: ReactNode;
}) {
  const drag = useDraggable({
    id: documentDragId(documentId),
    data: { ids },
    disabled,
  });
  return (
    <div
      ref={drag.setNodeRef}
      {...drag.listeners}
      className={drag.isDragging ? "opacity-50" : undefined}
    >
      {children}
    </div>
  );
}

// Ablageziel um eine Sammlungs- oder Kategoriezeile. Die Zeile selbst bleibt unverändert. Der Hook
// braucht eine eigene Komponente, weil er nicht innerhalb eines `.map()`-Callbacks laufen darf.
function DroppableRow({
  dropId,
  disabled,
  children,
}: {
  dropId: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const drop = useDroppable({ id: dropId, disabled });
  return (
    <div
      ref={drop.setNodeRef}
      className={`rounded-md ${drop.isOver ? "bg-white/10 ring-1 ring-inset ring-white/35" : ""}`}
    >
      {children}
    </div>
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
  const [activeDragIds, setActiveDragIds] = useState<number[] | null>(null);
  const [panelWidth, setPanelWidth] = useState(PANEL_MIN_WIDTH);

  // Ziehen beginnt erst ab 6 px Mausbewegung — darunter bleibt es ein Klick. Derselbe Wert wie im
  // Wiki-Baum, damit Markieren (Einfachklick) und Öffnen (Doppelklick) der Kachel unverändert bleiben.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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
  const { documents, total, loadedCount, loading, loadingMore, isComplete, error } =
    useDocumentLibrary(filter);
  const { folders, createFolder, updateFolder, deleteFolder } = useFolders();
  const { categories, createCategory, updateCategory, deleteCategory } =
    useCategories();
  const { tags } = useTags("dms");
  const {
    uploadDocument,
    refreshDocuments,
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

  // Ablage-Kontext des Uploads: Sammlung und Kategorie der aktuellen Ansicht sind das ZIEL der
  // hochgeladenen Datei. Label, Typ, Endung und Suche sind dagegen bloße Einschränkungen — sie
  // taugen nicht als Ziel und würden die neue Datei nur sofort wieder verstecken.
  const uploadFolder =
    typeof folderScope === "number" ? folderScope : undefined;
  const uploadCategory = categoryFilter !== "" ? categoryFilter : undefined;
  const hasNarrowingFilter =
    tagFilter !== "" || typeFilter !== "" || extFilter !== "" || search.trim() !== "";

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
  //
  // Gate ist `isComplete` und NICHT `loading || loadingMore`: Zwischen zwei Blöcken des progressiven
  // Nachladens sind beide kurz false. Kommt die gewählte Endung erst in einem späteren Block vor,
  // würde der Filter dort fälschlich zurückgesetzt.
  useEffect(() => {
    if (!isComplete || extFilter === "") {
      return;
    }
    const stillAvailable =
      extFilter === EXT_NONE ? extInfo.hasNone : extInfo.list.includes(extFilter);
    if (!stillAvailable) {
      setExtFilter("");
    }
  }, [extFilter, extInfo, isComplete]);

  // Wer aus der Ansicht fällt, verliert seine Markierung. Sonst zählt die Auswahl-Leiste
  // unsichtbare Kacheln mit, sie lassen sich nicht mehr einzeln abwählen — und ein Drag einer
  // sichtbaren Kachel zöge sie stillschweigend mit (verborgene Schreibwirkung).
  //
  // Das Gate ist `isComplete` und ausdrücklich NICHT `loading || loadingMore`: Zwischen zwei
  // Blöcken des progressiven Nachladens sind beide kurz false, obwohl noch Dokumente fehlen —
  // dort würde die Auswahl fälschlich gelöscht.
  useEffect(() => {
    if (!isComplete) {
      return;
    }
    const visibleIds = new Set(visibleDocuments.map((doc) => doc.id));
    setSelectedIds((current) => {
      if (current.size === 0) {
        return current;
      }
      const next = new Set<number>();
      for (const id of current) {
        if (visibleIds.has(id)) {
          next.add(id);
        }
      }
      // Teilmenge von `current` — gleiche Größe heißt unverändert. Kein neuer State, keine Schleife.
      return next.size === current.size ? current : next;
    });
  }, [isComplete, visibleDocuments]);

  // Inhaltsgesteuerte Breite der Verwaltungsspalte: so breit, dass der längste Sammlungs- oder
  // Kategoriename ausgeschrieben bleibt, geklemmt auf einen Korridor. Erst nach dem Laden der
  // Schriften messen, sonst rechnet die Canvas mit einem Fallback-Font und liefert zu schmal.
  useEffect(() => {
    let cancelled = false;
    const rows: PanelRow[] = [
      ...folders.map((folder) => ({
        label: folder.name,
        indent: folder.parentId ? 12 : 0,
      })),
      ...categories.map((category) => ({ label: category.name })),
    ];
    const applyWidth = () => {
      if (cancelled) {
        return;
      }
      setPanelWidth(computePanelWidth(rows, canWrite));
    };
    void (window.document.fonts?.ready ?? Promise.resolve())
      .then(applyWidth)
      .catch(applyWidth);
    return () => {
      cancelled = true;
    };
  }, [folders, categories, canWrite]);

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

  // Zielangabe für den Abschluss-Toast. Der Upload schreibt eine Zuordnung, die aus dem
  // Ansichtszustand abgeleitet ist — damit das keine verborgene Schreibwirkung wird, muss das Ziel
  // ausdrücklich benannt werden.
  const uploadTargetLabel = useMemo(() => {
    const folderName =
      uploadFolder !== undefined
        ? folders.find((folder) => folder.id === uploadFolder)?.name
        : undefined;
    const categoryName =
      uploadCategory !== undefined
        ? categories.find((category) => category.id === uploadCategory)?.name
        : undefined;
    const targets: string[] = [];
    if (folderName) {
      targets.push(`Sammlung „${folderName}"`);
    }
    if (categoryName) {
      targets.push(`Kategorie „${categoryName}"`);
    }
    return targets.length > 0 ? `Einsortiert in ${targets.join(" · ")}` : undefined;
  }, [uploadFolder, uploadCategory, folders, categories]);

  // Der Uploader lädt mehrere Dateien sequenziell hoch. Erfolge werden gezählt statt je Datei
  // gemeldet — bei 20 Dateien wären 20 Toasts unbrauchbar. Fehler meldet `run` weiterhin einzeln.
  const uploadBatch = useRef({ succeeded: 0 });

  const handleUpload = async (file: File): Promise<boolean> => {
    const ok = await run(() => uploadDocument(file, uploadFolder, uploadCategory));
    if (ok) {
      uploadBatch.current.succeeded += 1;
    }
    return ok;
  };

  // Einmal je Upload-Vorgang, nicht je Datei: einschränkende Filter räumen (sonst wäre die frisch
  // hochgeladene Datei sofort unsichtbar), EINMAL nachladen, EINEN Toast zeigen. Ohne einen einzigen
  // Erfolg geschieht nichts — dann bleiben auch die Filter stehen.
  const handleUploadBatchComplete = async () => {
    const succeeded = uploadBatch.current.succeeded;
    uploadBatch.current.succeeded = 0;
    if (succeeded === 0) {
      return;
    }
    if (hasNarrowingFilter) {
      setTagFilter("");
      setTypeFilter("");
      setExtFilter("");
      setSearch("");
    }
    await refreshDocuments();
    showToast({
      tone: "success",
      title:
        succeeded === 1
          ? "Dokument hochgeladen"
          : `${succeeded} Dokumente hochgeladen`,
      message: uploadTargetLabel,
    });
  };

  const handleBulkDownload = async () => {
    const ids = [...selectedIds];
    await run(async () => {
      const blob = await downloadZip(ids);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = "dokumente.zip";
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  // Ein Klick auf eine Sammlung oder Kategorie filtert — immer. Zugewiesen wird ausschließlich per
  // Drag & Drop. Damit tut dieselbe Zeile nicht je nach unsichtbarem Auswahlzustand zwei
  // verschiedene Dinge (der frühere Doppelmodus).
  const handleNavFolderClick = (folderId: number) => {
    setFolderScope(folderId);
  };

  const handleNavCategoryClick = (categoryId: number) => {
    setCategoryFilter((current) => (current === categoryId ? "" : categoryId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const ids = dragIdsFromData(event.active.data.current);
    setActiveDragIds(ids.length > 0 ? ids : null);
  };

  // Ablegen auf einer Sammlung sortiert ein, auf einer Kategorie weist zu. Ein Drop ins Leere oder
  // auf „Alle Dokumente"/„Nicht einsortiert" liefert kein Ziel und bleibt folgenlos. Ohne
  // Schreibrecht passiert nichts — die API bleibt die eigentliche Sicherheitsgrenze.
  const handleDragEnd = (event: DragEndEvent) => {
    const ids = dragIdsFromData(event.active.data.current);
    setActiveDragIds(null);
    const target = parseDropTarget(event.over?.id);
    if (!target || !canWrite || ids.length === 0) {
      return;
    }
    if (target.kind === "folder") {
      void run(
        () => addToFolderBulk(target.id, ids),
        ids.length === 1 ? "Dokument einsortiert" : "Dokumente einsortiert",
      );
    } else {
      void run(() => assignCategoryBulk(target.id, ids), "Kategorie zugewiesen");
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

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragIds(null)}
      >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Verwaltung: Sammlungen & Kategorien */}
        <DocumentSidePanel
          side="left"
          title="Verwaltung"
          storageKey="ui.documents.folders.collapsed"
          railIcon={FolderArchive}
          widthPx={panelWidth}
        >
          {selectionActive ? (
            <div className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs text-white/80">
              {selectedIds.size} ausgewählt — auf eine Sammlung oder Kategorie
              ziehen, um sie zuzuweisen.
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
            {folders.length > 0 ? (
              <div className="flex max-h-[40vh] flex-col gap-1 overflow-y-auto">
                {folders.map((folder) =>
                  editingFolderId === folder.id ? (
                    <div key={folder.id}>
                      {editRow(() => saveFolderName(folder))}
                    </div>
                  ) : (
                    <DroppableRow
                      key={folder.id}
                      dropId={folderDropId(folder.id)}
                      disabled={!canWrite}
                    >
                      <div
                        className="group flex items-center gap-1"
                        style={{ paddingLeft: folder.parentId ? 12 : 0 }}
                      >
                        <button
                          type="button"
                          onClick={() => handleNavFolderClick(folder.id)}
                          className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                            folderScope === folder.id
                              ? "bg-white/10 font-semibold text-white"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <FolderArchive size={16} className="shrink-0" />
                          <span className="min-w-0 break-words">
                            {folder.name}
                          </span>
                        </button>
                        {canWrite ? (
                          <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
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
                    </DroppableRow>
                  ),
                )}
              </div>
            ) : null}
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
            {categories.length > 0 ? (
              <div className="flex max-h-[40vh] flex-col gap-1 overflow-y-auto">
                {categories.map((category) =>
                  editingCategoryId === category.id ? (
                    <div key={category.id}>
                      {editRow(() => saveCategoryName(category))}
                    </div>
                  ) : (
                    <DroppableRow
                      key={category.id}
                      dropId={categoryDropId(category.id)}
                      disabled={!canWrite}
                    >
                      <div className="group flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleNavCategoryClick(category.id)}
                          className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition ${
                            categoryFilter === category.id
                              ? "bg-white/10 font-semibold text-white"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="min-w-0 break-words">
                            {category.name}
                          </span>
                        </button>
                        {canWrite ? (
                          <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
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
                    </DroppableRow>
                  ),
                )}
              </div>
            ) : null}
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
              onUpload={handleUpload}
              onBatchComplete={handleUploadBatchComplete}
              size="sm"
              tone="dark"
            />
          ) : null}
        </DocumentSidePanel>

        {/* Bibliothek */}
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Das Suchfeld bekommt eine feste Breite statt `flex-1`: sonst frisst es den ganzen
                Restplatz und drängt die Dropdowns in den Umbruch. Die Dropdowns halten eine
                lesbare Mindestbreite, die Kachelgröße sitzt rechts. */}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Dokumente durchsuchen…"
              className="w-full min-w-[180px] rounded-md border border-line bg-white px-3 py-2 text-sm text-ink sm:w-64"
            />
            <select
              value={tagFilter}
              onChange={(event) =>
                setTagFilter(
                  event.target.value ? Number(event.target.value) : "",
                )
              }
              className="min-w-[8.5rem] rounded-md border border-line bg-white px-2 py-2 text-sm text-ink"
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
              className="min-w-[8.5rem] rounded-md border border-line bg-white px-2 py-2 text-sm text-ink"
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
              className="min-w-[8.5rem] rounded-md border border-line bg-white px-2 py-2 text-sm text-ink disabled:opacity-50"
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
              className="ml-auto flex items-center gap-0.5 rounded-md border border-line bg-white p-0.5"
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
                Auf eine Sammlung oder Kategorie links ziehen zum Zuweisen.
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
                <DraggableTile
                  key={doc.id}
                  documentId={doc.id}
                  ids={dragDocumentIds(doc.id, selectedIds)}
                  disabled={!canWrite}
                >
                  <DocumentTile
                    document={doc}
                    isSelected={selectedIds.has(doc.id)}
                    onToggleSelect={() => toggleSelect(doc.id)}
                    onOpen={() => setOpenedId(doc.id)}
                    canDelete={canDelete}
                    onDelete={() => handleDeleteDocument(doc)}
                  />
                </DraggableTile>
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

        <DragOverlay>
          {activeDragIds ? (
            <div className="rounded-md bg-steel-800 px-3 py-2 text-sm font-medium text-white shadow-panel">
              {activeDragIds.length === 1
                ? "1 Dokument"
                : `${activeDragIds.length} Dokumente`}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
