import type { BacklogItem, BacklogItemInput, BacklogStatus, Feature } from "@taskmanager/shared-types";
import { Inbox, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";
import { useEntityComments } from "../../hooks/useEntityComments";
import { StatusToggle } from "../ui/StatusToggle";

interface BacklogItemFormProps {
  open: boolean;
  item?: BacklogItem | null;
  features: Feature[];
  onSubmit: (input: BacklogItemInput) => Promise<void>;
  onClose: () => void;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
}

export function BacklogItemForm({ open, item, features, onSubmit, onClose, variant = "modal", closeOnSubmit = true }: BacklogItemFormProps) {
  const comments = useEntityComments("backlogItem", item?.id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<BacklogStatus>("open");
  const [featureId, setFeatureId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const selectedFeature = useMemo(() => features.find((feature) => feature.id === featureId) ?? null, [featureId, features]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(item?.title ?? "");
    setDescription(item?.description ?? "");
    setStatus(item?.status ?? "open");
    setFeatureId(item?.featureId ?? null);
    setSortOrder(item?.sortOrder ?? 0);
  }, [open, item]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ title, description, status, featureId, sortOrder });
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
    >
      <Section title="Stammdaten">
        <FormField label="Titel" required>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </FormField>
        <FormField label="Beschreibung" className="mt-4">
          <RichTextInlineField value={description} placeholder="Was soll später umgesetzt werden?" minRows={12} testIdPrefix="backlog-item-description" onChange={setDescription} />
        </FormField>
      </Section>

      <Section title="Status">
        <FormField label="Status">
          <StatusToggle kind="workStatus" value={status} onChange={setStatus} />
        </FormField>
      </Section>

      <Section title="Zuordnung">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
          <div className="rounded-lg border border-line bg-shell/60 p-3">
            <p className="text-sm font-semibold text-ink">{selectedFeature ? selectedFeature.title : "Ohne Feature-Bezug"}</p>
            <p className="truncate font-mono text-xs text-slate-500">{selectedFeature ? selectedFeature.slug : "Feature zuordnen"}</p>
          </div>
          <FormField label="Sortierung">
            <Input type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
          </FormField>
        </div>
        <div className="mt-4">
          <Select label="Feature" value={featureId ?? ""} onChange={(event) => setFeatureId(event.target.value ? Number(event.target.value) : null)}>
            <option value="">Ohne Feature</option>
            {features.map((feature) => (
              <option key={feature.id} value={feature.id}>
                {feature.title}
              </option>
            ))}
          </Select>
        </div>
      </Section>

      <Section title="Umwandlung">
        <Button icon={<Send size={16} />} disabled>
          In Task umwandeln
        </Button>
      </Section>

      {item ? (
        <Section title="Kommentare">
          {comments.error ? <div className="mb-3 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{comments.error}</div> : null}
          <CommentThread comments={comments.comments} entityLabel="Backlog-Item" onCreate={comments.createComment} onDelete={comments.removeComment} />
        </Section>
      ) : null}
    </FormModal>
  );
}
