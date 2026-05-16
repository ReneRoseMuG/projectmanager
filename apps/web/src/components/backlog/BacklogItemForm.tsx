import type { BacklogItem, BacklogItemInput, BacklogStatus, Feature, Priority } from "@taskmanager/shared-types";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

interface BacklogItemFormProps {
  open: boolean;
  item?: BacklogItem | null;
  features: Feature[];
  onSubmit: (input: BacklogItemInput) => Promise<void>;
  onClose: () => void;
}

const statuses: Array<{ value: BacklogStatus; label: string }> = [
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "done", label: "Erledigt" },
  { value: "rejected", label: "Verworfen" }
];

const priorities: Array<{ value: Priority; label: string }> = [
  { value: "low", label: "Niedrig" },
  { value: "medium", label: "Mittel" },
  { value: "high", label: "Hoch" },
  { value: "urgent", label: "Dringend" }
];

export function BacklogItemForm({ open, item, features, onSubmit, onClose }: BacklogItemFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<BacklogStatus>("open");
  const [priority, setPriority] = useState<Priority>("medium");
  const [featureId, setFeatureId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

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
    <Modal open={open} title={item ? "Backlog-Item bearbeiten" : "Neues Backlog-Item"} onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm font-medium">
          Titel
          <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Beschreibung
          <textarea
            className="min-h-24 rounded-md border border-line px-3 py-2 outline-none focus:border-teal"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as BacklogStatus)}>
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select label="Priorität" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {priorities.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <label className="grid gap-1 text-sm font-medium">
            Feature
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-teal" value={featureId ?? ""} onChange={(event) => setFeatureId(event.target.value ? Number(event.target.value) : null)}>
              <option value="">Ohne Feature</option>
              {features.map((feature) => (
                <option key={feature.id} value={feature.id}>
                  {feature.title}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Sortierung
            <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
            Speichern
          </Button>
        </div>
      </form>
    </Modal>
  );
}
