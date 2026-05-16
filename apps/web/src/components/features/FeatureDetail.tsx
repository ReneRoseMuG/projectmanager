import type { Feature, FeatureStatus, FeatureUpdate } from "@taskmanager/shared-types";
import { Save, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { MarkdownEditor } from "../ui/MarkdownEditor";
import { Select } from "../ui/Select";

interface FeatureDetailProps {
  feature: Feature;
  onSave: (id: number, input: FeatureUpdate) => Promise<void>;
  onDelete: (feature: Feature) => void;
}

const statuses: Array<{ value: FeatureStatus; label: string }> = [
  { value: "draft", label: "Entwurf" },
  { value: "active", label: "Aktiv" },
  { value: "done", label: "Erledigt" },
  { value: "archived", label: "Archiviert" }
];

export function FeatureDetail({ feature, onSave, onDelete }: FeatureDetailProps) {
  const [title, setTitle] = useState(feature.title);
  const [slug, setSlug] = useState(feature.slug);
  const [status, setStatus] = useState<FeatureStatus>(feature.status);
  const [description, setDescription] = useState(feature.description ?? "");
  const [sortOrder, setSortOrder] = useState(feature.sortOrder);
  const [content, setContent] = useState(feature.content ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(feature.title);
    setSlug(feature.slug);
    setStatus(feature.status);
    setDescription(feature.description ?? "");
    setSortOrder(feature.sortOrder);
    setContent(feature.content ?? "");
  }, [feature]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(feature.id, { title, slug, status, description, sortOrder, content });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="grid gap-5 rounded-lg border border-line bg-white p-5 shadow-sm" onSubmit={submit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Feature</h2>
          <p className="text-sm text-slate-600">{feature.useCaseCount} Use Cases</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => onDelete(feature)}>
            Löschen
          </Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
            Speichern
          </Button>
        </div>
      </div>

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
        <MarkdownEditor initialContent={content} placeholder="Feature-Inhalt" onChange={setContent} />
      </div>
    </form>
  );
}
