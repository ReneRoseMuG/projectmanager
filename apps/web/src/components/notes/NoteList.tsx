import type { Note } from "@taskmanager/shared-types";
import { Plus, StickyNote } from "lucide-react";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { NoteCard } from "./NoteCard";

interface NoteListProps {
  notes: Note[];
  onCreate: () => Promise<void>;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export function NoteList({ notes, onCreate, onEdit, onDelete }: NoteListProps) {
  return (
    <div className="grid gap-4">
      <div>
        <Button icon={<Plus size={16} />} variant="primary" onClick={() => void onCreate()}>
          Neue Notiz
        </Button>
      </div>
      {notes.length === 0 ? (
        <EmptyState icon={<StickyNote size={22} />} title="Keine Notizen" body="Erstelle eine Notiz, um Kontext und Entscheidungen festzuhalten." tone="violet" variant="tinted" />
      ) : (
        <div className="grid gap-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
