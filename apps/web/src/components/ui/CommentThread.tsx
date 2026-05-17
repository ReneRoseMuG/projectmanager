import type { Comment } from "@taskmanager/shared-types";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatHumanDate } from "../../utils/date";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { RichTextEditor } from "./RichTextEditor";
import { Section } from "./Section";

interface CommentThreadProps {
  comments: Comment[];
  onCreate: (input: { body: string }) => Promise<unknown>;
  onDelete: (id: number) => Promise<void>;
  entityLabel?: string;
}

function textFromHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function toHtmlContent(value: string) {
  return value.trim().startsWith("<") ? value : `<p>${value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
}

function CommentItem({ comment, index, onDelete }: { comment: Comment; index: number; onDelete: (id: number) => Promise<void> }) {
  return (
    <article className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={`User ${index + 1}`} />
          <div className="min-w-0">
            <p className="font-semibold text-ink">Single User</p>
            <time className="text-xs text-slate-500">{formatHumanDate(comment.createdAt)}</time>
          </div>
        </div>
        <Button aria-label="Löschen" title="Löschen" icon={<Trash2 size={15} />} variant="ghost" className="h-8 w-8" onClick={() => void onDelete(comment.id).catch(() => undefined)} />
      </div>
      <RichTextEditor content={toHtmlContent(comment.body)} readOnly toolbar="minimal" minHeight="0" onChange={() => undefined} />
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs font-semibold text-slate-500">
        <span className="rounded-full bg-shell px-2 py-1">0 Reaktionen</span>
        <span className="rounded-full bg-shell px-2 py-1">Antworten</span>
      </div>
    </article>
  );
}

function CommentComposer({ onCreate }: { onCreate: (input: { body: string }) => Promise<unknown> }) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!textFromHtml(body)) {
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({ body });
      setBody("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Section>
      <div className="grid gap-3">
        <RichTextEditor content={body} placeholder="Kommentar schreiben" toolbar="minimal" minHeight="7rem" onChange={setBody} />
        <div className="flex justify-end">
          <Button variant="primary" icon={<Send size={16} />} loading={submitting} onClick={() => void submit()}>
            Kommentar
          </Button>
        </div>
      </div>
    </Section>
  );
}

/** Generic comment thread organism for domain detail views. */
export function CommentThread({ comments, onCreate, onDelete, entityLabel = "Objekt" }: CommentThreadProps) {
  return (
    <div className="grid gap-4">
      <CommentComposer onCreate={onCreate} />
      <section className="grid gap-3">
        {comments.length === 0 ? <EmptyState icon={<MessageSquare size={22} />} title="Noch keine Kommentare" body={`Kommentare und Rückfragen zu diesem ${entityLabel} erscheinen hier.`} tone="neutral" variant="default" /> : null}
        {comments.map((comment, index) => (
          <CommentItem key={comment.id} comment={comment} index={index} onDelete={onDelete} />
        ))}
      </section>
    </div>
  );
}
