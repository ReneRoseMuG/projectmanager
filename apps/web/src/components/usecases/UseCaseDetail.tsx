import type { FeatureStatus, UseCase, UseCaseUpdate } from "@taskmanager/shared-types";
import { Save, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { MarkdownEditor } from "../ui/MarkdownEditor";
import { Select } from "../ui/Select";

interface UseCaseDetailProps {
  useCase: UseCase;
  onSave: (id: number, input: UseCaseUpdate) => Promise<void>;
  onDelete: (useCase: UseCase) => void;
}

const statuses: Array<{ value: FeatureStatus; label: string }> = [
  { value: "draft", label: "Entwurf" },
  { value: "active", label: "Aktiv" },
  { value: "done", label: "Erledigt" },
  { value: "archived", label: "Archiviert" }
];

export function UseCaseDetail({ useCase, onSave, onDelete }: UseCaseDetailProps) {
  const [title, setTitle] = useState(useCase.title);
  const [slug, setSlug] = useState(useCase.slug);
  const [status, setStatus] = useState<FeatureStatus>(useCase.status);
  const [description, setDescription] = useState(useCase.description ?? "");
  const [sortOrder, setSortOrder] = useState(useCase.sortOrder);
  const [content, setContent] = useState(useCase.content ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(useCase.title);
    setSlug(useCase.slug);
    setStatus(useCase.status);
    setDescription(useCase.description ?? "");
    setSortOrder(useCase.sortOrder);
    setContent(useCase.content ?? "");
  }, [useCase]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(useCase.id, { title, slug, status, description, sortOrder, content });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="grid gap-4 rounded-lg border border-line bg-white p-4 shadow-sm" onSubmit={submit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{useCase.title}</h2>
          <p className="text-xs text-slate-500">{useCase.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => onDelete(useCase)}>
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
          className="min-h-20 rounded-md border border-line px-3 py-2 outline-none focus:border-teal"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <div className="grid gap-1 text-sm font-medium">
        Inhalt
        <MarkdownEditor initialContent={content} placeholder="Use-Case-Inhalt" onChange={setContent} />
      </div>
    </form>
  );
}
