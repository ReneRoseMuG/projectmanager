import type { Comment } from "@taskmanager/shared-types";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";

interface CommentSectionProps {
  comments: Comment[];
  onCreate: (input: { body: string }) => Promise<unknown>;
  onDelete: (id: number) => Promise<void>;
}

export function CommentSection({ comments, onCreate, onDelete }: CommentSectionProps) {
  const [body, setBody] = useState("");

  const add = async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      return;
    }
    try {
      await onCreate({ body: trimmed });
      setBody("");
    } catch {
      // Error feedback is handled by the caller.
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <textarea
          className="min-h-24 rounded-md border border-line px-3 py-2 outline-none focus:border-teal"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <div>
          <Button icon={<Plus size={16} />} onClick={add}>
            Kommentar
          </Button>
        </div>
      </div>
      <div className="grid gap-2">
        {comments.map((comment) => (
          <article key={comment.id} className="grid gap-2 rounded-md border border-line bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <time className="text-xs text-slate-500">{formatHumanDate(comment.createdAt)}</time>
              <Button aria-label="Löschen" title="Löschen" icon={<Trash2 size={15} />} variant="ghost" className="h-8 w-8" onClick={() => void onDelete(comment.id).catch(() => undefined)} />
            </div>
            <p className="whitespace-pre-line text-sm text-ink">{comment.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
