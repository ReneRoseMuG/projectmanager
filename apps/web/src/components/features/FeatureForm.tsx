import type { Feature, FeatureInput, FeatureStatus } from "@taskmanager/shared-types";
import { LinkIcon, Save } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { RichTextEditor } from "../ui/RichTextEditor";
import { FeatureProjectLinksPanel } from "./FeatureProjectLinksPanel";

type FeatureFormTab = "details" | "projects";

interface FeatureFormProps {
  open: boolean;
  feature?: Feature | null;
  onSubmit: (input: FeatureInput) => Promise<void>;
  onProjectLinksChanged?: () => void | Promise<void>;
  onClose: () => void;
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

export function FeatureForm({ open, feature, onSubmit, onProjectLinksChanged, onClose }: FeatureFormProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<FeatureStatus>("draft");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<FeatureFormTab>("details");

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(feature?.title ?? "");
    setSlug(feature?.slug ?? "");
    setStatus(feature?.status ?? "draft");
    setDescription(feature?.description ?? "");
    setSortOrder(feature?.sortOrder ?? 0);
    setContent(feature?.content ?? "");
    setActiveTab("details");
  }, [open, feature]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        title,
        slug,
        status,
        description,
        sortOrder,
        content
      });
      onClose();
    } catch {
      // Error feedback is handled by the page-level toast.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={feature ? "Feature bearbeiten" : "Neues Feature"} size="xl" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <div className="inline-flex w-fit rounded-lg border border-line bg-white p-1 shadow-sm" role="tablist" aria-label="Feature-Formular">
          <button
            type="button"
            className={`h-9 rounded-md px-3 text-sm font-semibold transition ${activeTab === "details" ? "bg-steel-900 text-white" : "text-slate-600 hover:bg-steel-50 hover:text-ink"}`}
            role="tab"
            aria-selected={activeTab === "details"}
            onClick={() => setActiveTab("details")}
          >
            Stammdaten
          </button>
          {feature ? (
            <button
              type="button"
              className={`h-9 rounded-md px-3 text-sm font-semibold transition ${activeTab === "projects" ? "bg-steel-900 text-white" : "text-slate-600 hover:bg-steel-50 hover:text-ink"}`}
              role="tab"
              aria-selected={activeTab === "projects"}
              onClick={() => setActiveTab("projects")}
            >
              Projekte
            </button>
          ) : null}
        </div>

        {activeTab === "details" ? (
          <>
            <FormCard title="Stammdaten">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid min-w-0 gap-1 text-sm font-medium">
                  <FieldLabel required>Titel</FieldLabel>
                  <input autoFocus={!feature} className="h-11 w-full min-w-0 rounded-lg border border-line px-3 outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10" value={title} onChange={(event) => setTitle(event.target.value)} required />
                </label>
                <label className="grid min-w-0 gap-1 text-sm font-medium">
                  <FieldLabel required>Slug</FieldLabel>
                  <span className="relative min-w-0">
                    <LinkIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" size={16} />
                    <input className="h-11 w-full min-w-0 rounded-lg border border-line pl-9 pr-3 font-mono text-sm outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10" value={slug} onChange={(event) => setSlug(event.target.value)} required />
                  </span>
                </label>
              </div>
            </FormCard>

            <FormCard title="Status & Sortierung">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
                <div className="grid min-w-0 gap-1 text-sm font-medium">
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

            <FormCard title="Inhalt">
              <div className="grid gap-2 text-sm font-medium">
                <RichTextEditor markdown={content} placeholder="Feature-Inhalt" onMarkdownChange={setContent} />
              </div>
            </FormCard>
          </>
        ) : (
          <div className="rounded-xl border border-line bg-shell/60 p-4">
            <FeatureProjectLinksPanel featureId={feature?.id} onChanged={onProjectLinksChanged} />
          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-line pt-4">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
            Speichern
          </Button>
        </div>
      </form>
    </Modal>
  );
}
