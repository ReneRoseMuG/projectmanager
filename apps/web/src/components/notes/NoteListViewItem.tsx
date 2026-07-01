import type { Note } from "@taskmanager/shared-types";
import { Edit3, ExternalLink, StickyNote, Trash2 } from "lucide-react";
import { objectReference } from "../../lib/references";
import { formatHumanDate } from "../../utils/date";
import { ActionMenu } from "../ui/ActionMenu";
import { ItemRow } from "../ui/ItemRow";
import { ParentBadges } from "../ui/ParentBadge";
import { noteContentToPreviewText } from "./noteContent";

interface NoteListViewItemProps {
  note: Note;
  onEdit: (note: Note) => void;
  onOpenInTab?: (note: Note) => void;
  onDelete?: (note: Note) => void;
}

export function NoteListViewItem({ note, onEdit, onOpenInTab, onDelete }: NoteListViewItemProps) {
  const preview = noteContentToPreviewText(note.contentJson);
  const footer = (note.parentContexts?.length ?? 0) > 0 ? <ParentBadges parents={note.parentContexts} /> : undefined;

  return (
    <ItemRow
      title={note.title}
      description={preview || "Kein Inhalt"}
      statusIndicator={
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-steel-100 text-steel-700">
          <StickyNote size={16} />
        </span>
      }
      meta={
        <span className="grid justify-items-end gap-0.5 text-xs font-semibold text-steel-500">
          <span className="text-[11px] uppercase tracking-wide text-steel-400">Aktualisiert</span>
          <time>{formatHumanDate(note.updatedAt)}</time>
        </span>
      }
      actions={
        <ActionMenu
          objectReference={objectReference("note", note.id)}
          items={[
            { label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: () => onEdit(note) },
            ...(onOpenInTab ? [{ label: "In Tab öffnen", icon: <ExternalLink size={16} />, onClick: () => onOpenInTab(note) }] : []),
            ...(onDelete ? [{ label: "Löschen", icon: <Trash2 size={16} />, onClick: () => onDelete(note), danger: true }] : []),
          ]}
        />
      }
      footer={footer}
      onOpen={() => onEdit(note)}
    />
  );
}
