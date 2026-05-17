import type { FeatureStatus, UseCase, UseCaseUpdate } from "@taskmanager/shared-types";
import { LinkIcon, RotateCcw, Save, Trash2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { MarkdownEditor } from "../ui/MarkdownEditor";

interface UseCaseDetailProps {
  useCase: UseCase;
  onSave: (id: number, input: UseCaseUpdate) => Promise<void>;
  onDelete: (useCase: UseCase) => void;
}

const statuses: Array<{ value: FeatureStatus; label: string; className: string }> = [
  { value: "draft", label: "Entwurf", className: "data-[active=true]:bg-mustard data-[active=true]:text-[#6E5800]" },
  { value: "active", label: "Aktiv", className: "data-[active=true]:bg-fern data-[active=true]:text-white" },
  { value: "done", label: "Erledigt", className: "data-[active=true]:bg-violet data-[active=true]:text-white" },
  { value: "archived", label: "Archiviert", className: "data-[active=true]:bg-steel-100 data-[active=true]:text-steel-700" }
];

function FieldLabel({ children }: { children: string; required?: boolean }) {
  return <span>{children}</span>;
}

function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-xl border border-line bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}

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

  const resetFields = () => {
    setTitle(useCase.title);
    setSlug(useCase.slug);
    setStatus(useCase.status);
    setDescription(useCase.description ?? "");
    setSortOrder(useCase.sortOrder);
    setContent(useCase.content ?? "");
  };

  return (
    <form className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm" onSubmit={submit}>
      <header className="relative overflow-hidden bg-gradient-to-br from-violet to-magenta p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Use Case #{useCase.sortOrder}</span>
            <h2 className="mt-3 text-[22px] font-bold text-white">{useCase.title}</h2>
            <p className="mt-1 font-mono text-xs text-white/80">
              {useCase.slug} · Feature {useCase.featureId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="border border-white/24 bg-white/14 text-white hover:bg-white/20" icon={<Trash2 size={16} />} variant="ghost" onClick={() => onDelete(useCase)}>
              Löschen
            </Button>
            <Button className="bg-white text-violet hover:bg-steel-50" type="submit" variant="ghost" icon={<Save size={16} />} disabled={saving}>
              Speichern
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 p-6">
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
            <MarkdownEditor initialContent={content} placeholder="Use-Case-Inhalt" onChange={setContent} />
          </div>
        </FormCard>

        <footer className="flex flex-wrap items-center justify-end gap-3 rounded-xl border border-line bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <Button icon={<RotateCcw size={16} />} variant="secondary" onClick={resetFields}>
              Verwerfen
            </Button>
            <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
              Speichern
            </Button>
          </div>
        </footer>
      </div>
    </form>
  );
}
