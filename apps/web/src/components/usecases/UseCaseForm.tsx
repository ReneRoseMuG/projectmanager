import type { FeatureStatus, UseCase, UseCaseInput } from "@taskmanager/shared-types";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { MarkdownEditor } from "../ui/MarkdownEditor";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

interface UseCaseFormProps {
  open: boolean;
  useCase?: UseCase | null;
  onSubmit: (input: UseCaseInput) => Promise<void>;
  onClose: () => void;
}

const statuses: Array<{ value: FeatureStatus; label: string }> = [
  { value: "draft", label: "Entwurf" },
  { value: "active", label: "Aktiv" },
  { value: "done", label: "Erledigt" },
  { value: "archived", label: "Archiviert" }
];

export function UseCaseForm({ open, useCase, onSubmit, onClose }: UseCaseFormProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<FeatureStatus>("draft");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(useCase?.title ?? "");
    setSlug(useCase?.slug ?? "");
    setStatus(useCase?.status ?? "draft");
    setDescription(useCase?.description ?? "");
    setSortOrder(useCase?.sortOrder ?? 0);
    setContent(useCase?.content ?? "");
  }, [open, useCase]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ title, slug, status, description, sortOrder, content });
      onClose();
    } catch {
      // Error feedback is handled by the page-level toast.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={useCase ? "Use Case bearbeiten" : "Neuer Use Case"} size="xl" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Titel
            <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Slug
            <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" value={slug} onChange={(event) => setSlug(event.target.value)} required />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as FeatureStatus)}>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <label className="grid gap-1 text-sm font-medium">
            Sortierung
            <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Kurzbeschreibung
          <textarea
            className="min-h-24 rounded-md border border-line px-3 py-2 outline-none focus:border-teal"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="grid gap-1 text-sm font-medium">
          Inhalt
          <MarkdownEditor initialContent={content} placeholder="Use-Case-Inhalt" onChange={setContent} />
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
