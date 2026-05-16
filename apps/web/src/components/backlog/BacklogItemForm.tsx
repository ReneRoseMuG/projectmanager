import type { BacklogItem, BacklogItemInput, BacklogStatus, Feature, Priority } from "@taskmanager/shared-types";
import { Check, FileText, Save, Send, Trash2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface BacklogItemFormProps {
  open: boolean;
  item?: BacklogItem | null;
  features: Feature[];
  onSubmit: (input: BacklogItemInput) => Promise<void>;
  onClose: () => void;
}

const statuses: Array<{ value: BacklogStatus; label: string; selectedClass: string }> = [
  { value: "open", label: "Offen", selectedClass: "border-steel-700 bg-steel-700 text-white" },
  { value: "in_progress", label: "In Arbeit", selectedClass: "border-tangerine bg-tangerine text-white" },
  { value: "done", label: "Erledigt", selectedClass: "border-fern bg-fern text-white" },
  { value: "rejected", label: "Verworfen", selectedClass: "border-crimson bg-crimson/10 text-crimson" }
];

const priorities: Array<{ value: Priority; label: string }> = [
  { value: "low", label: "Niedrig" },
  { value: "medium", label: "Mittel" },
  { value: "high", label: "Hoch" },
  { value: "urgent", label: "Dringend" }
];

const cardClass = "rounded-lg border border-line bg-white p-4 shadow-[0_10px_28px_rgba(31,43,56,0.06)]";

export function BacklogItemForm({ open, item, features, onSubmit, onClose }: BacklogItemFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<BacklogStatus>("open");
  const [priority, setPriority] = useState<Priority>("medium");
  const [featureId, setFeatureId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const selectedFeature = useMemo(() => features.find((feature) => feature.id === featureId) ?? null, [featureId, features]);

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
    <Modal open={open} title={item ? "Backlog-Item bearbeiten" : "Neues Backlog-Item"} size="xl" showHeader={false} bodyClassName="p-0" onClose={onClose}>
      <form className="flex max-h-[calc(100vh-64px)] flex-col bg-shell" onSubmit={submit}>
        <header className="bg-gradient-to-br from-tangerine to-tangerine/80 px-5 py-5 text-white md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-white/80">
                <span>Backlog</span>
                <span>›</span>
                <span>{item ? `Item #${item.id}` : "Neues Item"}</span>
              </div>
              <h2 className="text-2xl font-bold tracking-normal">{title || (item ? "Backlog-Item bearbeiten" : "Backlog-Item anlegen")}</h2>
              <p className="text-sm text-white/80">{item ? `Zuletzt aktualisiert am ${formatHumanDate(item.updatedAt)}` : "Idee erfassen und für spätere Umsetzung vorbereiten."}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20" icon={<Send size={16} />} disabled>
                In Task umwandeln
              </Button>
              <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white" aria-label="Schließen" title="Schließen" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-4 overflow-auto p-4 md:p-5">
          <section className={cardClass}>
            <label className="grid gap-1 text-sm font-semibold text-ink">
              Titel <span className="text-crimson">*</span>
              <input className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-tangerine focus:ring-2 focus:ring-tangerine/15" value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>
            <label className="mt-4 grid gap-1 text-sm font-semibold text-ink">
              Beschreibung
              <textarea
                className="min-h-28 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-tangerine focus:ring-2 focus:ring-tangerine/15"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </section>

          <section className={cardClass}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <h3 className="text-sm font-bold uppercase text-slate-500">Status</h3>
                <div className="grid gap-2">
                  {statuses.map((option) => {
                    const selected = status === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`flex h-10 items-center justify-between rounded-md border px-3 text-sm font-semibold transition ${selected ? option.selectedClass : "border-line bg-shell/60 text-slate-600 hover:border-tangerine"}`}
                        onClick={() => setStatus(option.value)}
                      >
                        {option.label}
                        {selected ? <Check size={15} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2">
                <h3 className="text-sm font-bold uppercase text-slate-500">Priorität</h3>
                <div className="grid gap-2">
                  {priorities.map((option) => {
                    const selected = priority === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`flex h-10 items-center justify-between rounded-md border px-3 text-sm font-semibold transition ${selected ? "border-tangerine bg-tangerine/10 text-ink" : "border-line bg-shell/60 text-slate-600 hover:border-tangerine"}`}
                        onClick={() => setPriority(option.value)}
                      >
                        {option.label}
                        {selected ? <Check size={15} className="text-tangerine" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line bg-shell/60 p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet/10 text-violet">
                  <FileText size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{selectedFeature ? selectedFeature.title : "Ohne Feature-Bezug"}</p>
                  <p className="truncate font-mono text-xs text-slate-500">{selectedFeature ? selectedFeature.slug : "Feature zuordnen"}</p>
                </div>
              </div>
              <label className="grid gap-1 text-sm font-semibold text-ink">
                Sortierung
                <input className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-tangerine" type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
              </label>
            </div>
            <label className="mt-4 grid gap-1 text-sm font-semibold text-ink">
              Feature ändern
              <select className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-tangerine" value={featureId ?? ""} onChange={(event) => setFeatureId(event.target.value ? Number(event.target.value) : null)}>
                <option value="">Ohne Feature</option>
                {features.map((feature) => (
                  <option key={feature.id} value={feature.id}>
                    {feature.title}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-3 text-sm text-slate-500">Wird das Item später in einen Task umgewandelt, übernimmt der Task automatisch diese Feature-Zuordnung.</p>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-5 py-4">
          <span className="text-sm text-slate-500">{item ? `Item #${item.id}` : "Neu - wird beim Speichern angelegt"}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-crimson hover:bg-crimson/10" icon={<Trash2 size={16} />} disabled={!item}>
              Löschen
            </Button>
            <Button onClick={onClose}>Abbrechen</Button>
            <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
              Speichern
            </Button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
