import type { Note } from "@taskmanager/shared-types";
import { Plus, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { SearchInput } from "../ui/SearchInput";
import { NoteCard } from "./NoteCard";

interface NoteListProps {
  notes: Note[];
  onCreate: () => Promise<void>;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export function NoteList({ notes, onCreate, onEdit, onDelete }: NoteListProps) {
  const [searchValue, setSearchValue] = useState("");
  const visibleNotes = useMemo(() => {
    const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
    if (!normalized) {
      return notes;
    }

    return notes.filter((note) => note.title.toLocaleLowerCase("de-DE").includes(normalized));
  }, [notes, searchValue]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={searchValue} onChange={setSearchValue} />
        <Button aria-label="Neue Notiz" title="Neue Notiz" className="h-10 w-10" icon={<Plus size={17} />} variant="primary" onClick={() => void onCreate()} />
      </div>
      {visibleNotes.length === 0 ? (
        <EmptyState icon={<StickyNote size={22} />} title="Keine Notizen" body="Erstelle eine Notiz, um Kontext und Entscheidungen festzuhalten." tone="violet" variant="tinted" />
      ) : (
        <div className="grid gap-3">
          {visibleNotes.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
