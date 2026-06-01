import type { Note } from "@taskmanager/shared-types";
import { ExternalLink, StickyNote } from "lucide-react";
import { objectReference } from "../../lib/references";
import { formatHumanDate } from "../../utils/date";
import { ItemCard } from "../ui/ItemCard";
import { noteContentToPreviewText } from "./noteContent";

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onOpenInTab?: (note: Note) => void;
  onDelete?: (note: Note) => void;
}

function NoteHeader({ note }: { note: Note }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-steel-100 text-steel-700">
        <StickyNote size={18} />
      </span>
      <div className="min-w-0">
        <h2 className="line-clamp-2 break-words text-base font-semibold text-ink">{note.title}</h2>
        <time className="mt-1 block text-xs font-semibold text-steel-500">{formatHumanDate(note.updatedAt)}</time>
      </div>
    </div>
  );
}

export function NoteCard({ note, onEdit, onOpenInTab, onDelete }: NoteCardProps) {
  const preview = noteContentToPreviewText(note.contentJson);

  return (
    <ItemCard
      objectReference={objectReference("note", note.id)}
      header={<NoteHeader note={note} />}
      body={preview ? <p className="line-clamp-4 text-sm text-steel-600">{preview}</p> : <p className="text-sm italic text-steel-500">Kein Inhalt</p>}
      onOpen={() => onEdit(note)}
      onEdit={() => onEdit(note)}
      extraMenuItems={onOpenInTab ? [{ label: "In Tab öffnen", icon: <ExternalLink size={16} />, onClick: () => onOpenInTab(note) }] : []}
      onDelete={onDelete ? () => onDelete(note) : undefined}
      className="min-h-56"
    />
  );
}
