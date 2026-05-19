import type { Feature, FeatureStatus, FeatureUpdate } from "@taskmanager/shared-types";
import { LinkIcon, RotateCcw, Save, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";
import { SegmentedControl } from "../ui/SegmentedControl";

interface FeatureDetailProps {
  feature: Feature;
  onSave: (id: number, input: FeatureUpdate) => Promise<void>;
  onDelete: (feature: Feature) => void;
}

const statuses: Array<{ value: FeatureStatus; label: string; activeClassName: string }> = [
  { value: "draft", label: "Entwurf", activeClassName: "data-[active=true]:bg-mustard data-[active=true]:text-mustard-dark" },
  { value: "active", label: "Aktiv", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" },
  { value: "done", label: "Erledigt", activeClassName: "data-[active=true]:bg-violet data-[active=true]:text-white" },
  { value: "archived", label: "Archiviert", activeClassName: "data-[active=true]:bg-steel-100 data-[active=true]:text-steel-700" }
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
      await onSave(feature.id, { title, slug, status, description, sortOrder, content, expectedVersion: feature.version });
    } finally {
      setSaving(false);
    }
  };

  const resetFields = () => {
    setTitle(feature.title);
    setSlug(feature.slug);
    setStatus(feature.status);
    setDescription(feature.description ?? "");
    setSortOrder(feature.sortOrder);
    setContent(feature.content ?? "");
  };

  return (
    <form id="feature-detail-form" className="grid gap-4" onSubmit={submit}>
      <Section title="Stammdaten">
        <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Titel" required className="min-w-0">
          <input className="h-11 w-full min-w-0 rounded-lg border border-line px-3 outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </FormField>
        <FormField label="Slug" required className="min-w-0">
          <span className="relative min-w-0">
            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" size={16} />
            <input className="h-11 w-full min-w-0 rounded-lg border border-line pl-9 pr-3 font-mono text-sm outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10" value={slug} onChange={(event) => setSlug(event.target.value)} required />
          </span>
        </FormField>
        </div>
      </Section>

      <Section title="Status & Sortierung">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
        <FormField label="Status" className="min-w-0">
          <SegmentedControl value={status} options={statuses} onChange={setStatus} />
        </FormField>
        <FormField label="Sortierung" className="min-w-0">
          <input className="h-11 w-full min-w-0 rounded-lg border border-line px-3 outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10" type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
        </FormField>
      </div>
      </Section>

      <Section title="Kurzbeschreibung">
      <div className="grid gap-1 text-sm font-medium">
        {/* TODO: migrate existing markdown content to HTML. */}
        <RichTextEditor content={description} placeholder="Kurzbeschreibung" toolbar="full" minHeight="6rem" onChange={setDescription} />
      </div>
      </Section>

      <Section title="Inhalt">
      <div className="grid gap-2 text-sm font-medium">
        {/* TODO: migrate existing markdown content to HTML. */}
        <RichTextEditor content={content} placeholder="Feature-Inhalt" onChange={setContent} />
      </div>
      </Section>

      <footer className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/95 p-4 shadow-panel backdrop-blur">
        <Button className="text-crimson hover:bg-crimson/10" icon={<Trash2 size={18} />} variant="ghost" onClick={() => onDelete(feature)}>
          Löschen
        </Button>
        <div className="flex gap-2">
          <Button icon={<RotateCcw size={16} />} variant="secondary" onClick={resetFields}>
            Verwerfen
          </Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
            Speichern
          </Button>
        </div>
      </footer>
    </form>
  );
}
