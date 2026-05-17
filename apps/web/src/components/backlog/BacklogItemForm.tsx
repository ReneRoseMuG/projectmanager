import type { BacklogItem, BacklogItemInput, BacklogStatus, Feature, Priority } from "@taskmanager/shared-types";
import { Inbox, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Select } from "../ui/Select";
import { useEntityComments } from "../../hooks/useEntityComments";

interface BacklogItemFormProps {
  open: boolean;
  item?: BacklogItem | null;
  features: Feature[];
  onSubmit: (input: BacklogItemInput) => Promise<void>;
  onClose: () => void;
}

const statuses: Array<{ value: BacklogStatus; label: string; activeClassName: string }> = [
  { value: "open", label: "Offen", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" },
  { value: "in_progress", label: "In Arbeit", activeClassName: "data-[active=true]:bg-tangerine data-[active=true]:text-white" },
  { value: "done", label: "Erledigt", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" },
  { value: "rejected", label: "Verworfen", activeClassName: "data-[active=true]:bg-crimson data-[active=true]:text-white" }
];

const priorities: Array<{ value: Priority; label: string; activeClassName: string }> = [
  { value: "low", label: "Niedrig", activeClassName: "data-[active=true]:bg-steel-500 data-[active=true]:text-white" },
  { value: "medium", label: "Mittel", activeClassName: "data-[active=true]:bg-mustard data-[active=true]:text-mustard-dark" },
  { value: "high", label: "Hoch", activeClassName: "data-[active=true]:bg-tangerine data-[active=true]:text-white" },
  { value: "urgent", label: "Dringend", activeClassName: "data-[active=true]:bg-crimson data-[active=true]:text-white" }
];

export function BacklogItemForm({ open, item, features, onSubmit, onClose }: BacklogItemFormProps) {
  const comments = useEntityComments("backlogItem", item?.id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<BacklogStatus>("open");
  const [priority, setPriority] = useState<Priority>("medium");
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
    setPriority(item?.priority ?? "medium");
    setFeatureId(item?.featureId ?? null);
    setSortOrder(item?.sortOrder ?? 0);
  }, [open, item]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ title, description, status, priority, featureId, sortOrder });
      onClose();
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
      subtitle={item ? `Zuletzt aktualisiert am ${formatHumanDate(item.updatedAt)}` : "Idee erfassen und für spätere Umsetzung vorbereiten."}
      icon={<Inbox size={21} />}
      breadcrumb={["Backlog", item ? `Item #${item.id}` : "Neues Item"]}
      onSubmit={submit}
      saving={saving}
      onClose={onClose}
    >
      <Section title="Stammdaten">
        <FormField label="Titel" required>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </FormField>
        <FormField label="Beschreibung" className="mt-4">
          <RichTextEditor content={description} placeholder="Was soll später umgesetzt werden?" toolbar="minimal" minHeight="8rem" onChange={setDescription} />
        </FormField>
      </Section>

      <Section title="Status & Priorität">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status">
            <SegmentedControl value={status} options={statuses} onChange={setStatus} />
          </FormField>
          <FormField label="Priorität">
            <SegmentedControl value={priority} options={priorities} onChange={setPriority} />
          </FormField>
        </div>
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
