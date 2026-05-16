import type { Note } from "@taskmanager/shared-types";
import { Plus } from "lucide-react";
import { Button } from "../ui/Button";
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
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-slate-600">Keine Notizen</div>
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
