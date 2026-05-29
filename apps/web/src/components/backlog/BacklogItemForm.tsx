import type { BacklogItem, BacklogItemInput, BacklogStatus, DraftComment, Feature } from "@taskmanager/shared-types";
import { Inbox, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { uploadContentImage } from "../../api/content-images";
import { useAuth } from "../../hooks/useAuth";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useHasPermission } from "../../hooks/usePermissions";
import { resolveCatalogEntryKey } from "../../utils/catalogs";
import { JournalPanel } from "../journal/JournalPanel";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { FormSidebar } from "../ui/FormSidebar";
import { Input } from "../ui/Input";
import { ParentContextField } from "../ui/ParentContextField";
import { PendingCommentList } from "../ui/PendingCommentList";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";
import { StatusToggle } from "../ui/StatusToggle";
import { UserSelectField } from "../users/UserSelectField";

interface BacklogItemFormProps {
  open: boolean;
  item?: BacklogItem | null;
  features: Feature[];
  onSubmit: (input: BacklogItemInput) => Promise<BacklogItem | void>;
  onPostCreate?: (itemId: number, pending: { comments: DraftComment[] }) => Promise<void>;
  onClose: () => void;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onOpenInTab?: () => void;
}

export function BacklogItemForm({ open, item, features, onSubmit, onPostCreate, onClose, variant = "modal", closeOnSubmit = true, onOpenInTab }: BacklogItemFormProps) {
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
  const selectedFeature = useMemo(() => features.find((feature) => feature.id === featureId) ?? null, [featureId, features]);

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
      icon={<Inbox size={21} />}
      breadcrumb={["Backlog", item ? `Item #${item.id}` : "Neues Item"]}
      onSubmit={submit}
      saving={saving}
      onClose={onClose}
      variant={variant}
      onOpenInTab={onOpenInTab}
      contentLayout="flush"
    >
      <div className="flex min-h-0 w-full flex-1">
        <div className="min-w-0 flex-1 overflow-auto p-4 md:p-5">
          <div className="mx-auto grid w-full max-w-5xl gap-4">
            <ParentContextField parents={item?.parentContexts} />
            <Section title="Stammdaten">
              <FormField label="Titel" required>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
              </FormField>
              <FormField label="Beschreibung" className="mt-4">
                <RichTextInlineField value={description} placeholder="Was soll später umgesetzt werden?" minRows={12} testIdPrefix="backlog-item-description" onImageUpload={uploadContentImage} onChange={setDescription} />
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
          <div className="grid gap-4">
            <FormField label="Status">
              <StatusToggle kind="workStatus" value={status} onChange={setStatus} />
            </FormField>
            <UserSelectField label="Verantwortlich" value={responsibleUserId} selectedUser={item?.responsibleUser ?? null} onChange={setResponsibleUserId} />
            <Select label="Feature" value={featureId ?? ""} onChange={(event) => setFeatureId(event.target.value ? Number(event.target.value) : null)}>
              <option value="">Ohne Feature</option>
              {features.map((feature) => (
                <option key={feature.id} value={feature.id}>
                  {feature.title}
                </option>
              ))}
            </Select>
            <div className="rounded-md border border-line bg-white p-3">
              <p className="text-sm font-semibold text-ink">{selectedFeature ? selectedFeature.title : "Ohne Feature-Bezug"}</p>
              <p className="truncate text-xs text-steel-500">{selectedFeature ? "Feature zugeordnet" : "Feature zuordnen"}</p>
            </div>
            <FormField label="Sortierung">
              <Input type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
            </FormField>
            <Button icon={<Send size={16} />} disabled>
              In Task umwandeln
            </Button>
          </div>
        </FormSidebar>
      </div>
    </FormModal>
  );
}
