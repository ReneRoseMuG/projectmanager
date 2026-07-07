import type { DraftComment } from "@taskmanager/shared-types";
import { MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useHasPermission } from "../../hooks/usePermissions";
import { richTextToHtml } from "../../utils/richText";
import { Button } from "./Button";
import { CommentBodyModal, commentTextFromHtml, commentValueFormat } from "./CommentBodyModal";
import { EmptyState } from "./EmptyState";
import { ItemCard } from "./ItemCard";
import { ItemRow } from "./ItemRow";
import { ListBoardView, type ListBoardMode } from "./ListBoardView";
import { RichTextInlineField } from "./rich-text-inline-field";

interface PendingCommentListProps {
  comments: DraftComment[];
  onAdd: (comment: DraftComment) => void;
  onUpdate: (index: number, comment: DraftComment) => void;
  onRemove: (index: number) => void;
}

type PendingCommentItem = DraftComment & {
  id: number;
  index: number;
};

type PendingCommentModalState =
  | { mode: "create" }
  | { mode: "edit"; item: PendingCommentItem };

function pendingPreview(comment: DraftComment) {
  return commentTextFromHtml(comment.text) || "Leerer Kommentar";
}

export function PendingCommentList({ comments, onAdd, onUpdate, onRemove }: PendingCommentListProps) {
  const canWriteComments = useHasPermission("comments", "write");
  const [mode, setMode] = useState<ListBoardMode>("list");
  const [modalState, setModalState] = useState<PendingCommentModalState | null>(null);
  const items = useMemo(
    () => comments.map((comment, index) => ({ ...comment, id: index + 1, index })),
    [comments],
  );

  const closeModal = () => setModalState(null);

  const saveComment = (body: string) => {
    if (!modalState) {
      return;
    }
    const normalizedBody = body.trim();
    if (modalState.mode === "create") {
      onAdd({ text: normalizedBody });
      return;
    }
    onUpdate(modalState.item.index, { text: normalizedBody });
  };

  const editingItem = modalState?.mode === "edit" ? modalState.item : null;

  return (
    <div className="grid min-h-0 gap-4">
      <ListBoardView
        items={items}
        mode={mode}
        onModeChange={setMode}
        onAdd={() => setModalState({ mode: "create" })}
        addLabel="Kommentar vormerken"
        showToolbarAdd={canWriteComments}
        emptyState={
          <EmptyState
            icon={<MessageSquarePlus size={22} />}
            title="Keine Kommentare vorgemerkt"
            body="Kommentare werden lokal gesammelt."
            tone="teal"
            variant="tinted"
          />
        }
        renderCard={(comment) => (
          <ItemCard
            onOpen={canWriteComments ? () => setModalState({ mode: "edit", item: comment }) : undefined}
            onEdit={canWriteComments ? () => setModalState({ mode: "edit", item: comment }) : undefined}
            onDelete={canWriteComments ? () => onRemove(comment.index) : undefined}
            header={
              <div className="grid gap-1">
                <p className="text-sm font-semibold text-ink">Vorgemerkter Kommentar</p>
                <p className="text-xs text-steel-500">Wird nach dem Speichern angelegt</p>
              </div>
            }
            body={
              <RichTextInlineField
                value={richTextToHtml(comment.text)}
                valueFormat={commentValueFormat()}
                readOnly
                testIdPrefix={`pending-comment-${comment.index}-body`}
                onChange={() => undefined}
              />
            }
          />
        )}
        renderRow={(comment) => (
          <ItemRow
            title="Vorgemerkter Kommentar"
            description={pendingPreview(comment)}
            meta={<span className="text-xs text-steel-500">Nach dem Speichern</span>}
            actions={
              canWriteComments ? (
                <>
                  <Button
                    aria-label="Kommentar bearbeiten"
                    title="Bearbeiten"
                    variant="ghost"
                    icon={<Pencil size={16} />}
                    onClick={() => setModalState({ mode: "edit", item: comment })}
                  />
                  <Button
                    aria-label="Kommentar entfernen"
                    title="Entfernen"
                    variant="ghost"
                    icon={<Trash2 size={16} />}
                    onClick={() => onRemove(comment.index)}
                  />
                </>
              ) : undefined
            }
            onOpen={canWriteComments ? () => setModalState({ mode: "edit", item: comment }) : undefined}
          />
        )}
      />

      <p className="rounded-md border border-line bg-shell px-3 py-2 text-xs font-semibold text-steel-600">
        Kommentare werden nach dem Speichern angelegt.
      </p>

      <CommentBodyModal
        open={Boolean(modalState)}
        title={modalState?.mode === "create" ? "Kommentar vormerken" : "Kommentar bearbeiten"}
        breadcrumb={["Kommentare", modalState?.mode === "create" ? "Vormerken" : "Bearbeiten"]}
        initialBody={editingItem?.text ?? ""}
        placeholder={modalState?.mode === "create" ? "Kommentar vormerken" : "Kommentar bearbeiten"}
        submitLabel={modalState?.mode === "create" ? "Hinzufügen" : "Speichern"}
        testIdPrefix={editingItem ? `pending-comment-${editingItem.index}-editor` : "pending-comment-create-editor"}
        onSave={saveComment}
        onClose={closeModal}
      />
    </div>
  );
}
