import type { MoveOwner, Note } from "@taskmanager/shared-types";
import { StickyNote } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { errorMessage } from "../../hooks/errors";
import type { NoteOwner } from "../../hooks/useNotes";
import { withStandaloneView } from "../../utils/standalone";
import { EmptyState } from "../ui/EmptyState";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { ProjectContextTreeDialog, type MoveTarget } from "../ui/ProjectContextTreeDialog";
import { useToast } from "../ui/ToastProvider";
import { NoteCard } from "./NoteCard";
import { noteContentToPreviewText } from "./noteContent";
import { NoteListViewItem } from "./NoteListViewItem";

interface NoteListProps {
  notes: Note[];
  onCreate: () => Promise<void>;
  onEdit: (note: Note) => void;
  onMove?: (note: Note, target: MoveTarget) => Promise<unknown>;
  onDelete: (note: Note) => void;
  owner?: NoteOwner;
  canCreate?: boolean;
  canDelete?: boolean;
  loading?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  // Kontrollierte Suche: Wird `search` gesetzt, übernimmt der Aufrufer die Filterung
  // (z. B. serverseitig paginiert). Die Liste filtert dann NICHT mehr selbst und reicht
  // Suchwert/Handler nur an die Toolbar durch. Ohne diese Props gilt das bisherige
  // Verhalten mit interner clientseitiger Suche.
  search?: string;
  onSearchChange?: (value: string) => void;
  footer?: ReactNode;
}

function matchesSearch(note: Note, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  const preview = noteContentToPreviewText(note.contentJson).toLocaleLowerCase("de-DE");
  return note.title.toLocaleLowerCase("de-DE").includes(normalized) || preview.includes(normalized);
}

function noteOwnerReturnPath(owner: NoteOwner): string {
  const query = "tab=notes";

  if (owner.type === "project") {
    return `/projects/${owner.id}?${query}`;
  }
  if (owner.type === "milestone") {
    return `/milestones/${owner.id}?${query}`;
  }
  if (owner.type === "task") {
    return `/tasks/${owner.id}?${query}`;
  }
  if (owner.type === "ticket") {
    return `/tickets/${owner.id}?${query}`;
  }
  if (owner.type === "wikiPage") {
    return `/wiki/${owner.id}?${query}`;
  }

  return `/day-plan?${query}`;
}

function noteDetailPath(owner: NoteOwner, noteId: number): string {
  const params = new URLSearchParams({ returnTo: noteOwnerReturnPath(owner) });
  return `/notes/${noteId}?${params.toString()}`;
}

function NoteMoveDialog({
  note,
  source,
  onMove,
  onClose,
}: {
  note: Note | null;
  source: MoveOwner<"project" | "milestone" | "task" | "ticket">;
  onMove: (note: Note, target: MoveTarget) => Promise<unknown>;
  onClose: () => void;
}) {
  const { showToast } = useToast();

  return (
    <ProjectContextTreeDialog
      open={Boolean(note)}
      source={source}
      itemType="note"
      itemId={note?.id ?? null}
      onSelect={async (target: MoveTarget) => {
        if (!note) return;
        try {
          await onMove(note, target);
          showToast({ tone: "success", title: "Notiz verschoben" });
          onClose();
        } catch (moveError) {
          showToast({ tone: "error", title: "Notiz konnte nicht verschoben werden", message: errorMessage(moveError) });
          throw moveError;
        }
      }}
      onClose={onClose}
    />
  );
}

export function NoteList({
  notes,
  onCreate,
  onEdit,
  onMove,
  onDelete,
  owner,
  canCreate = true,
  canDelete = true,
  loading = false,
  emptyTitle = "Keine Notizen",
  emptyBody = "Erstelle eine Notiz, um Kontext und Entscheidungen festzuhalten.",
  search,
  onSearchChange,
  footer
}: NoteListProps) {
  const [mode, setMode] = useState<ListBoardMode>("board");
  const [internalSearch, setInternalSearch] = useState("");
  const [moveNote, setMoveNote] = useState<Note | null>(null);
  // Kontrollierter Modus (externer Suchwert vorhanden) → Server filtert bereits, Liste zeigt
  // die Notizen unverändert. Sonst: interner Suchwert + clientseitige Filterung wie bisher.
  const isControlled = search !== undefined;
  const searchValue = isControlled ? search : internalSearch;
  const setSearchValue = isControlled ? (onSearchChange ?? (() => undefined)) : setInternalSearch;
  const visibleNotes = useMemo(
    () => (isControlled ? notes : notes.filter((note) => matchesSearch(note, searchValue))),
    [isControlled, notes, searchValue],
  );
  const openInTab = owner
    ? (note: Note) => {
        window.open(withStandaloneView(noteDetailPath(owner, note.id)), "_blank");
      }
    : undefined;
  const movableOwner: MoveOwner<"project" | "milestone" | "task" | "ticket"> | null =
    owner?.type === "project"
      ? { type: "project", id: owner.id }
      : owner?.type === "milestone"
        ? { type: "milestone", id: owner.id }
        : owner?.type === "task"
          ? { type: "task", id: owner.id }
          : owner?.type === "ticket"
            ? { type: "ticket", id: owner.id }
            : null;
  const moveHandler = onMove && movableOwner ? (note: Note) => setMoveNote(note) : undefined;

  return (
    <>
      <ListBoardView
        items={visibleNotes}
        mode={mode}
        onModeChange={setMode}
        onAdd={() => void onCreate()}
        addLabel="Neue Notiz"
        showToolbarAdd={canCreate}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        loading={loading}
        emptyState={
          <EmptyState
            icon={<StickyNote size={22} />}
            title={emptyTitle}
            body={emptyBody}
            tone="fern"
            variant="tinted"
          />
        }
        renderCard={(note) => (
          <NoteCard
            note={note}
            onEdit={onEdit}
            onOpenInTab={openInTab}
            onMove={moveHandler}
            onDelete={canDelete ? onDelete : undefined}
          />
        )}
        renderRow={(note) => (
          <NoteListViewItem
            note={note}
            onEdit={onEdit}
            onOpenInTab={openInTab}
            onMove={moveHandler}
            onDelete={canDelete ? onDelete : undefined}
          />
        )}
      />
      {footer}
      {movableOwner && onMove ? (
        <NoteMoveDialog
          note={moveNote}
          source={movableOwner}
          onMove={onMove}
          onClose={() => setMoveNote(null)}
        />
      ) : null}
    </>
  );
}
