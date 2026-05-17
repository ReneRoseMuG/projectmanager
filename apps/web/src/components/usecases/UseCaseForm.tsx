import type { FeatureStatus, UseCase, UseCaseInput } from "@taskmanager/shared-types";
import { LinkIcon, Save, Trash2, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { MarkdownEditor } from "../ui/MarkdownEditor";
import { Modal } from "../ui/Modal";

interface UseCaseFormProps {
  open: boolean;
  useCase?: UseCase | null;
  featureTitle?: string;
  onSubmit: (input: UseCaseInput) => Promise<void>;
  onDelete?: (useCase: UseCase) => Promise<boolean> | boolean;
  onClose: () => void;
}

interface StatusOption {
  value: FeatureStatus;
  label: string;
  activeClassName: string;
  dotClassName: string;
}

const statuses: StatusOption[] = [
  { value: "draft", label: "Entwurf", activeClassName: "border-mustard bg-mustard text-white", dotClassName: "bg-mustard" },
  { value: "active", label: "Aktiv", activeClassName: "border-fern bg-fern text-white", dotClassName: "bg-fern" },
  { value: "done", label: "Erledigt", activeClassName: "border-violet bg-violet text-white", dotClassName: "bg-violet" },
  { value: "archived", label: "Archiviert", activeClassName: "border-steel-500 bg-steel-500 text-white", dotClassName: "bg-steel-500" }
];

function FieldLabel({ children }: { children: string; required?: boolean }) {
  return <span className="inline-flex items-center">{children}</span>;
}

function FormCard({ title, helper, children }: { title: string; helper?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-xl border border-line bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink">{title}</h3>
        {helper ? <span className="text-xs font-semibold text-slate-500">{helper}</span> : null}
      </header>
      {children}
    </section>
  );
}

export function UseCaseForm({ open, useCase, featureTitle, onSubmit, onDelete, onClose }: UseCaseFormProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<FeatureStatus>("draft");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const deleteCurrentUseCase = async () => {
    if (!useCase || !onDelete) {
      return;
    }

    setDeleting(true);
    try {
      const deleted = await onDelete(useCase);
      if (deleted) {
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  };

  const badgeText = useCase ? `USE CASE #${useCase.sortOrder} · /uc/${useCase.slug}` : "NEUER USE CASE · /uc/…";
  const titleText = useCase ? useCase.title : "Neuer Use Case";
  return (
    <Modal open={open} title={titleText} size="xl" showHeader={false} bodyClassName="p-0" onClose={onClose}>
      <header className="relative overflow-hidden bg-gradient-to-br from-violet to-magenta px-6 py-5 text-white">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              {badgeText}
            </span>
            <h2 className="mt-3 text-[22px] font-bold text-white">{titleText}</h2>
            <span className="mt-1 block truncate font-mono text-xs text-white/80">Feature: {featureTitle ?? "Feature"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {useCase && onDelete ? (
              <Button
                className="border border-white/24 bg-white/14 text-white hover:bg-white/20"
                icon={<Trash2 size={16} />}
                variant="ghost"
                disabled={deleting}
                onClick={() => void deleteCurrentUseCase()}
              >
                Löschen
              </Button>
            ) : null}
            <Button
              aria-label="Schließen"
              title="Schließen"
              className="border border-white/24 bg-white/14 text-white hover:bg-white/20"
              icon={<X size={16} />}
              variant="ghost"
              onClick={onClose}
            />
          </div>
        </div>
      </header>

      <form className="grid gap-4 p-5" onSubmit={submit}>
        <FormCard title="Stammdaten">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-sm font-medium">
              <FieldLabel required>Titel</FieldLabel>
              <input
                autoFocus
                className="h-11 w-full min-w-0 rounded-lg border border-line px-3 outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium">
              <FieldLabel required>Slug</FieldLabel>
              <span className="relative min-w-0">
                <LinkIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" size={16} />
                <input
                  className="h-11 w-full min-w-0 rounded-lg border border-line pl-9 pr-3 font-mono text-sm outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  required
                />
              </span>
            </label>
          </div>
        </FormCard>

        <FormCard title="Status & Sortierung">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
            <div className="grid min-w-0 gap-1 text-sm font-medium">
              <span>Status</span>
              <div className="flex flex-wrap gap-2">
                {statuses.map((item) => (
                  <button
                    key={item.value}
                    className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition hover:border-steel-500 ${
                      status === item.value ? item.activeClassName : "border-line bg-white text-slate-600"
                    }`}
                    type="button"
                    onClick={() => setStatus(item.value)}
                  >
                    <span className={`h-2 w-2 rounded-full ${status === item.value ? "bg-white/90" : item.dotClassName}`} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="grid min-w-0 gap-1 text-sm font-medium">
              Sortierung
              <input
                className="h-11 w-full min-w-0 rounded-lg border border-line px-3 outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10"
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(Number(event.target.value))}
              />
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

        <FormCard title="Inhalt" helper="Markdown">
          <div className="grid gap-2 text-sm font-medium">
            <MarkdownEditor initialContent={content} placeholder="Use-Case-Inhalt" onChange={setContent} />
          </div>
        </FormCard>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
          <div className="flex gap-2">
            <Button onClick={onClose}>Abbrechen</Button>
            <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
              Speichern
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
