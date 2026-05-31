import type { Note } from "@taskmanager/shared-types";
import { StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import type { NoteOwner } from "../../hooks/useNotes";
import { withStandaloneView } from "../../utils/standalone";
import { EmptyState } from "../ui/EmptyState";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { NoteCard } from "./NoteCard";
import { NoteListViewItem } from "./NoteListViewItem";

interface NoteListProps {
  notes: Note[];
  onCreate: () => Promise<void>;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  owner?: NoteOwner;
  canCreate?: boolean;
  canDelete?: boolean;
}

function matchesSearch(note: Note, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  return note.title.toLocaleLowerCase("de-DE").includes(normalized);
}

function noteOwnerPath(owner: NoteOwner, noteId: number): string {
  const query = `tab=notes&noteId=${noteId}`;

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

export function NoteList({ notes, onCreate, onEdit, onDelete, owner, canCreate = true, canDelete = true }: NoteListProps) {
  const [mode, setMode] = useState<ListBoardMode>("board");
  const [searchValue, setSearchValue] = useState("");
  const visibleNotes = useMemo(
    () => notes.filter((note) => matchesSearch(note, searchValue)),
    [notes, searchValue],
  );
  const openInTab = owner
    ? (note: Note) => {
        window.open(withStandaloneView(noteOwnerPath(owner, note.id)), "_blank");
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
      emptyState={
        <EmptyState
          icon={<StickyNote size={22} />}
          title="Keine Notizen"
          body="Erstelle eine Notiz, um Kontext und Entscheidungen festzuhalten."
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
