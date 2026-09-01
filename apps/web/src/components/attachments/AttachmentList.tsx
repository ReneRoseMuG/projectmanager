import type {
  Attachment,
  AttachmentLocalEntry,
  ParentAttachmentFolder,
  ParentDocumentLink
} from "@taskmanager/shared-types";
import {
  ArrowUp,
  Download,
  File,
  Folder,
  FolderInput,
  FolderOpen,
  Grid2X2,
  Grid3X3,
  HardDrive,
  LayoutGrid,
  Link2,
  List,
  Plus,
  TableProperties,
  Trash2,
  Unlink,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { assetUrl } from "../../api/client";
import type { useAttachments } from "../../hooks/useAttachments";
import { useAttachmentLocalEntries } from "../../hooks/useAttachments";
import { errorMessageAsync } from "../../hooks/errors";
import { useDocumentLibrary } from "../../hooks/useDocuments";
import { useHasPermission } from "../../hooks/usePermissions";
import {
  attachmentActionLabels,
  attachmentViewModeLabels
} from "../../utils/domainLabels";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { LoadMoreIndicator } from "../ui/LoadMoreIndicator";
import { Select } from "../ui/Select";
import { useToast } from "../ui/ToastProvider";
import { AttachmentPreview } from "./AttachmentPreview";
import { describeAttachmentType } from "./attachmentTypes";
import { prettyBytes } from "./DocumentPreviewBody";

type AttachmentManager = ReturnType<typeof useAttachments>;
type AttachmentViewMode = keyof typeof attachmentViewModeLabels;

interface AttachmentListProps {
  manager: AttachmentManager;
}

const VIEW_MODE_STORAGE_KEY = "ui.attachments.viewMode";

const viewModes: ReadonlyArray<{
  value: AttachmentViewMode;
  icon: ReactNode;
}> = [
  { value: "list", icon: <List size={17} /> },
  { value: "details", icon: <TableProperties size={17} /> },
  { value: "small", icon: <Grid3X3 size={17} /> },
  { value: "medium", icon: <Grid2X2 size={17} /> },
  { value: "large", icon: <LayoutGrid size={17} /> }
];

function loadViewMode(): AttachmentViewMode {
  if (typeof localStorage === "undefined") {
    return "medium";
  }
  const value = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return value && value in attachmentViewModeLabels
    ? (value as AttachmentViewMode)
    : "medium";
}

function saveViewMode(mode: AttachmentViewMode): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }
}

