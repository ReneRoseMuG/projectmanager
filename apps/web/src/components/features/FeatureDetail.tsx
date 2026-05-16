import type { Feature, FeatureStatus, FeatureUpdate } from "@taskmanager/shared-types";
import { LinkIcon, RotateCcw, Save } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";
import { MarkdownEditor } from "../ui/MarkdownEditor";

interface FeatureDetailProps {
  feature: Feature;
  onSave: (id: number, input: FeatureUpdate) => Promise<void>;
  onDelete: (feature: Feature) => void;
}

const statuses: Array<{ value: FeatureStatus; label: string; className: string }> = [
  { value: "draft", label: "Entwurf", className: "data-[active=true]:bg-mustard data-[active=true]:text-[#6E5800]" },
  { value: "active", label: "Aktiv", className: "data-[active=true]:bg-fern data-[active=true]:text-white" },
  { value: "done", label: "Erledigt", className: "data-[active=true]:bg-violet data-[active=true]:text-white" },
  { value: "archived", label: "Archiviert", className: "data-[active=true]:bg-steel-100 data-[active=true]:text-steel-700" }
];

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <span>
      {children}
      {required ? <span className="text-crimson">*</span> : null}
    </span>
  );
}

function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-xl border border-line bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}

export function FeatureDetail({ feature, onSave }: FeatureDetailProps) {
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
      <FormCard title="Stammdaten">
        <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          <FieldLabel required>Titel</FieldLabel>
          <input className="h-11 rounded-lg border border-line px-3 outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          <FieldLabel required>Slug</FieldLabel>
          <span className="relative">
            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" size={16} />
            <input className="h-11 w-full rounded-lg border border-line pl-9 pr-3 font-mono text-sm outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10" value={slug} onChange={(event) => setSlug(event.target.value)} required />
          </span>
        </label>
        </div>
      </FormCard>

      <FormCard title="Status & Sortierung">
      <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
        <div className="grid gap-1 text-sm font-medium">
          <span>Status</span>
          <div className="flex flex-wrap gap-2 rounded-xl border border-line bg-steel-50 p-1.5">
          {statuses.map((item) => (
            <button
              key={item.value}
              className={`h-9 rounded-lg px-3 text-xs font-bold uppercase tracking-wide text-slate-500 transition hover:bg-white ${item.className}`}
              data-active={status === item.value}
              type="button"
              onClick={() => setStatus(item.value)}
            >
              {item.label}
            </button>
          ))}
          </div>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Sortierung
          <input className="h-11 rounded-lg border border-line px-3 outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10" type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
        </label>
      </div>
      </FormCard>

      <FormCard title="Kurzbeschreibung">
      <label className="grid gap-1 text-sm font-medium">
        <textarea
          className="min-h-24 rounded-lg border border-line px-3 py-2 outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      </FormCard>

      <FormCard title="Inhalt">
      <div className="grid gap-2 text-sm font-medium">
        <MarkdownEditor initialContent={content} placeholder="Feature-Inhalt" onChange={setContent} />
      </div>
      </FormCard>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-sm">
        <span className="text-xs font-semibold text-slate-500">Zuletzt gespeichert: {formatHumanDate(feature.updatedAt)}</span>
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
