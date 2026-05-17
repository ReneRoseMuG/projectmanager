import type { Priority, Task, TaskInput, TaskStatus } from "@taskmanager/shared-types";
import { CalendarDays, Check, ExternalLink, FileText, Save, UserRound, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { toDateInput } from "../../utils/date";
import { Button } from "../ui/Button";
import { DatePicker } from "../ui/DatePicker";
import { Modal } from "../ui/Modal";

interface TaskFormProps {
  open: boolean;
  task?: Task | null;
  title?: string;
  onSubmit: (input: TaskInput) => Promise<void>;
  onClose: () => void;
}

const statuses: Array<{ value: TaskStatus; label: string }> = [
  { value: "todo", label: "Offen" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "done", label: "Erledigt" }
];

const priorities: Array<{ value: Priority; label: string }> = [
  { value: "low", label: "Niedrig" },
  { value: "medium", label: "Mittel" },
  { value: "high", label: "Hoch" },
  { value: "urgent", label: "Dringend" }
];

const cardClass = "rounded-lg border border-line bg-white p-4 shadow-[0_10px_28px_rgba(31,43,56,0.06)]";

export function TaskForm({ open, task, title = "Aufgabe", onSubmit, onClose }: TaskFormProps) {
  const [taskTitle, setTaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTaskTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setStatus(task?.status ?? "todo");
    setPriority(task?.priority ?? "medium");
    setAssignee(task?.assignee ?? "");
    setDueDate(toDateInput(task?.dueDate));
  }, [open, task]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        title: taskTitle,
        description,
        status,
        priority,
        assignee,
        dueDate: dueDate || null
      });
      onClose();
    } catch {
      // Error feedback is handled by the caller.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={task ? "Aufgabe bearbeiten" : title} size="xl" showHeader={false} bodyClassName="p-0" onClose={onClose}>
      <form className="flex max-h-[calc(100vh-64px)] flex-col bg-shell" onSubmit={submit}>
        <header className="bg-gradient-to-br from-steel-700 to-steel-600 px-5 py-5 text-white md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-white/75">
                <span>{task ? `Projekt #${task.projectId}` : "Projekt"}</span>
                <span>›</span>
                <span>{task ? "Aufgabe bearbeiten" : "Neue Aufgabe"}</span>
              </div>
              <h2 className="text-2xl font-bold tracking-normal">{task ? "Aufgabe bearbeiten" : title}</h2>
              <p className="text-sm text-white/75">Schnelle Erfassung · für Vollansicht Task-Detail öffnen</p>
            </div>
            <div className="flex items-center gap-2">
              <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20" icon={<ExternalLink size={16} />} disabled={!task}>
                Vollansicht öffnen
              </Button>
              <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white" aria-label="Schließen" title="Schließen" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-4 overflow-auto p-4 md:p-5">
          <section className={cardClass}>
            <div className="grid gap-4">
              <label className="grid gap-1 text-sm font-semibold text-ink">
                Titel
                <input className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-fern focus:ring-2 focus:ring-fern/15" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} required />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-ink">
                Beschreibung
                <textarea
                  className="min-h-28 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-fern focus:ring-2 focus:ring-fern/15"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className={cardClass}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <h3 className="text-sm font-bold uppercase text-slate-500">Status</h3>
                <div className="grid gap-2">
                  {statuses.map((item) => {
                    const selected = status === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        className={`flex h-10 items-center justify-between rounded-md border px-3 text-sm font-semibold transition ${selected ? "border-fern bg-fern/10 text-ink" : "border-line bg-shell/60 text-slate-600 hover:border-fern"}`}
                        onClick={() => setStatus(item.value)}
                      >
                        {item.label}
                        {selected ? <Check size={15} className="text-fern" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2">
                <h3 className="text-sm font-bold uppercase text-slate-500">Priorität</h3>
                <div className="grid gap-2">
                  {priorities.map((item) => {
                    const selected = priority === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        className={`flex h-10 items-center justify-between rounded-md border px-3 text-sm font-semibold transition ${selected ? "border-tangerine bg-tangerine/10 text-ink" : "border-line bg-shell/60 text-slate-600 hover:border-tangerine"}`}
                        onClick={() => setPriority(item.value)}
                      >
                        {item.label}
                        {selected ? <Check size={15} className="text-tangerine" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="relative grid gap-1 text-sm font-semibold text-ink">
                Zuständig
                <UserRound size={16} className="pointer-events-none absolute left-3 top-[2.35rem] text-slate-400" />
                <input className="h-10 rounded-md border border-line bg-white px-3 pl-9 text-sm outline-none transition focus:border-fern focus:ring-2 focus:ring-fern/15" value={assignee} onChange={(event) => setAssignee(event.target.value)} />
              </label>
              <div className="relative">
                <CalendarDays size={16} className="pointer-events-none absolute left-3 top-[2.35rem] text-slate-400" />
                <DatePicker label="Fällig" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-dashed border-line bg-shell/60 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet/10 text-violet">
                <FileText size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">Feature-Bezug</p>
                <p className="truncate text-xs text-slate-500">Feature-Zuordnung erfolgt im Task-Detail.</p>
              </div>
              <Button disabled>Ändern</Button>
            </div>
          </section>

          <section className={cardClass}>
            <div className="rounded-lg border border-dashed border-line bg-shell/60 p-4 text-sm text-slate-600">Tags werden nach dem Speichern im Task-Detail gepflegt.</div>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white px-5 py-4">
          <div className="flex items-center gap-2">
            <Button onClick={onClose}>Abbrechen</Button>
            <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
              {task ? "Speichern" : "Aufgabe anlegen"}
            </Button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
