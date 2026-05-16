import type { Note } from "@taskmanager/shared-types";
import { Edit3, FileText, Trash2 } from "lucide-react";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
      <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => onEdit(note)}>
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-shell text-teal">
          <FileText size={18} />
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-sm text-ink">{note.title}</strong>
          <time className="text-xs text-slate-500">{formatHumanDate(note.updatedAt)}</time>
        </span>
      </button>
      <div className="flex gap-1">
        <Button aria-label="Bearbeiten" title="Bearbeiten" icon={<Edit3 size={16} />} variant="ghost" onClick={() => onEdit(note)} />
        <Button aria-label="Löschen" title="Löschen" icon={<Trash2 size={16} />} variant="ghost" onClick={() => onDelete(note)} />
      </div>
    </article>
  );
}
