import type { BacklogItem, BacklogItemInput, BacklogStatus, DraftComment, Feature } from "@taskmanager/shared-types";
import { BookOpen, Inbox, ListChecks, ListTodo, Send, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";
import { SaveStatus } from "../ui/SaveStatus";
import { uploadContentImage } from "../../api/content-images";
import { useAuth } from "../../hooks/useAuth";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useHasPermission } from "../../hooks/usePermissions";
import { resolveCatalogEntryKey } from "../../utils/catalogs";
import { JournalPanel } from "../journal/JournalPanel";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { CatalogSelect } from "../ui/CatalogSelect";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { FormSidebar } from "../ui/FormSidebar";
import { Input } from "../ui/Input";
import { ParentContextField } from "../ui/ParentContextField";
import { PendingCommentList } from "../ui/PendingCommentList";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";
import { UserSelectField } from "../users/UserSelectField";

interface BacklogItemFormProps {
  open: boolean;
  item?: BacklogItem | null;
  features: Feature[];
  onSubmit: (input: BacklogItemInput) => Promise<BacklogItem | void>;
  onAutoSave?: (input: BacklogItemInput) => Promise<void>;
  onPostCreate?: (itemId: number, pending: { comments: DraftComment[] }) => Promise<void>;
  onClose: () => void;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onOpenInTab?: () => void;
}

export function BacklogItemForm({ open, item, features, onSubmit, onAutoSave, onPostCreate, onClose, variant = "modal", closeOnSubmit = true, onOpenInTab }: BacklogItemFormProps) {
  const comments = useEntityComments("backlogItem", item?.id);
  const auth = useAuth();
  const catalogs = useCatalogs();
  const canReadJournal = useHasPermission("journal", "read");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<BacklogStatus>("open");
  const [featureId, setFeatureId] = useState<number | null>(null);
  const [responsibleUserId, setResponsibleUserId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
  const formStateRef = useRef({ title, description, status, featureId, responsibleUserId, sortOrder });
  formStateRef.current = { title, description, status, featureId, responsibleUserId, sortOrder };
  const autoSave = useAutoSave({
    enabled: !!item && !!onAutoSave,
    save: async () => {
      if (!onAutoSave) return;
      const s = formStateRef.current;
      await onAutoSave({
        title: s.title,
        description: s.description,
        status: resolveCatalogEntryKey(catalogs.entries, "workStatus", s.status, "open") ?? "open",
        featureId: s.featureId,
        responsibleUserId: s.responsibleUserId,
        sortOrder: s.sortOrder,
      });
    },
  });
  const af = item ? autoSave.flush : undefined;

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(item?.title ?? "");
    setDescription(item?.description ?? "");
    setStatus(item?.status ?? "open");
    setFeatureId(item?.featureId ?? null);
    setResponsibleUserId(item ? item.responsibleUserId : (auth.user?.id ?? null));
    setSortOrder(item?.sortOrder ?? 0);
    if (!item) {
      setPendingComments([]);
    }
  }, [auth.user?.id, open, item]);

  useEffect(() => {
    if (open) {
      setStatus((currentStatus) => resolveCatalogEntryKey(catalogs.entries, "workStatus", currentStatus, "open") ?? "open");
    }
  }, [catalogs.entries, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await onSubmit({ title, description, status: resolveCatalogEntryKey(catalogs.entries, "workStatus", status, "open"), featureId, responsibleUserId, sortOrder });
      if (!item && created && onPostCreate) {
        await onPostCreate(created.id, { comments: pendingComments });
      }
      if (closeOnSubmit) {
        onClose();
      }
    } catch {
      // Error feedback is handled by the page-level toast.
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      title={item ? "Backlog-Item bearbeiten" : "Backlog-Item anlegen"}
      entityTitle={item?.title}
      icon={<Inbox size={20} />}
      breadcrumb={["Backlog"]}
      onSubmit={submit}
      saving={saving}
      hideFooter={!!item}
      saveStatus={item ? <SaveStatus status={autoSave.status} errorMessage={autoSave.errorMessage} /> : undefined}
      onClose={onClose}
      variant={variant}
      onOpenInTab={onOpenInTab}
      contentLayout="flush"
    >
      <div className="flex min-h-0 w-full flex-1">
        <div className="min-w-0 flex-1 overflow-auto p-2.5">
          <div className="grid w-full gap-4">
            <Section title="Stammdaten">
              <FormField label="Titel" required>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={af} required />
              </FormField>
              <FormField label="Beschreibung" className="mt-4">
                <RichTextInlineField value={description} placeholder="Was soll später umgesetzt werden?" minRows={12} testIdPrefix="backlog-item-description" onImageUpload={uploadContentImage} onChange={(v) => { setDescription(v); formStateRef.current = { ...formStateRef.current, description: v }; af?.(); }} />
              </FormField>
            </Section>

            <Section title="Kommentare">
              {item ? (
                <>
                  {comments.error ? <div className="mb-3 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{comments.error}</div> : null}
                  <CommentThread comments={comments.comments} entityLabel="Backlog-Item" onCreate={comments.createComment} onUpdate={comments.updateComment} onDelete={comments.removeComment} />
                </>
              ) : (
                <PendingCommentList
                  comments={pendingComments}
                  onAdd={(comment) => setPendingComments((items) => [...items, comment])}
                  onUpdate={(index, comment) => setPendingComments((items) => items.map((item, itemIndex) => (itemIndex === index ? comment : item)))}
                  onRemove={(index) => setPendingComments((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                />
              )}
            </Section>

            {item && canReadJournal ? (
              <Section title="Journal" fill>
                <JournalPanel objectType="backlogItem" objectId={item.id} />
              </Section>
            ) : null}
          </div>
        </div>

        <FormSidebar storageKey="backlog-item-form-sidebar">
          <ParentContextField parents={item?.parentContexts} />
          <CatalogSelect label="Status" icon={<ListChecks size={14} />} variant="panel" kind="workStatus" value={status} onChange={(v) => { setStatus(v); formStateRef.current = { ...formStateRef.current, status: v }; af?.(); }} />
          <UserSelectField label="Verantwortlich" icon={<Users size={14} />} variant="panel" value={responsibleUserId} selectedUser={item?.responsibleUser ?? null} onChange={(v) => { setResponsibleUserId(v); formStateRef.current = { ...formStateRef.current, responsibleUserId: v }; af?.(); }} />
          <Select label="Feature" icon={<BookOpen size={14} />} variant="panel" value={featureId ?? ""} onChange={(event) => { const v = event.target.value ? Number(event.target.value) : null; setFeatureId(v); formStateRef.current = { ...formStateRef.current, featureId: v }; af?.(); }}>
            <option value="">Ohne Feature</option>
            {features.map((feature) => (
              <option key={feature.id} value={feature.id}>
                {feature.title}
              </option>
            ))}
          </Select>
          <FormField label="Sortierung" icon={<ListTodo size={14} />} variant="panel">
            <Input type="number" value={sortOrder} onChange={(event) => { const v = Number(event.target.value); setSortOrder(v); formStateRef.current = { ...formStateRef.current, sortOrder: v }; }} onBlur={af} />
          </FormField>
          <Button icon={<Send size={16} />} disabled>
            In Task umwandeln
          </Button>
        </FormSidebar>
      </div>
    </FormModal>
  );
}