function folderLabel(folder: ParentAttachmentFolder, foldersById: Map<number, ParentAttachmentFolder>): string {
  const labels = [folder.name];
  const seen = new Set([folder.id]);
  let parentId = folder.parentId;
  while (parentId !== null) {
    if (seen.has(parentId)) {
      break;
    }
    seen.add(parentId);
    const parent = foldersById.get(parentId);
    if (!parent) {
      break;
    }
    labels.unshift(parent.name);
    parentId = parent.parentId;
  }
  return labels.join(" / ");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sourceFolderId(source: string): number | null {
  return source.startsWith("folder:") ? Number(source.slice("folder:".length)) : null;
}

function sourceLocalFolderId(source: string): number | null {
  return source.startsWith("local:") ? Number(source.slice("local:".length)) : null;
}

function localParentPath(relativePath: string): string {
  const parts = relativePath.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function checkboxClassName(): string {
  return "h-4 w-4 rounded border-line text-steel-700 focus:ring-steel-500";
}

function DocumentLinkPicker({
  manager,
  folderId,
  onClose,
  onError
}: {
  manager: AttachmentManager;
  folderId: number | null;
  onClose: () => void;
  onError: (error: unknown) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const library = useDocumentLibrary(search.trim() ? { q: search.trim() } : {});
  const linkedDocumentIds = useMemo(
    () => new Set(manager.documentLinks.map((link) => link.document.id)),
    [manager.documentLinks]
  );

  const linkDocument = async (documentId: number) => {
    try {
      await manager.linkDocument({ documentId, folderId });
      onClose();
    } catch (error) {
      await onError(error);
    }
  };

  return (
    <div className="grid gap-3 rounded-lg border border-line bg-shell p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-steel-600" htmlFor="parent-document-search">
            DMS-Dokument suchen
          </label>
          <Input
            id="parent-document-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name oder Beschreibung"
          />
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>Schließen</Button>
      </div>
      {library.loading ? <p className="text-sm text-steel-500">Dokumente werden geladen …</p> : null}
      {!library.loading && library.documents.length === 0 ? (
        <p className="text-sm text-steel-500">Keine passenden DMS-Dokumente gefunden.</p>
      ) : null}
      <div className="grid max-h-64 gap-2 overflow-y-auto">
        {library.documents.map((document) => {
          const linked = linkedDocumentIds.has(document.id);
          return (
            <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{document.displayName ?? document.originalName}</p>
                <p className="truncate text-xs text-steel-500">{document.originalName}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={<Link2 size={15} />}
                disabled={linked}
                onClick={() => void linkDocument(document.id)}
              >
                {linked ? "Verknüpft" : "Verknüpfen"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AttachmentList({ manager }: AttachmentListProps) {
  const canWrite = useHasPermission("attachments", "write");
  const canDelete = useHasPermission("attachments", "delete");
  const canWriteDocuments = useHasPermission("documents", "write");
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<AttachmentViewMode>(loadViewMode);
  const [source, setSource] = useState("all");
  const [localPath, setLocalPath] = useState("");
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<Set<number>>(new Set());
  const [selectedLocalPaths, setSelectedLocalPaths] = useState<Set<string>>(new Set());
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showManualPath, setShowManualPath] = useState(false);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [manualPath, setManualPath] = useState("");
  const selectedFolderId = sourceFolderId(source);
  const selectedLocalFolderId = sourceLocalFolderId(source);
  const localEntries = useAttachmentLocalEntries(selectedLocalFolderId, localPath);
  const foldersById = useMemo(
    () => new Map(manager.parentFolders.map((folder) => [folder.id, folder])),
    [manager.parentFolders]
  );

  const displayedAttachments = useMemo(() => {
    if (source === "unfiled") {
      return manager.attachments.filter((attachment) => attachment.parentFolderId == null);
    }
    if (selectedFolderId !== null) {
      return manager.attachments.filter(
        (attachment) => attachment.parentFolderId === selectedFolderId
      );
    }
    return selectedLocalFolderId === null ? manager.attachments : [];
  }, [manager.attachments, selectedFolderId, selectedLocalFolderId, source]);

  const displayedDocumentLinks = useMemo(() => {
    if (selectedLocalFolderId !== null) {
      return [];
    }
    if (source === "unfiled") {
      return manager.documentLinks.filter((link) => link.folder === null);
    }
    if (selectedFolderId !== null) {
      return manager.documentLinks.filter((link) => link.folder?.id === selectedFolderId);
    }
    return manager.documentLinks;
  }, [manager.documentLinks, selectedFolderId, selectedLocalFolderId, source]);

  useEffect(() => {
    setSelectedAttachmentIds(new Set());
    setSelectedLocalPaths(new Set());
  }, [source, localPath]);

  const selectViewMode = (mode: AttachmentViewMode) => {
    setViewMode(mode);
    saveViewMode(mode);
  };

  const showError = async (title: string, error: unknown) => {
    showToast({
      tone: "error",
      title,
      message: await errorMessageAsync(error)
    });
  };

  const toggleAttachment = (id: number) => {
    setSelectedAttachmentIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleLocalFile = (relativePath: string) => {
    setSelectedLocalPaths((current) => {
      const next = new Set(current);
      if (next.has(relativePath)) {
        next.delete(relativePath);
      } else {
        next.add(relativePath);
      }
      return next;
    });
  };

  const selectedAttachments = manager.attachments.filter((attachment) =>
    selectedAttachmentIds.has(attachment.id)
  );
  const selectedPreviewAttachment =
    selectedAttachments.length === 1 ? selectedAttachments[0] : null;
  const selectedLocalFiles = [...selectedLocalPaths].map((relativePath) => ({
    folderId: selectedLocalFolderId as number,
    relativePath
  }));
  const selectedCount = selectedAttachments.length + selectedLocalFiles.length;

  const downloadArchive = async () => {
    try {
      const blob = await manager.downloadArchive(
        selectedAttachments.map((attachment) => attachment.id),
        selectedLocalFiles
      );
      downloadBlob(blob, "attachments.zip");
    } catch (error) {
      await showError("ZIP konnte nicht erstellt werden", error);
    }
  };

  const bulkDelete = async (attachments = selectedAttachments) => {
    const approved = await confirm({
      title: `${attachments.length} Datei(en) endgültig löschen?`,
      body: "Die exklusiven Parent-Anhänge und ihre physischen Dateien werden dauerhaft entfernt. DMS-Dokumente und lokale Ordnerquellen bleiben unverändert.",
      severity: "danger",
      confirmLabel: attachmentActionLabels.bulkDelete,
      requireCheck: "Ich bestätige das endgültige Löschen."
    });
    if (!approved) {
      return;
    }
    try {
      await manager.bulkDeleteAttachments(
        attachments.map((attachment) => ({
          id: attachment.id,
          expectedVersion: attachment.version
        }))
      );
      setSelectedAttachmentIds(new Set());
      showToast({ tone: "success", title: "Dateien endgültig gelöscht" });
    } catch (error) {
      await showError("Dateien konnten nicht gelöscht werden", error);
    }
  };

  const moveSelected = async (folderId: number | null) => {
    try {
      for (const attachment of selectedAttachments) {
        await manager.moveAttachment(attachment.id, {
          folderId,
          expectedVersion: attachment.version
        });
      }
      setSelectedAttachmentIds(new Set());
      showToast({ tone: "success", title: "Virtueller Ordner aktualisiert" });
    } catch (error) {
      await showError("Virtueller Ordner konnte nicht aktualisiert werden", error);
    }
  };

  const createVirtualFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      return;
    }
    try {
      const folder = await manager.createParentFolder({
        name,
        parentId: selectedFolderId
      });
      setNewFolderName("");
      setShowCreateFolder(false);
      setSource(`folder:${folder.id}`);
    } catch (error) {
      await showError("Virtueller Ordner konnte nicht angelegt werden", error);
    }
  };

  const deleteVirtualFolder = async () => {
    if (selectedFolderId === null) {
      return;
    }
    const folder = foldersById.get(selectedFolderId);
    if (!folder) {
      return;
    }
    const approved = await confirm({
      title: `Ordner „${folder.name}“ löschen?`,
      body: "Nur leere Parent-Ordner können gelöscht werden. DMS-Sammlungen bleiben unverändert.",
      severity: "warn",
      confirmLabel: "Ordner löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await manager.deleteParentFolder(folder.id, folder.version);
      setSource("all");
      showToast({ tone: "success", title: "Parent-Ordner gelöscht" });
    } catch (error) {
      await showError("Parent-Ordner konnte nicht gelöscht werden", error);
    }
  };

  const unlinkDocument = async (link: ParentDocumentLink) => {
    const approved = await confirm({
      title: "DMS-Verknüpfung lösen?",
      body: `Nur die Verknüpfung zu „${link.document.displayName ?? link.document.originalName}“ wird entfernt. Das Dokument, seine Sammlungen und Tags bleiben im Dokumentenmanagement bestehen.`,
      severity: "warn",
      confirmLabel: "Verknüpfung lösen"
    });
    if (!approved) {
      return;
    }
    try {
      await manager.unlinkDocument(link.id, link.version);
      showToast({ tone: "success", title: "DMS-Verknüpfung gelöst" });
    } catch (error) {
      await showError("DMS-Verknüpfung konnte nicht gelöst werden", error);
    }
  };

  const linkPickedLocalFolder = async () => {
    try {
      const rootPath = await manager.pickLocalFolderPath();
      if (!rootPath) {
        return;
      }
      const folder = await manager.createLocalFolder(rootPath);
      setSource(`local:${folder.id}`);
    } catch (error) {
      await showError("Lokaler Ordner konnte nicht verknüpft werden", error);
    }
  };

  const linkManualLocalFolder = async () => {
    const rootPath = manualPath.trim();
    if (!rootPath) {
      return;
    }
    try {
      const folder = await manager.createLocalFolder(rootPath);
      setManualPath("");
      setShowManualPath(false);
      setSource(`local:${folder.id}`);
    } catch (error) {
      await showError("Lokaler Ordner konnte nicht verknüpft werden", error);
    }
  };

  const unlinkLocalFolder = async () => {
    const folder = manager.localFolders.find(
      (candidate) => candidate.id === selectedLocalFolderId
    );
    if (!folder) {
      return;
    }
    const approved = await confirm({
      title: "Lokalen Ordner nicht mehr anzeigen?",
      body: "Nur die PM-Verknüpfung wird gelöst. Der Ordner und sämtliche Dateien auf der Festplatte bleiben unverändert.",
      severity: "warn",
      confirmLabel: attachmentActionLabels.removeLocalFolder
    });
    if (!approved) {
      return;
    }
    try {
      await manager.deleteLocalFolder(folder.id, folder.version);
      setSource("all");
      setLocalPath("");
      showToast({ tone: "success", title: "Ordner-Verknüpfung gelöst" });
    } catch (error) {
      await showError("Ordner-Verknüpfung konnte nicht gelöst werden", error);
    }
  };

  const openManaged = async (attachment: Attachment) => {
    try {
      await manager.openAttachment(attachment.id);
    } catch (error) {
      await showError("Datei konnte nicht geöffnet werden", error);
    }
  };

  const openLocal = async (entry: AttachmentLocalEntry) => {
    if (entry.kind === "directory") {
      setLocalPath(entry.relativePath);
      return;
    }
    try {
      await localEntries.openLocalFile(entry.folderId, entry.relativePath);
    } catch (error) {
      await showError("Lokale Datei konnte nicht geöffnet werden", error);
    }
  };

  const renderManagedActions = (attachment: Attachment) => (
    <div className="flex shrink-0 items-center gap-1">
      <a
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-steel-600 transition hover:bg-steel-100"
        href={assetUrl(attachment.url)}
        target="_blank"
        rel="noreferrer"
        aria-label={`${attachment.originalName} herunterladen`}
        title="Herunterladen"
      >
        <Download size={15} />
      </a>
      <Button
        size="sm"
        variant="ghost"
        icon={<FolderOpen size={15} />}
        aria-label={`${attachment.originalName} lokal öffnen`}
        title="Lokal öffnen"
        loading={manager.openingAttachmentId === attachment.id}
        onClick={() => void openManaged(attachment)}
      />
      {canDelete ? (
        <Button
          size="sm"
          variant="danger"
          icon={<Trash2 size={15} />}
          aria-label={`${attachment.originalName} endgültig löschen`}
          title="Endgültig löschen"
          onClick={() => void bulkDelete([attachment])}
        />
      ) : null}
    </div>
  );

  const moveDocumentLink = async (link: ParentDocumentLink, folderId: number | null) => {
    try {
      await manager.moveDocumentLink(link.id, { folderId, expectedVersion: link.version });
      showToast({ tone: "success", title: "Parent-Ordner aktualisiert" });
    } catch (error) {
      await showError("Dokumentverknüpfung konnte nicht verschoben werden", error);
    }
  };

  const renderDocumentLinkActions = (link: ParentDocumentLink) => (
    <div className="flex shrink-0 items-center gap-1">
      <a
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-steel-600 transition hover:bg-steel-100"
        href={assetUrl(link.document.url)}
        target="_blank"
        rel="noreferrer"
        aria-label={`${link.document.originalName} herunterladen`}
        title="Herunterladen"
      >
        <Download size={15} />
      </a>
      <Button
        size="sm"
        variant="ghost"
        icon={<FolderOpen size={15} />}
        aria-label={`${link.document.originalName} lokal öffnen`}
        title="Lokal öffnen"
        onClick={() => void manager.openDocument(link.document.id)}
      />
      {canWrite && canWriteDocuments ? (
        <>
          <select
            className="h-8 max-w-36 rounded-md border border-line bg-white px-2 text-xs text-ink"
            aria-label={`${link.document.originalName} in Parent-Ordner verschieben`}
            value={link.folder?.id ?? ""}
            onChange={(event) => void moveDocumentLink(link, event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">Nicht einsortiert</option>
            {manager.parentFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folderLabel(folder, foldersById)}</option>
            ))}
          </select>
          <Button
            size="sm"
            variant="ghost"
            icon={<Unlink size={15} />}
            aria-label={`${link.document.originalName} Verknüpfung lösen`}
            title="Nur DMS-Verknüpfung lösen"
            onClick={() => void unlinkDocument(link)}
          />
        </>
      ) : null}
    </div>
  );

  const renderDocumentLinkRow = (link: ParentDocumentLink, details: boolean) => {
    const meta = describeAttachmentType(link.document);
    const Icon = meta.Icon;
    return (
      <article
        key={`document-link-${link.id}`}
        className={`grid items-center gap-3 rounded-lg border border-teal/30 bg-teal/5 px-3 py-2 shadow-sm ${
          details
            ? "grid-cols-[auto_auto_minmax(0,1fr)_8rem_7rem_8rem_auto]"
            : "grid-cols-[auto_auto_minmax(0,1fr)_auto]"
        }`}
      >
        <span className="inline-flex rounded bg-teal/15 px-1.5 py-0.5 text-[10px] font-bold text-teal">DMS</span>
        <Icon size={20} className="text-teal" />
        <button
          type="button"
          className="min-w-0 truncate text-left text-sm font-medium text-ink"
          onDoubleClick={() => void manager.openDocument(link.document.id)}
        >
          {link.document.displayName ?? link.document.originalName}
        </button>
        {details ? (
          <>
            <span className="truncate text-xs text-steel-500">{meta.label}</span>
            <span className="text-xs text-steel-500">{prettyBytes(link.document.size)}</span>
            <span className="text-xs text-steel-500">{formatHumanDate(link.document.updatedAt)}</span>
          </>
        ) : null}
        {renderDocumentLinkActions(link)}
      </article>
    );
  };

  const renderLocalActions = (entry: AttachmentLocalEntry) =>
    entry.kind === "file" ? (
      <div className="flex shrink-0 items-center gap-1">
        <a
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-steel-600 transition hover:bg-steel-100"
          href={assetUrl(`${entry.url}&download=true`)}
          target="_blank"
          rel="noreferrer"
          aria-label={`${entry.name} herunterladen`}
          title="Herunterladen"
        >
          <Download size={15} />
        </a>
        <Button
          size="sm"
          variant="ghost"
          icon={<FolderOpen size={15} />}
          aria-label={`${entry.name} lokal öffnen`}
          title="Lokal öffnen"
          loading={localEntries.openingPath === entry.relativePath}
          onClick={() => void openLocal(entry)}
        />
      </div>
    ) : null;

  const renderManagedRow = (attachment: Attachment, details: boolean) => {
    const meta = describeAttachmentType(attachment);
    const Icon = meta.Icon;
    return (
      <article
        key={attachment.id}
        className={`grid items-center gap-3 rounded-lg border border-line bg-white px-3 py-2 shadow-sm ${
          details
            ? "grid-cols-[auto_auto_minmax(0,1fr)_8rem_7rem_8rem_auto]"
            : "grid-cols-[auto_auto_minmax(0,1fr)_auto]"
        }`}
      >
        <input
          type="checkbox"
          className={checkboxClassName()}
          checked={selectedAttachmentIds.has(attachment.id)}
          onChange={() => toggleAttachment(attachment.id)}
          aria-label={`${attachment.originalName} auswählen`}
        />
        <Icon size={20} className="text-steel-500" />
        <button
          type="button"
          className="min-w-0 truncate text-left text-sm font-medium text-ink"
          onDoubleClick={() => void openManaged(attachment)}
        >
          {attachment.originalName}
        </button>
        {details ? (
          <>
            <span className="truncate text-xs text-steel-500">{meta.label}</span>
            <span className="text-xs text-steel-500">{prettyBytes(attachment.size)}</span>
            <span className="text-xs text-steel-500">{formatHumanDate(attachment.updatedAt)}</span>
          </>
        ) : null}
        {renderManagedActions(attachment)}
      </article>
    );
  };

  const renderLocalRow = (entry: AttachmentLocalEntry, details: boolean) => {
    const Icon = entry.kind === "directory" ? Folder : File;
    return (
      <article
        key={entry.relativePath}
        className={`grid items-center gap-3 rounded-lg border border-line bg-white px-3 py-2 shadow-sm ${
          details
            ? "grid-cols-[auto_auto_minmax(0,1fr)_8rem_7rem_8rem_auto]"
            : "grid-cols-[auto_auto_minmax(0,1fr)_auto]"
        }`}
      >
        {entry.kind === "file" ? (
          <input
            type="checkbox"
            className={checkboxClassName()}
            checked={selectedLocalPaths.has(entry.relativePath)}
            onChange={() => toggleLocalFile(entry.relativePath)}
            aria-label={`${entry.name} auswählen`}
          />
        ) : (
          <span className="h-4 w-4" />
        )}
        <Icon size={20} className={entry.kind === "directory" ? "text-mustard" : "text-steel-500"} />
        <button
          type="button"
          className="min-w-0 truncate text-left text-sm font-medium text-ink"
          onClick={() => entry.kind === "directory" && setLocalPath(entry.relativePath)}
          onDoubleClick={() => void openLocal(entry)}
        >
          {entry.name}
        </button>
        {details ? (
          <>
            <span className="truncate text-xs text-steel-500">
              {entry.kind === "directory" ? "Ordner" : entry.mimetype}
            </span>
            <span className="text-xs text-steel-500">
              {entry.size === null ? "—" : prettyBytes(entry.size)}
            </span>
            <span className="text-xs text-steel-500">{formatHumanDate(entry.updatedAt)}</span>
          </>
        ) : null}
        {renderLocalActions(entry)}
      </article>
    );
  };

  const renderManagedTile = (attachment: Attachment) => {
    const meta = describeAttachmentType(attachment);
    const Icon = meta.Icon;
    const selected = selectedAttachmentIds.has(attachment.id);
    return (
      <article
        key={attachment.id}
        className={`group relative overflow-hidden rounded-lg border bg-white shadow-sm transition ${
          selected ? "border-steel-400 ring-2 ring-steel-300" : "border-line hover:shadow-panel"
        }`}
        onDoubleClick={() => void openManaged(attachment)}
      >
        <div className="relative aspect-square bg-shell">
          {meta.family === "image" ? (
            <img
              src={assetUrl(attachment.url)}
              alt={attachment.originalName}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-steel-400">
              <Icon size={viewMode === "small" ? 28 : viewMode === "large" ? 54 : 40} />
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.toneClassName}`}>
                {meta.badge}
              </span>
            </div>
          )}
          <input
            type="checkbox"
            className={`absolute left-2 top-2 ${checkboxClassName()}`}
            checked={selected}
            onChange={() => toggleAttachment(attachment.id)}
            aria-label={`${attachment.originalName} auswählen`}
          />
        </div>
        <div className="grid gap-1 p-2">
          <p className="truncate text-center text-xs font-medium text-ink">{attachment.originalName}</p>
          <p className="text-center text-[10px] text-steel-500">{prettyBytes(attachment.size)}</p>
        </div>
      </article>
    );
  };

  const renderDocumentLinkTile = (link: ParentDocumentLink) => {
    const meta = describeAttachmentType(link.document);
    const Icon = meta.Icon;
    return (
      <article
        key={`document-link-${link.id}`}
        className="group relative overflow-hidden rounded-lg border border-teal/30 bg-white shadow-sm transition hover:shadow-panel"
        onDoubleClick={() => void manager.openDocument(link.document.id)}
      >
        <div className="relative aspect-square bg-teal/5">
          {meta.family === "image" ? (
            <img
              src={assetUrl(link.document.url)}
              alt={link.document.originalName}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-teal">
              <Icon size={viewMode === "small" ? 28 : viewMode === "large" ? 54 : 40} />
              <span className="rounded bg-teal/15 px-1.5 py-0.5 text-[10px] font-bold text-teal">DMS</span>
            </div>
          )}
        </div>
        <div className="grid gap-1 p-2">
          <p className="truncate text-center text-xs font-medium text-ink">{link.document.displayName ?? link.document.originalName}</p>
          <p className="text-center text-[10px] text-steel-500">Verknüpftes DMS-Dokument</p>
          {canWrite && canWriteDocuments ? (
            <Button size="sm" variant="ghost" icon={<Unlink size={14} />} onClick={() => void unlinkDocument(link)}>
              Verknüpfung lösen
            </Button>
          ) : null}
        </div>
      </article>
    );
  };

  const renderLocalTile = (entry: AttachmentLocalEntry) => {
    const Icon = entry.kind === "directory" ? Folder : File;
    const selected = selectedLocalPaths.has(entry.relativePath);
    const image = entry.kind === "file" && entry.mimetype?.startsWith("image/") && entry.url;
    return (
      <article
        key={entry.relativePath}
        className={`group relative overflow-hidden rounded-lg border bg-white shadow-sm transition ${
          selected ? "border-steel-400 ring-2 ring-steel-300" : "border-line hover:shadow-panel"
        }`}
        onDoubleClick={() => void openLocal(entry)}
      >
        <button
          type="button"
          className="relative block aspect-square w-full bg-shell"
          onClick={() => entry.kind === "directory" && setLocalPath(entry.relativePath)}
        >
          {image ? (
            <img
              src={assetUrl(entry.url as string)}
              alt={entry.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center">
              <Icon
                size={viewMode === "small" ? 28 : viewMode === "large" ? 54 : 40}
                className={entry.kind === "directory" ? "text-mustard" : "text-steel-400"}
              />
            </span>
          )}
        </button>
        {entry.kind === "file" ? (
          <input
            type="checkbox"
            className={`absolute left-2 top-2 ${checkboxClassName()}`}
            checked={selected}
            onChange={() => toggleLocalFile(entry.relativePath)}
            aria-label={`${entry.name} auswählen`}
          />
        ) : null}
        <div className="grid gap-1 p-2">
          <p className="truncate text-center text-xs font-medium text-ink">{entry.name}</p>
          <p className="text-center text-[10px] text-steel-500">
            {entry.size === null ? "Ordner" : prettyBytes(entry.size)}
          </p>
        </div>
      </article>
    );
  };

  const gridMinWidth = viewMode === "small" ? 108 : viewMode === "large" ? 232 : 164;
  const currentEntries = selectedLocalFolderId === null ? [] : localEntries.entries;
  const isEmpty =
    selectedLocalFolderId === null
      ? displayedAttachments.length === 0 && displayedDocumentLinks.length === 0
      : currentEntries.length === 0 && !localEntries.loading;

  return (
    <div className="grid min-w-0 gap-3">
      <div className="sticky top-0 z-10 grid gap-3 rounded-lg border border-line bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <Select
              label="Ablage"
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setLocalPath("");
              }}
            >
              <option value="all">Alle Parent-Dateien</option>
              <option value="unfiled">Nicht einsortiert</option>
              {manager.parentFolders.map((folder) => (
                <option key={folder.id} value={`folder:${folder.id}`}>
                  {folderLabel(folder, foldersById)}
                </option>
              ))}
              {manager.localFolders.map((folder) => (
                <option key={`local-${folder.id}`} value={`local:${folder.id}`}>
                  Festplatte · {folder.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="inline-flex gap-1 rounded-lg border border-line bg-steel-100 p-1">
            {viewModes.map((entry) => {
              const active = entry.value === viewMode;
              return (
                <button
                  key={entry.value}
                  type="button"
                  aria-label={attachmentViewModeLabels[entry.value]}
                  title={attachmentViewModeLabels[entry.value]}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${
                    active
                      ? "border-steel-700 bg-steel-700 text-white"
                      : "border-line bg-white text-steel-700 hover:border-steel-400"
                  }`}
                  onClick={() => selectViewMode(entry.value)}
                >
                  {entry.icon}
                </button>
              );
            })}
          </div>

          {canWrite ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                icon={<Plus size={16} />}
                onClick={() => setShowCreateFolder((current) => !current)}
              >
                {attachmentActionLabels.createFolder}
              </Button>
              {manager.canReadDocuments && canWriteDocuments ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Link2 size={16} />}
                  onClick={() => setShowDocumentPicker((current) => !current)}
                >
                  DMS-Dokument verknüpfen
                </Button>
              ) : null}
              {selectedFolderId !== null && canDelete ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 size={16} />}
                  onClick={() => void deleteVirtualFolder()}
                >
                  Ordner löschen
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                icon={<HardDrive size={16} />}
                onClick={() => void linkPickedLocalFolder()}
              >
                {attachmentActionLabels.linkLocalFolder}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowManualPath((current) => !current)}
              >
                Pfad eingeben
              </Button>
            </>
          ) : null}
        </div>

        {showCreateFolder ? (
          <div className="flex gap-2">
            <Input
              aria-label="Name des virtuellen Ordners"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder={selectedFolderId === null ? "Neuer virtueller Ordner" : "Neuer Unterordner"}
            />
            <Button
              size="sm"
              variant="secondary"
              icon={<FolderInput size={16} />}
              disabled={!newFolderName.trim()}
              onClick={() => void createVirtualFolder()}
            >
              Anlegen
            </Button>
          </div>
        ) : null}

        {showDocumentPicker && manager.canReadDocuments && canWriteDocuments ? (
          <DocumentLinkPicker
            manager={manager}
            folderId={selectedFolderId}
            onClose={() => setShowDocumentPicker(false)}
            onError={(error) => showError("DMS-Dokument konnte nicht verknüpft werden", error)}
          />
        ) : null}

        {showManualPath ? (
          <div className="flex gap-2">
            <Input
              variant="mono"
              aria-label="Lokaler Windows-Ordnerpfad"
              value={manualPath}
              onChange={(event) => setManualPath(event.target.value)}
              placeholder="C:\\Projekte\\Unterlagen"
            />
            <Button
              size="sm"
              variant="secondary"
              icon={<HardDrive size={16} />}
              disabled={!manualPath.trim()}
              onClick={() => void linkManualLocalFolder()}
            >
              Verknüpfen
            </Button>
          </div>
        ) : null}

        {selectedLocalFolderId !== null ? (
          <div className="flex flex-wrap items-center gap-2">
            {localPath ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<ArrowUp size={16} />}
                onClick={() => setLocalPath(localParentPath(localPath))}
              >
                Eine Ebene höher
              </Button>
            ) : null}
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-steel-500">
              {manager.localFolders.find((folder) => folder.id === selectedLocalFolderId)?.rootPath}
              {localPath ? `\\${localPath.replaceAll("/", "\\")}` : ""}
            </span>
            {canWrite ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<Unlink size={16} />}
                onClick={() => void unlinkLocalFolder()}
              >
                {attachmentActionLabels.removeLocalFolder}
              </Button>
            ) : null}
          </div>
        ) : null}

        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="text-sm font-semibold text-ink">{selectedCount} ausgewählt</span>
            <Button
              size="sm"
              variant="secondary"
              icon={<Download size={16} />}
              onClick={() => void downloadArchive()}
            >
              {attachmentActionLabels.archive}
            </Button>
            {selectedAttachments.length > 0 && canWrite ? (
              <>
                <Select
                  label={attachmentActionLabels.moveToFolder}
                  value=""
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value) {
                      void moveSelected(value === "none" ? null : Number(value));
                    }
                  }}
                >
                  <option value="">Ziel wählen</option>
                  <option value="none">Nicht einsortiert</option>
                  {manager.parentFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folderLabel(folder, foldersById)}
                    </option>
                  ))}
                </Select>
              </>
            ) : null}
            {selectedAttachments.length > 0 && canDelete ? (
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 size={16} />}
                onClick={() => void bulkDelete()}
              >
                {attachmentActionLabels.bulkDelete}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <EmptyState
          icon={selectedLocalFolderId === null ? <FolderOpen size={22} /> : <Folder size={22} />}
          title={selectedLocalFolderId === null ? "Noch keine Dateien" : "Dieser Ordner ist leer"}
          body={
            selectedLocalFolderId === null
              ? "Exklusive Parent-Anhänge und verknüpfte DMS-Dokumente erscheinen hier; lokale Ordner bleiben eine eigene Quelle."
              : "Wechsle in einen anderen Ordner oder füge Dateien auf der Festplatte hinzu."
          }
          tone="teal"
          variant="tinted"
        />
      ) : null}

      {!isEmpty && (viewMode === "list" || viewMode === "details") ? (
        <div className="grid gap-2">
          {selectedLocalFolderId === null
            ? (
                <>
                  {displayedAttachments.map((attachment) => renderManagedRow(attachment, viewMode === "details"))}
                  {displayedDocumentLinks.map((link) => renderDocumentLinkRow(link, viewMode === "details"))}
                </>
              )
            : currentEntries.map((entry) => renderLocalRow(entry, viewMode === "details"))}
        </div>
      ) : null}

      {!isEmpty && viewMode !== "list" && viewMode !== "details" ? (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinWidth}px, 1fr))` }}
        >
          {selectedLocalFolderId === null
            ? (
                <>
                  {displayedAttachments.map(renderManagedTile)}
                  {displayedDocumentLinks.map(renderDocumentLinkTile)}
                </>
              )
            : currentEntries.map(renderLocalTile)}
        </div>
      ) : null}

      {viewMode === "details" && selectedPreviewAttachment ? (
        <AttachmentPreview
          attachment={selectedPreviewAttachment}
          onDeletePermanently={canDelete ? manager.deleteAttachmentPermanently : undefined}
          onOpen={(attachment) => manager.openAttachment(attachment.id)}
          opening={manager.openingAttachmentId === selectedPreviewAttachment.id}
        />
      ) : null}

      {selectedLocalFolderId !== null ? (
        <LoadMoreIndicator
          loadedCount={localEntries.loadedCount}
          total={localEntries.total}
          loadingMore={localEntries.loadingMore}
        />
      ) : null}
    </div>
  );
}
