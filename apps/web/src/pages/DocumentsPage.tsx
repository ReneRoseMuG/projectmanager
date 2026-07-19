import type {
  Attachment,
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { AttachmentUploader } from "../components/attachments/AttachmentUploader";
import { useSearchParams } from "react-router-dom";
import { describeAttachmentType } from "../components/attachments/attachmentTypes";
import { DocumentPreviewBody } from "../components/attachments/DocumentPreviewBody";
import { DocumentSidePanel } from "../components/attachments/DocumentSidePanel";
import { DocumentDuplicateCheck } from "../components/documents/DocumentDuplicateCheck";
import { DocumentTagPills } from "../components/documents/DocumentTagPills";
import {
  documentFolderDescendantIds,
  flattenDocumentFolders,
} from "../components/documents/documentFolderTree";
import {
  parseDocumentLibraryUrl,
  updateDocumentLibraryUrl,
} from "../components/documents/documentLibraryUrl";
import { EmptyState } from "../components/ui/EmptyState";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { ItemRow } from "../components/ui/ItemRow";
import { LoadMoreIndicator } from "../components/ui/LoadMoreIndicator";
import { TagPicker } from "../components/tags/TagPicker";
import { useToast } from "../components/ui/ToastProvider";
import {
  useDocumentActions,
  useDocumentLibrary,
  useFolders,
} from "../hooks/useDocuments";
import { useHasPermission } from "../hooks/usePermissions";
import { useTags } from "../hooks/useTags";
import { toQueryError } from "../queries/queryErrors";
import type { DocumentLibraryFilter } from "../api/documents";
import { assetUrl } from "../api/client";

// Detail-Panel-Breite (MS-75): Pre-Render-Kalkulation beim Öffnen eines Dokuments. Die
// Breite ergibt sich aus der verfügbaren Zeilenbreite minus Mindestbreite der Dateiliste,
// gedeckelt auf die Breite des Dokuments (Bild: naturalWidth). Der linke Panelrand ist
// zusätzlich per Maus ziehbar.
const MIN_CARD_WIDTH = 380;
const MIN_DETAIL_WIDTH = 320;
const NON_IMAGE_MAX_WIDTH = 1000;
const ROW_GAP = 24;
const PANEL_CHROME = 28;

function clampDetailWidth(value: number, max: number): number {
  return Math.max(MIN_DETAIL_WIDTH, Math.min(value, max));
}

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
  const { confirm } = useConfirm();

  const [searchParams, setSearchParams] = useSearchParams();
  const setFilterParam = useCallback((
    key: "folder" | "tags" | "type" | "q",
    value: string | null,
    replace = false,
  ) => {
    const next = updateDocumentLibraryUrl(searchParams, key, value);
    setSearchParams(next, { replace });
  }, [searchParams, setSearchParams]);

  const { folderScope, tagFilters, typeFilter, search } = useMemo(
    () => parseDocumentLibraryUrl(searchParams),
    [searchParams],
  );

  const setFolderScope = (scope: number | "unsorted" | "all") =>
    setFilterParam("folder", scope === "all" ? null : String(scope));
  const setTypeFilter = (type: string) => setFilterParam("type", type || null);
  const setSearch = (value: string) => setFilterParam("q", value || null, true);
  const setTagFilters = (tagIds: number[]) =>
    setFilterParam("tags", tagIds.length > 0 ? [...new Set(tagIds)].sort((left, right) => left - right).join(",") : null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingFolderParentId, setEditingFolderParentId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const filter = useMemo<DocumentLibraryFilter>(() => {
    const next: DocumentLibraryFilter = {};
    if (folderScope !== "all") {
      next.folder = folderScope;
    }
    if (tagFilters.length > 0) {
      next.tags = tagFilters;
    }
    if (typeFilter) {
      next.type = typeFilter;
    }
    if (search.trim()) {
      next.q = search.trim();
    }
    return next;
  }, [folderScope, tagFilters, typeFilter, search]);

  // Progressives Nachladen: der erste Block erscheint sofort, weitere Blöcke laden automatisch
  // nach. Ein Filter-/Suchwechsel ändert den queryKey und startet das Laden von vorne.
  const { documents, total, loadedCount, loading, loadingMore, error } =
    useDocumentLibrary(filter);
  const { folders, createFolder, updateFolder, deleteFolder } = useFolders();
  const folderTree = useMemo(() => flattenDocumentFolders(folders), [folders]);
  const { tags } = useTags("dms");
  const {
    uploadDocument,
    removeFromLibrary,
    deleteDocumentPermanently,
    setTags,
    updateMetadata,
    setDocumentFolder,
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

  const removeDocumentLibraryVisibility = async (document: Attachment) => {
    if (document.owners.length === 0) {
      showToast({
        tone: "warn",
        title: "Dokument kann nicht nur aus der Bibliothek entfernt werden",
        message: "Ohne Owner-Verknüpfung würde eine unsichtbare, nicht erreichbare Datei verbleiben. Bitte löschen Sie die Datei stattdessen endgültig."
      });
      return;
    }
    const approved = await confirm({
      title: "Aus der Dokumentenbibliothek entfernen?",
      body: `„${documentTitle(document)}“ wird nur aus der zentralen Bibliothek entfernt. ${document.owners.length} Owner-Verknüpfung(en), die physische Datei und der Download bleiben bestehen.`,
      severity: "warn",
      confirmLabel: "Aus Bibliothek entfernen"
    });
    if (!approved) {
      return;
    }
    try {
      await removeFromLibrary(document.id, document.version);
      if (selectedId === document.id) {
        setSelectedId(null);
      }
      showToast({ tone: "success", title: "Aus der Dokumentenbibliothek entfernt" });
    } catch (mutationError) {
      showToast({ tone: "error", title: "Dokument konnte nicht aus der Bibliothek entfernt werden", message: toQueryError(mutationError) ?? "Unbekannter Fehler" });
    }
  };

  const deleteDocumentForever = async (document: Attachment) => {
    const approved = await confirm({
      title: "Dokument endgültig löschen?",
      body: `„${documentTitle(document)}“ wird zusammen mit der physischen Datei, allen Owner-Verknüpfungen sowie allen DMS-Zuordnungen dauerhaft entfernt.`,
      severity: "danger",
      confirmLabel: "Endgültig löschen",
      requireCheck: "Ich bestätige das endgültige Löschen."
    });
    if (!approved) {
      return;
    }
    try {
      await deleteDocumentPermanently(document.id, document.version);
      if (selectedId === document.id) {
        setSelectedId(null);
      }
      showToast({ tone: "success", title: "Dokument endgültig gelöscht" });
    } catch (mutationError) {
      showToast({ tone: "error", title: "Dokument konnte nicht endgültig gelöscht werden", message: toQueryError(mutationError) ?? "Unbekannter Fehler" });
    }
  };
  const uploadFolder =
    typeof folderScope === "number" ? folderScope : undefined;
  const hasActiveFilters = folderScope !== "all" || tagFilters.length > 0 || Boolean(typeFilter) || Boolean(search);

  // Aktuelle Dokumentliste als Ref, damit die Breiten-Kalkulation nur beim Öffnen eines
  // (anderen) Dokuments läuft – nicht bei jedem progressiven Nachladen.
  const documentsRef = useRef(documents);
  documentsRef.current = documents;
  const rowRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLElement>(null);
  const manualResizeRef = useRef(false);
  const [detailWidth, setDetailWidth] = useState<number | null>(null);

  const getMaxDetailWidth = useCallback(() => {
    const row = rowRef.current;
    if (!row) {
      return NON_IMAGE_MAX_WIDTH;
    }
    const leftWidth = leftPanelRef.current?.offsetWidth ?? 280;
    const available = row.clientWidth - leftWidth - 2 * ROW_GAP;
    return Math.max(MIN_DETAIL_WIDTH, available - MIN_CARD_WIDTH);
  }, []);

  // Pre-Render-Kalkulation: beim Öffnen die ideale Panelbreite bestimmen. Bilder werden
  // kurz vorgeladen, um die natürliche Breite zu kennen; bis dahin gilt die Maximalbreite.
  useEffect(() => {
    if (selectedId == null) {
      return;
    }
    const doc = documentsRef.current.find((entry) => entry.id === selectedId);
    if (!doc) {
      return;
    }
    manualResizeRef.current = false;
    const max = getMaxDetailWidth();
    if (describeAttachmentType(doc).family === "image") {
      setDetailWidth(clampDetailWidth(max, max));
      const probe = new Image();
      probe.onload = () => {
        if (manualResizeRef.current) {
          return;
        }
        const docWidth = probe.naturalWidth
          ? probe.naturalWidth + PANEL_CHROME
          : max;
        setDetailWidth(clampDetailWidth(docWidth, max));
      };
      probe.src = assetUrl(doc.url);
    } else {
      setDetailWidth(clampDetailWidth(NON_IMAGE_MAX_WIDTH, max));
    }
  }, [selectedId, getMaxDetailWidth]);

  // Fensterbreite verändert die verfügbare Breite → aktuelle Breite nachklemmen.
  useEffect(() => {
    function handleWindowResize() {
      setDetailWidth((current) =>
        current == null
          ? current
          : clampDetailWidth(current, getMaxDetailWidth()),
      );
    }
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [getMaxDetailWidth]);

  const handleDetailResizeStart = useCallback(
    (event: ReactMouseEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const max = getMaxDetailWidth();
      const startWidth = detailWidth ?? max;
      manualResizeRef.current = true;
      document.body.style.userSelect = "none";
      function onMove(moveEvent: MouseEvent) {
        setDetailWidth(
          clampDetailWidth(startWidth + (startX - moveEvent.clientX), max),
        );
      }
      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = "";
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [detailWidth, getMaxDetailWidth],
  );

  const startEditFolder = (folder: AttachmentFolder) => {
    setEditName(folder.name);
    setEditingFolderId(folder.id);
    setEditingFolderParentId(folder.parentId);
  };

  const cancelEdit = () => {
    setEditingFolderId(null);
    setEditingFolderParentId(null);
    setEditName("");
  };

  const saveFolderName = (folder: AttachmentFolder) => {
    const name = editName.trim();
    if (name && (name !== folder.name || editingFolderParentId !== folder.parentId)) {
      void run(
        () =>
          updateFolder(folder.id, {
            name,
            parentId: editingFolderParentId,
            expectedVersion: folder.version,
          }),
        "Sammlung aktualisiert",
      );
    }
    cancelEdit();
  };

  const handleDeleteFolder = async (folder: AttachmentFolder) => {
    if (folder.childCount > 0 || folder.directDocumentCount > 0) {
      showToast({
        tone: "warn",
        title: "Sammlung ist nicht leer",
        message: `${folder.childCount} direkte Untersammlung(en) und ${folder.directDocumentCount} direkt zugeordnete Dokument(e) müssen zuerst verschoben oder entfernt werden.`,
      });
      return;
    }
    const approved = await confirm({
      title: "Leere Sammlung löschen?",
      body: `„${folder.name}“ wird endgültig gelöscht. Die Sammlung enthält keine Dokumente oder Untersammlungen.`,
      severity: "danger",
      confirmLabel: "Sammlung löschen",
    });
    if (!approved) {
      return;
    }
    if (folderScope === folder.id) {
      setFolderScope("all");
    }
    await run(() => deleteFolder(folder.id, folder.version), "Sammlung gelöscht");
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

  const folderEditRow = (folder: AttachmentFolder, depth: number) => {
    const excludedParentIds = documentFolderDescendantIds(folders, folder.id);
    excludedParentIds.add(folder.id);
    return (
      <div className="flex flex-col gap-1" style={{ paddingLeft: depth * 12 }}>
        {editRow(() => saveFolderName(folder))}
        <select
          value={editingFolderParentId ?? ""}
          onChange={(event) => setEditingFolderParentId(event.target.value ? Number(event.target.value) : null)}
          className="mx-1 min-w-0 rounded-md border border-white/15 bg-steel-900/50 px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Übergeordnete Sammlung"
        >
          <option value="" className="text-ink">Keine übergeordnete Sammlung</option>
          {folderTree
            .filter((item) => !excludedParentIds.has(item.folder.id))
            .map((item) => (
              <option key={item.folder.id} value={item.folder.id} className="text-ink">
                {item.path}
              </option>
            ))}
        </select>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Dokumente</h1>
        <p className="text-sm text-steel-500">
          Zentrale Bibliothek für alle Anhänge – über Sammlungen und Tags schnell auffindbar.
        </p>
      </header>

      <div ref={rowRef} className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Hauptnavigation: Sammlungen und Tags */}
        <DocumentSidePanel
          ref={leftPanelRef}
          side="left"
          title="Verwaltung"
          storageKey="ui.documents.folders.collapsed"
          railIcon={FolderArchive}
        >
          <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-2">
            <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
              Sammlungen
            </span>
            {scopeButton("all", "Alle Dokumente", <Layers size={16} />)}
            {scopeButton("unsorted", "Nicht einsortiert", <Inbox size={16} />)}
            {folders.length > 0 ? (
              <div className="my-1 border-t border-white/10" />
            ) : null}
            {folderTree.map(({ folder, depth, path }) =>
              editingFolderId === folder.id ? (
                <div key={folder.id}>
                  {folderEditRow(folder, depth)}
                </div>
              ) : (
                <div
                  key={folder.id}
                  className="group flex items-center gap-1"
                  style={{ paddingLeft: depth * 12 }}
                >
                  <button
                    type="button"
                    onClick={() => setFolderScope(folder.id)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                      folderScope === folder.id
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <FolderArchive size={16} />
                    <span className="truncate" title={path}>{folder.name}</span>
                  </button>
                  {canWrite || canDelete ? (
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      {canWrite ? (
                        <button
                          type="button"
                          onClick={() => startEditFolder(folder)}
                          className="rounded-md p-1 text-white/45 hover:bg-white/10 hover:text-white"
                          title="Umbenennen oder verschieben"
                        >
                          <Pencil size={14} />
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => void handleDeleteFolder(folder)}
                          className="rounded-md p-1 text-white/45 hover:bg-crimson/20 hover:text-crimson"
                          title="Löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ),
            )}
            {typeof folderScope === "number" ? (
              <p className="px-3 py-1 text-xs leading-5 text-white/50" role="note">
                Die Auswahl enthält auch Dokumente aus allen Untersammlungen.
              </p>
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
              Tags
            </span>
            {tags.length === 0 ? (
              <span className="px-3 py-1 text-xs text-white/40">
                Noch keine Tags.
              </span>
            ) : null}
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {tags.map((tag) => {
                const selected = tagFilters.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`Dokumente mit Tag ${tag.name} ${selected ? "nicht mehr filtern" : "filtern"}`}
                    onClick={() => setTagFilters(
                      selected ? tagFilters.filter((id) => id !== tag.id) : [...tagFilters, tag.id]
                    )}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/30"
                      style={{ backgroundColor: tag.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                    {selected ? <Check size={14} aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
            {tagFilters.length > 0 ? (
              <button
                type="button"
                onClick={() => setTagFilters([])}
                className="mt-1 self-start px-3 py-1 text-xs font-medium text-white/60 hover:text-white"
              >
                Tagfilter zurücksetzen
              </button>
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
            {canWrite ? <DocumentDuplicateCheck /> : null}
          </div>

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2" aria-label="Aktive Dokumentfilter">
              <span className="text-xs font-semibold uppercase tracking-wide text-steel-500">Aktiv</span>
              {folderScope !== "all" ? (
                <button type="button" onClick={() => setFolderScope("all")} className="flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs text-steel-600">
                  Sammlung: {folderScope === "unsorted" ? "Ohne Sammlung" : folderTree.find((item) => item.folder.id === folderScope)?.path ?? folderScope}
                  <X size={12} />
                </button>
              ) : null}
              {tagFilters.map((tagId) => (
                <button key={tagId} type="button" onClick={() => setTagFilters(tagFilters.filter((id) => id !== tagId))} className="flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs text-steel-600">
                  Tag: {tags.find((tag) => tag.id === tagId)?.name ?? tagId}
                  <X size={12} />
                </button>
              ))}
              {typeFilter ? (
                <button type="button" onClick={() => setTypeFilter("")} className="flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs text-steel-600">
                  Typ: {typeFilter}
                  <X size={12} />
                </button>
              ) : null}
              {search ? (
                <button type="button" onClick={() => setSearch("")} className="flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs text-steel-600">
                  Suche: {search}
                  <X size={12} />
                </button>
              ) : null}
              <button type="button" onClick={() => setSearchParams(new URLSearchParams())} className="text-xs font-medium text-crimson hover:underline">
                Alle zurücksetzen
              </button>
            </div>
          ) : null}

          {error ? (
            <EmptyState
              icon={<FileText size={28} />}
              title="Dokumente konnten nicht geladen werden"
              body={error}
              tone="tangerine"
            />
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white p-8 text-sm text-steel-500" role="status" aria-live="polite">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-steel-300 border-t-steel-600" aria-hidden="true" />
              Dokumente werden geladen…
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} />}
              title={hasActiveFilters ? "Keine Treffer" : "Dokumentenbibliothek ist leer"}
              body={hasActiveFilters
                ? "Kein Dokument erfüllt alle aktiven Filter. Entfernen Sie einzelne Filter oder setzen Sie die Auswahl zurück."
                : "Laden Sie ein Dokument hoch oder veröffentlichen Sie einen Anhang in der Bibliothek."}
              actions={hasActiveFilters ? [{ label: "Alle Filter zurücksetzen", onClick: () => setSearchParams(new URLSearchParams()) }] : undefined}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map((document) => (
                  <ItemRow
                    key={document.id}
                    title={documentTitle(document)}
                    description={document.description ?? undefined}
                    onOpen={() => setSelectedId(document.id)}
                    openOnClick
                    selected={document.id === selectedId}
                    className="max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:gap-2"
                    pills={
                      <DocumentTagPills tags={document.tags ?? []} />
                    }
                    meta={<DocumentMeta document={document} />}
                    metaClassName="w-32 max-sm:w-auto"
                    pillsClassName="w-44 justify-start max-sm:col-span-full max-sm:w-full"
                    actionsClassName="w-24"
                    actions={
                      <div className="flex items-center gap-1">
                        <a
                          href={assetUrl(`${document.url}?download=true`)}
                          download
                          className="rounded-md p-1.5 text-steel-500 hover:bg-steel-50"
                          title="Herunterladen"
                        >
                          <Download size={16} />
                        </a>
                        {canWrite ? (
                          <button
                            type="button"
                            onClick={() => void removeDocumentLibraryVisibility(document)}
                            className="rounded-md p-1.5 text-steel-500 hover:bg-tangerine/10 hover:text-tangerine"
                            title={document.owners.length === 0 ? "Ownerloses Dokument: nur endgültiges Löschen möglich" : "Aus der Dokumentenbibliothek entfernen"}
                            aria-label="Aus der Dokumentenbibliothek entfernen"
                          >
                            <X size={16} />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => void deleteDocumentForever(document)}
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

          {!error && !loading ? (
            <LoadMoreIndicator
              loadedCount={loadedCount}
              total={total}
              loadingMore={loadingMore}
            />
          ) : null}
        </section>

        {selected ? (
        <DocumentDetailPanel
          key={selected.id}
          document={selected}
          widthPx={detailWidth ?? undefined}
          onResizeStart={handleDetailResizeStart}
          folders={folders}
          canWrite={canWrite}
          onClose={() => setSelectedId(null)}
          onSetTags={(next) =>
            run(
              () =>
                setTags(
                  selected.id,
                  next.map((tag) => tag.id),
                  selected.version,
                ),
              undefined,
            )
          }
          onSetFolder={(folderId) =>
            run(
              () => setDocumentFolder(selected.id, folderId, selected.version),
              folderId === null ? "Aus Sammlung entfernt" : "Direkte Sammlung aktualisiert",
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
        ) : (
          <DocumentSidePanel
            side="right"
            title="Details"
            storageKey="ui.documents.detail.collapsed"
            railIcon={FileText}
            widthPx={detailWidth ?? undefined}
            onResizeStart={handleDetailResizeStart}
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
              <FileText size={28} className="text-white/25" />
              <p className="text-sm font-medium text-white/60">
                Kein Dokument ausgewählt
              </p>
              <p className="text-xs text-white/40">
                Doppelklick auf ein Dokument öffnet hier die Details.
              </p>
            </div>
          </DocumentSidePanel>
        )}
      </div>
    </div>
  );
}

interface DocumentDetailPanelProps {
  document: Attachment;
  widthPx?: number;
  onResizeStart?: (event: ReactMouseEvent) => void;
  folders: AttachmentFolder[];
  canWrite: boolean;
  onClose: () => void;
  onSetTags: (tags: Tag[]) => void;
  onSetFolder: (folderId: number | null) => void;
  onSaveMetadata: (input: {
    displayName: string | null;
    description: string | null;
  }) => void;
}

function DocumentDetailPanel({
  document,
  widthPx,
  onResizeStart,
  folders,
  canWrite,
  onClose,
  onSetTags,
  onSetFolder,
  onSaveMetadata,
}: DocumentDetailPanelProps) {
  const [displayName, setDisplayName] = useState(document.displayName ?? "");
  const [description, setDescription] = useState(document.description ?? "");
  const documentFolder = document.folder ?? document.folders?.[0] ?? null;
  const folderTree = flattenDocumentFolders(folders);

  return (
    <DocumentSidePanel
      side="right"
      title={document.displayName ?? document.originalName}
      storageKey="ui.documents.detail.collapsed"
      railIcon={FileText}
      widthPx={widthPx}
      onResizeStart={onResizeStart}
      headerActions={
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 shrink-0 items-center rounded-md px-2 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          Schließen
        </button>
      }
    >
      <p className="text-xs text-white/50">
        Originaldatei: {document.originalName}
      </p>

      <section className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/55">
          Vorschau
        </span>
        <DocumentPreviewBody attachment={document} />
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/55">
          Metadaten
        </span>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Anzeigename"
          disabled={!canWrite}
          className="rounded-md border border-white/15 bg-steel-900/50 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Beschreibung"
          disabled={!canWrite}
          rows={3}
          className="rounded-md border border-white/15 bg-steel-900/50 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
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
            className="self-start rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Metadaten speichern
          </button>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/55">
          Sammlungen
        </span>
        <div className="flex flex-wrap gap-1">
          {documentFolder ? (
            <span
              className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-xs text-white"
            >
              <FolderArchive size={12} />
              {folderTree.find((item) => item.folder.id === documentFolder.id)?.path ?? documentFolder.name}
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => onSetFolder(null)}
                  className="text-white/50 hover:text-crimson"
                  title="Aus Sammlung entfernen"
                >
                  <X size={12} />
                </button>
              ) : null}
            </span>
          ) : (
            <span className="text-xs text-white/40">In keiner Sammlung.</span>
          )}
        </div>
        {canWrite && folders.length > 0 ? (
          <select
            value={documentFolder?.id ?? ""}
            onChange={(event) => {
              onSetFolder(event.target.value ? Number(event.target.value) : null);
            }}
            className="rounded-md border border-white/15 bg-steel-900/50 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <option value="" className="text-ink">
              Ohne Sammlung
            </option>
            {folderTree.map((item) => (
              <option key={item.folder.id} value={item.folder.id} className="text-ink">
                {item.path}
              </option>
            ))}
          </select>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/55">
          Labels
        </span>
        <TagPicker
          selected={(document.tags ?? []) as Tag[]}
          onChange={onSetTags}
          domain="dms"
          tone="dark"
        />
      </section>

    </DocumentSidePanel>
  );
}
