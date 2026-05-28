import type { Note } from "@taskmanager/shared-types";
import { StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../ui/EmptyState";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { NoteCard } from "./NoteCard";
import { NoteListViewItem } from "./NoteListViewItem";

interface NoteListProps {
  notes: Note[];
  onCreate: () => Promise<void>;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
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

export function NoteList({ notes, onCreate, onEdit, onDelete, canCreate = true, canDelete = true }: NoteListProps) {
  const [mode, setMode] = useState<ListBoardMode>("board");
  const [searchValue, setSearchValue] = useState("");
  const visibleNotes = useMemo(
    () => notes.filter((note) => matchesSearch(note, searchValue)),
    [notes, searchValue],
  );

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
          onDelete={canDelete ? onDelete : undefined}
        />
      )}
      renderRow={(note) => (
        <NoteListViewItem
          note={note}
          onEdit={onEdit}
          onDelete={canDelete ? onDelete : undefined}
        />
      )}
    />
  );
}
