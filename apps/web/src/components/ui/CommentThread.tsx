import type { Comment, CommentUpdate } from "@taskmanager/shared-types";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useHasPermission } from "../../hooks/usePermissions";
import { formatHumanDate } from "../../utils/date";
import { Button } from "./Button";
import { CommentBodyModal, commentTextFromHtml, commentValueFormat } from "./CommentBodyModal";
import { EmptyState } from "./EmptyState";
import { ItemCard } from "./ItemCard";
import { ItemRow } from "./ItemRow";
import { ListBoardView, type ListBoardMode } from "./ListBoardView";
import { RichTextInlineField } from "./rich-text-inline-field";

interface CommentThreadProps {
  comments: Comment[];
  onCreate: (input: { body: string }) => Promise<unknown>;
  onUpdate: (id: number, input: CommentUpdate) => Promise<unknown>;
  onDelete: (id: number) => Promise<void>;
  entityLabel?: string;
}

type CommentModalState =
  | { mode: "create" }
  | { mode: "edit"; comment: Comment };

function commentPreview(comment: Comment) {
  return commentTextFromHtml(comment.body) || "Leerer Kommentar";
}

function CommentCard({
  comment,
  canWrite,
  canDelete,
  onEdit,
  onDelete,
}: {
  comment: Comment;
  canWrite: boolean;
  canDelete: boolean;
  onEdit: (comment: Comment) => void;
  onDelete: (id: number) => Promise<void>;
}) {
  const valueFormat = commentValueFormat(comment.body);

  return (
    <ItemCard
      onOpen={canWrite ? () => onEdit(comment) : undefined}
      onEdit={canWrite ? () => onEdit(comment) : undefined}
      onDelete={canDelete ? () => void onDelete(comment.id).catch(() => undefined) : undefined}
      header={
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-ink">Kommentar</p>
          <time className="text-xs text-steel-500">{formatHumanDate(comment.createdAt)}</time>
        </div>
      }
      body={
        <RichTextInlineField
          value={comment.body}
          valueFormat={valueFormat}
          readOnly
          testIdPrefix={`comment-thread-comment-${comment.id}-body`}
          onChange={() => undefined}
        />
      }
    />
  );
}

function CommentRow({
  comment,
  canWrite,
  canDelete,
  onEdit,
  onDelete,
}: {
  comment: Comment;
  canWrite: boolean;
  canDelete: boolean;
  onEdit: (comment: Comment) => void;
  onDelete: (id: number) => Promise<void>;
}) {
  const actions =
    canWrite || canDelete ? (
      <>
        {canWrite ? (
          <Button
            aria-label="Bearbeiten"
            title="Bearbeiten"
            variant="ghost"
            icon={<Pencil size={16} />}
            onClick={() => onEdit(comment)}
          />
        ) : null}
        {canDelete ? (
          <Button
            aria-label="Löschen"
            title="Löschen"
            variant="ghost"
            icon={<Trash2 size={17} />}
            onClick={() => void onDelete(comment.id).catch(() => undefined)}
          />
        ) : null}
      </>
    ) : undefined;

  return (
    <ItemRow
      title="Kommentar"
      description={commentPreview(comment)}
      meta={<time className="text-xs text-steel-500">{formatHumanDate(comment.createdAt)}</time>}
      actions={actions}
      onOpen={canWrite ? () => onEdit(comment) : undefined}
    />
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
  const canWriteComments = useHasPermission("comments", "write");
  const canDeleteComments = useHasPermission("comments", "delete");
  const [mode, setMode] = useState<ListBoardMode>("list");
  const [modalState, setModalState] = useState<CommentModalState | null>(null);

  const closeModal = () => setModalState(null);

  const saveComment = async (body: string) => {
    if (!modalState) {
      return;
    }
    if (modalState.mode === "create") {
      await onCreate({ body });
      return;
    }
    await onUpdate(modalState.comment.id, {
      body,
      expectedVersion: modalState.comment.version,
    });
  };

  const editingComment = modalState?.mode === "edit" ? modalState.comment : null;

  return (
    <>
      <ListBoardView
        items={comments}
        mode={mode}
        onModeChange={setMode}
        onAdd={() => setModalState({ mode: "create" })}
        addLabel="Kommentar anlegen"
        showToolbarAdd={canWriteComments}
        emptyState={
          <EmptyState
            icon={<MessageSquare size={22} />}
            title="Noch keine Kommentare"
            body={`Kommentare und Rückfragen zu diesem ${entityLabel} erscheinen hier.`}
            tone="violet"
            variant="tinted"
          />
        }
        renderCard={(comment) => (
          <CommentCard
            comment={comment}
            canWrite={canWriteComments}
            canDelete={canDeleteComments}
            onEdit={(item) => setModalState({ mode: "edit", comment: item })}
            onDelete={onDelete}
          />
        )}
        renderRow={(comment) => (
          <CommentRow
            comment={comment}
            canWrite={canWriteComments}
            canDelete={canDeleteComments}
            onEdit={(item) => setModalState({ mode: "edit", comment: item })}
            onDelete={onDelete}
          />
        )}
      />
      <CommentBodyModal
        open={Boolean(modalState)}
        title={modalState?.mode === "create" ? "Kommentar anlegen" : "Kommentar bearbeiten"}
        breadcrumb={["Kommentare", modalState?.mode === "create" ? "Anlegen" : "Bearbeiten"]}
        initialBody={editingComment?.body ?? ""}
        placeholder={modalState?.mode === "create" ? "Kommentar schreiben" : "Kommentar bearbeiten"}
        submitLabel={modalState?.mode === "create" ? "Anlegen" : "Speichern"}
        testIdPrefix={editingComment ? `comment-thread-comment-${editingComment.id}-editor` : "comment-thread-create-editor"}
        onSave={saveComment}
        onClose={closeModal}
      />
    </>
  );
}
