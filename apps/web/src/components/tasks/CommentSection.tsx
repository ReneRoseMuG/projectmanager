import type { Comment } from "@taskmanager/shared-types";
import { Bold, Italic, MessageSquare, Plus, Smile, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

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
      <section className="rounded-lg border border-line bg-white p-4 shadow-[0_10px_28px_rgba(31,43,56,0.06)]">
        <div className="overflow-hidden rounded-lg border border-line bg-shell/50">
          <textarea
            className="min-h-28 w-full resize-y bg-white px-3 py-3 text-sm outline-none"
            placeholder="Kommentar schreiben"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-shell px-2 py-2">
            <div className="flex items-center gap-1">
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-ink" aria-label="Fett" title="Fett">
                <Bold size={15} />
              </button>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-ink" aria-label="Kursiv" title="Kursiv">
                <Italic size={15} />
              </button>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-ink" aria-label="Reaktion" title="Reaktion">
                <Smile size={15} />
              </button>
            </div>
            <Button icon={<Plus size={16} />} variant="primary" onClick={add}>
              Kommentar
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        {comments.length === 0 ? <EmptyState icon={<MessageSquare size={22} />} title="Noch keine Kommentare" body="Kommentare und Rückfragen erscheinen hier." tone="neutral" variant="default" /> : null}
        {comments.map((comment, index) => (
          <article key={comment.id} className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-[0_10px_28px_rgba(31,43,56,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-steel-700 text-xs font-bold text-white">U{index + 1}</div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">Single User</p>
                  <time className="text-xs text-slate-500">{formatHumanDate(comment.createdAt)}</time>
                </div>
              </div>
              <Button aria-label="Löschen" title="Löschen" icon={<Trash2 size={15} />} variant="ghost" className="h-8 w-8" onClick={() => void onDelete(comment.id).catch(() => undefined)} />
            </div>
            <p className="whitespace-pre-line text-sm leading-6 text-ink">{comment.body}</p>
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs font-semibold text-slate-500">
              <span className="rounded-full bg-shell px-2 py-1">0 Reaktionen</span>
              <span className="rounded-full bg-shell px-2 py-1">Antworten</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
