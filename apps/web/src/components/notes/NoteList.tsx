import type { Note } from "@taskmanager/shared-types";
import { StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import type { NoteOwner } from "../../hooks/useNotes";
import { withStandaloneView } from "../../utils/standalone";
import { EmptyState } from "../ui/EmptyState";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { NoteCard } from "./NoteCard";
import { noteContentToPreviewText } from "./noteContent";
import { NoteListViewItem } from "./NoteListViewItem";

interface NoteListProps {
  notes: Note[];
  onCreate: () => Promise<void>;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  owner?: NoteOwner;
  canCreate?: boolean;
  canDelete?: boolean;
  loading?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
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

export function NoteList({
  notes,
  onCreate,
  onEdit,
  onDelete,
  owner,
  canCreate = true,
  canDelete = true,
  loading = false,
  emptyTitle = "Keine Notizen",
  emptyBody = "Erstelle eine Notiz, um Kontext und Entscheidungen festzuhalten."
}: NoteListProps) {
  const [mode, setMode] = useState<ListBoardMode>("board");
  const [searchValue, setSearchValue] = useState("");
  const visibleNotes = useMemo(
    () => notes.filter((note) => matchesSearch(note, searchValue)),
    [notes, searchValue],
  );
  const openInTab = owner
    ? (note: Note) => {
        window.open(withStandaloneView(noteDetailPath(owner, note.id)), "_blank");
      }
    : undefined;

  return (
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
          onDelete={canDelete ? onDelete : undefined}
        />
      )}
      renderRow={(note) => (
        <NoteListViewItem
          note={note}
          onEdit={onEdit}
          onOpenInTab={openInTab}
          onDelete={canDelete ? onDelete : undefined}
        />
      )}
    />
  );
}
