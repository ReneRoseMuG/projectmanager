import type { Comment } from "@taskmanager/shared-types";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatHumanDate } from "../../utils/date";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { RichTextInlineField } from "./rich-text-inline-field";
import { Section } from "./Section";

interface CommentThreadProps {
  comments: Comment[];
  onCreate: (input: { body: string }) => Promise<unknown>;
  onDelete: (id: number) => Promise<void>;
  entityLabel?: string;
}

function textFromHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function toHtmlContent(value: string) {
  return value.trim().startsWith("<")
    ? value
    : `<p>${value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
}

function CommentItem({
  comment,
  onDelete,
}: {
  comment: Comment;
  onDelete: (id: number) => Promise<void>;
}) {
  return (
    <article className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <time className="text-xs text-slate-500">
          {formatHumanDate(comment.createdAt)}
        </time>
        <Button
          aria-label="Löschen"
          title="Löschen"
          icon={<Trash2 size={18} />}
          variant="ghost"
          className="h-10 w-10"
          onClick={() => void onDelete(comment.id).catch(() => undefined)}
        />
      </div>
      <RichTextInlineField
        value={toHtmlContent(comment.body)}
        readOnly
        testIdPrefix={`comment-thread-comment-${comment.id}-body`}
        onChange={() => undefined}
      />
    </article>
  );
}

function CommentComposer({
  onCreate,
}: {
  onCreate: (input: { body: string }) => Promise<unknown>;
}) {
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
        <RichTextInlineField
          value={body}
          placeholder="Kommentar schreiben"
          testIdPrefix="comment-thread-body"
          onChange={setBody}
        />
        <div className="flex justify-end">
          <Button
            variant="primary"
            icon={<Send size={16} />}
            loading={submitting}
            onClick={() => void submit()}
          >
            Kommentar
          </Button>
        </div>
      </div>
    </Section>
  );
}

/** Generic comment thread organism for domain detail views. */
export function CommentThread({
  comments,
  onCreate,
  onDelete,
  entityLabel = "Objekt",
}: CommentThreadProps) {
  return (
    <div className="grid gap-4">
      <CommentComposer onCreate={onCreate} />
      <section className="grid gap-3">
        {comments.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={22} />}
            title="Noch keine Kommentare"
            body={`Kommentare und Rückfragen zu diesem ${entityLabel} erscheinen hier.`}
            tone="neutral"
            variant="default"
          />
        ) : null}
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} onDelete={onDelete} />
        ))}
      </section>
    </div>
  );
}
