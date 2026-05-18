import type { Note } from "@taskmanager/shared-types";
import { Edit3, FileText, Trash2 } from "lucide-react";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

const noteTones = ["violet", "tangerine", "fern", "magenta"] as const;

const toneMap: Record<(typeof noteTones)[number], string> = {
  violet: "bg-violet/10 text-violet",
  tangerine: "bg-tangerine/10 text-tangerine",
  fern: "bg-fern/10 text-fern",
  magenta: "bg-magenta/10 text-magenta"
};

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const tone = noteTones[note.id % noteTones.length] ?? "violet";

  return (
    <article className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3.5 transition hover:border-steel-300 hover:shadow-md">
      <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => onEdit(note)}>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneMap[tone]}`}>
          <FileText size={18} />
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-sm font-semibold text-ink">{note.title}</strong>
          <time className="mt-0.5 block text-xs text-slate-500">{formatHumanDate(note.updatedAt)}</time>
        </span>
      </button>
      <div className="flex gap-1">
        <Button aria-label="Bearbeiten" title="Bearbeiten" className="h-10 w-10" icon={<Edit3 size={18} />} variant="ghost" onClick={() => onEdit(note)} />
        <Button aria-label="Löschen" title="Löschen" className="h-10 w-10" icon={<Trash2 size={18} />} variant="ghost" onClick={() => onDelete(note)} />
      </div>
    </article>
  );
}
