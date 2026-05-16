import type { Project, ProjectInput, ProjectStatus, Tag } from "@taskmanager/shared-types";
import { CalendarDays, Check, FolderKanban, Save, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatHumanDate } from "../../utils/date";
import { TagPicker } from "../tags/TagPicker";
import { Button } from "../ui/Button";
import { DatePicker } from "../ui/DatePicker";
import { Modal } from "../ui/Modal";

interface ProjectFormProps {
  open: boolean;
  project?: Project | null;
  onSubmit: (input: ProjectInput, tagIds: number[]) => Promise<void>;
  onClose: () => void;
}

const statuses: Array<{ value: ProjectStatus; label: string; className: string }> = [
  { value: "active", label: "Aktiv", className: "border-steel-700 bg-steel-700 text-white" },
  { value: "on_hold", label: "Pausiert", className: "border-mustard bg-mustard text-ink" },
  { value: "completed", label: "Abgeschlossen", className: "border-fern bg-fern text-white" },
  { value: "archived", label: "Archiviert", className: "border-steel-300 bg-steel-100 text-steel-700" }
];

const swatches = ["#2E5984", "#D9416A", "#ED8C3A", "#E2BA2C", "#4D9359", "#2F8E96", "#6A40BE", "#C13D9A", "#0F2542"];
const cardClass = "rounded-lg border border-line bg-white p-4 shadow-[0_10px_28px_rgba(31,43,56,0.06)]";

function projectCode(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 5)
    .toUpperCase();
}

export function ProjectForm({ open, project, onSubmit, onClose }: ProjectFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [color, setColor] = useState("#2E5984");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const code = useMemo(() => projectCode(name), [name]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setStatus(project?.status ?? "active");
    setColor(project?.color ?? "#2E5984");
    setSelectedTags(project?.tags ?? []);
    setStartDate("");
    setDueDate("");
  }, [open, project]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(
        {
          name,
          description,
          status,
          color
        },
        selectedTags.map((tag) => tag.id)
      );
      onClose();
    } catch {
      // Error feedback is handled by the page-level toast.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={project ? "Projekt bearbeiten" : "Neues Projekt"} size="xl" showHeader={false} bodyClassName="p-0" onClose={onClose}>
      <form className="flex max-h-[calc(100vh-64px)] flex-col bg-shell" onSubmit={submit}>
        <header className="bg-gradient-to-br from-steel-700 to-steel-600 px-5 py-5 text-white md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-white/75">
                <span>Projekte</span>
                <span>›</span>
                <span>{project ? project.name : "Neues Projekt"}</span>
                {project ? (
                  <>
                    <span>›</span>
                    <span>Bearbeiten</span>
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/12 text-white">
                  <FolderKanban size={21} />
                </span>
                <div>
                  <h2 className="text-2xl font-bold tracking-normal">{project ? "Projekt bearbeiten" : "Projekt anlegen"}</h2>
                  <p className="text-sm text-white/75">{project ? `Zuletzt aktualisiert am ${formatHumanDate(project.updatedAt)}` : "Lege Stammdaten, Status und visuelle Identität fest."}</p>
                </div>
              </div>
            </div>
            <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white" aria-label="Schließen" title="Schließen" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="grid flex-1 gap-4 overflow-auto p-4 md:p-5">
          <section className={cardClass}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="grid gap-1 text-sm font-semibold text-ink">
                Projektname <span className="text-crimson">*</span>
                <input className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-fern focus:ring-2 focus:ring-fern/15" value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-ink">
                Kürzel
                <input className="h-11 rounded-md border border-line bg-shell px-3 font-mono text-sm uppercase text-slate-600 outline-none" value={code} readOnly maxLength={5} />
              </label>
            </div>
            <label className="mt-4 grid gap-1 text-sm font-semibold text-ink">
              Beschreibung
              <textarea
                className="min-h-28 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-fern focus:ring-2 focus:ring-fern/15"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </section>

          <section className={cardClass}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="grid gap-3">
                <h3 className="text-sm font-bold uppercase text-slate-500">Identität</h3>
                <div className="flex flex-wrap gap-2">
                  {swatches.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      className={`h-9 w-9 rounded-full border-2 transition ${color.toLowerCase() === swatch.toLowerCase() ? "border-steel-900 ring-2 ring-steel-200" : "border-white shadow-sm"}`}
                      style={{ backgroundColor: swatch }}
                      aria-label={`Farbe ${swatch}`}
                      onClick={() => setColor(swatch)}
                    />
                  ))}
                  <label className="flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-xs font-semibold text-slate-600">
                    Custom
                    <input className="h-6 w-8 border-0 bg-transparent p-0" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
                  </label>
                </div>
              </div>
              <div className="grid gap-3">
                <h3 className="text-sm font-bold uppercase text-slate-500">Status</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {statuses.map((item) => {
                    const selected = status === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        className={`flex h-10 items-center justify-between rounded-md border px-3 text-sm font-semibold transition ${selected ? item.className : "border-line bg-shell/60 text-slate-600 hover:border-steel-400"}`}
                        onClick={() => setStatus(item.value)}
                      >
                        {item.label}
                        {selected ? <Check size={15} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <CalendarDays size={16} className="pointer-events-none absolute left-3 top-[2.35rem] text-slate-400" />
                <DatePicker label="Start" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="pl-9" />
              </div>
              <div className="relative">
                <CalendarDays size={16} className="pointer-events-none absolute left-3 top-[2.35rem] text-slate-400" />
                <DatePicker label="Fällig" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="pl-9" />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <TagPicker selected={selectedTags} onChange={setSelectedTags} />
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-5 py-4">
          <span className="text-sm text-slate-500">{project ? `Zuletzt gespeichert ${formatHumanDate(project.updatedAt)}` : "Neu - wird beim Speichern angelegt"}</span>
          <div className="flex items-center gap-2">
            <Button onClick={onClose}>Abbrechen</Button>
            <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
              {project ? "Speichern" : "Projekt anlegen"}
            </Button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
