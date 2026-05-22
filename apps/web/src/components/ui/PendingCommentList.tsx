import type { DraftComment } from "@taskmanager/shared-types";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

interface PendingCommentListProps {
  comments: DraftComment[];
  onAdd: (comment: DraftComment) => void;
  onRemove: (index: number) => void;
}

export function PendingCommentList({ comments, onAdd, onRemove }: PendingCommentListProps) {
  const [text, setText] = useState("");
  const trimmedText = text.trim();

  const addComment = () => {
    if (!trimmedText) {
      return;
    }
    onAdd({ text: trimmedText });
    setText("");
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <textarea
          className="min-h-28 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
          placeholder="Kommentar vormerken"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="flex justify-end">
          <Button variant="primary" icon={<MessageSquarePlus size={17} />} disabled={!trimmedText} onClick={addComment}>
            Hinzufügen
          </Button>
        </div>
      </div>

      {comments.length === 0 ? (
        <EmptyState icon={<MessageSquarePlus size={22} />} title="Keine Kommentare vorgemerkt" body="Kommentare werden lokal gesammelt." tone="teal" variant="tinted" />
      ) : (
        <div className="grid gap-2">
          {comments.map((comment, index) => (
            <div key={`${comment.text}-${index}`} className="flex items-start justify-between gap-3 rounded-md border border-line bg-white p-3 shadow-sm">
              <p className="line-clamp-3 text-sm leading-6 text-steel-700">{comment.text}</p>
              <Button aria-label="Kommentar entfernen" title="Entfernen" variant="ghost" icon={<Trash2 size={16} />} onClick={() => onRemove(index)} />
            </div>
          ))}
        </div>
      )}

      <p className="rounded-md border border-line bg-shell px-3 py-2 text-xs font-semibold text-steel-600">Kommentare werden nach dem Speichern angelegt.</p>
    </div>
  );
}
