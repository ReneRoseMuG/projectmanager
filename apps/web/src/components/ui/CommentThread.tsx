import type { Comment, CommentUpdate } from "@taskmanager/shared-types";
import { MessageSquare, Pencil, Send, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { formatHumanDate } from "../../utils/date";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { FormModal } from "./FormModal";
import { RichTextInlineField, type RichTextValueFormat } from "./rich-text-inline-field";
import { Section } from "./Section";

interface CommentThreadProps {
  comments: Comment[];
  onCreate: (input: { body: string }) => Promise<unknown>;
  onUpdate: (id: number, input: CommentUpdate) => Promise<unknown>;
  onDelete: (id: number) => Promise<void>;
  entityLabel?: string;
}

function textFromHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function valueFormatForComment(value: string): RichTextValueFormat {
  return value.trim().startsWith("<") ? "html" : "markdown";
}

interface CommentEditorModalProps {
  comment: Comment | null;
  open: boolean;
  onSave: (id: number, input: CommentUpdate) => Promise<unknown>;
  onClose: () => void;
}

function CommentEditorModal({ comment, open, onSave, onClose }: CommentEditorModalProps) {
  const [content, setContent] = useState("");
  const [contentFormat, setContentFormat] = useState<RichTextValueFormat>("html");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !comment) {
      return;
    }
    setContent(comment.body);
    setContentFormat(valueFormatForComment(comment.body));
  }, [comment, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!comment || !textFromHtml(content)) {
      return;
    }

    setSaving(true);
    try {
      await onSave(comment.id, { body: content, expectedVersion: comment.version });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open={open && Boolean(comment)}
      title="Kommentar bearbeiten"
      icon={<MessageSquare size={20} />}
      breadcrumb={["Kommentare", "Bearbeiten"]}
      onSubmit={submit}
      onClose={onClose}
      saving={saving}
      submitLabel="Speichern"
      cancelLabel="Schließen"
    >
      {comment ? (
        <Section>
          <RichTextInlineField
            value={content}
            valueFormat={contentFormat}
            commitOnBlur={false}
            liveUpdate
            minRows={10}
            testIdPrefix={`comment-thread-comment-${comment.id}-editor`}
            onChange={(value) => {
              setContent(value);
              setContentFormat("html");
            }}
          />
        </Section>
      ) : null}
    </FormModal>
  );
}

function CommentItem({
  comment,
  onEdit,
  onDelete,
}: {
  comment: Comment;
  onEdit: (comment: Comment) => void;
  onDelete: (id: number) => Promise<void>;
}) {
  const valueFormat = valueFormatForComment(comment.body);

  return (
    <article className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <time className="text-xs text-steel-500">
          {formatHumanDate(comment.createdAt)}
        </time>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Bearbeiten"
            title="Bearbeiten"
            icon={<Pencil size={16} />}
            variant="ghost"
            className="h-10 w-10"
            onClick={() => onEdit(comment)}
          />
          <Button
            aria-label="Löschen"
            title="Löschen"
            icon={<Trash2 size={18} />}
            variant="ghost"
            className="h-10 w-10"
            onClick={() => void onDelete(comment.id).catch(() => undefined)}
          />
        </div>
      </div>
      <div
        role="button"
        tabIndex={0}
        className="rounded-md focus:outline-none focus:ring-2 focus:ring-steel-700/10"
        onClick={() => onEdit(comment)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onEdit(comment);
          }
        }}
      >
        <RichTextInlineField
          value={comment.body}
          valueFormat={valueFormat}
          readOnly
          testIdPrefix={`comment-thread-comment-${comment.id}-body`}
          onChange={() => undefined}
        />
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => onEdit(comment)}>
          Bearbeiten
        </Button>
      </div>
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
  onUpdate,
  onDelete,
  entityLabel = "Objekt",
}: CommentThreadProps) {
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  const closeEditor = () => setEditingComment(null);

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
          <CommentItem key={comment.id} comment={comment} onEdit={setEditingComment} onDelete={onDelete} />
        ))}
      </section>
      <CommentEditorModal comment={editingComment} open={Boolean(editingComment)} onSave={onUpdate} onClose={closeEditor} />
    </div>
  );
}
