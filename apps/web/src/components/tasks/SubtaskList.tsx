import type { Task, TaskInput, TaskUpdate } from "@taskmanager/shared-types";
import { Check, ListTodo, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogEntriesByKind, isCatalogStatusClosed } from "../../utils/catalogs";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

interface SubtaskListProps {
  subtasks: Task[];
  onCreate: (input: TaskInput) => Promise<unknown>;
  onUpdate: (id: number, input: TaskUpdate) => Promise<unknown>;
  onDelete: (id: number) => Promise<void>;
}

export function SubtaskList({ subtasks, onCreate, onUpdate, onDelete }: SubtaskListProps) {
  const [title, setTitle] = useState("");
  const catalogs = useCatalogs();
  const workStatusEntries = catalogEntriesByKind(catalogs.entries, "workStatus");
  const openStatusKey = workStatusEntries.find((entry) => !entry.isClosed)?.key ?? "todo";
  const closedStatusKey = workStatusEntries.find((entry) => entry.isClosed)?.key ?? "done";
  const completed = subtasks.filter((subtask) => isCatalogStatusClosed(catalogs.entries, "workStatus", subtask.status)).length;
  const progress = subtasks.length > 0 ? Math.round((completed / subtasks.length) * 100) : 0;

  const add = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    try {
      await onCreate({ title: trimmed });
      setTitle("");
    } catch {
      // Error feedback is handled by the caller.
    }
  };

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-line bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">Tasks</h3>
            <p className="text-sm text-steel-500">
              {completed} von {subtasks.length} erledigt
            </p>
          </div>
          <span className="text-sm font-bold text-fern">{progress}%</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-steel-100">
          <div className="h-full rounded-full bg-fern transition-all" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="grid gap-2 rounded-lg border border-line bg-white p-4 shadow-card">
        {subtasks.length === 0 ? <EmptyState icon={<ListTodo size={20} />} title="Noch keine Tasks" body="Zerlege die Aufgabe in kleinere Schritte." tone="fern" variant="default" className="p-6" /> : null}
        {subtasks.map((subtask) => {
          const done = isCatalogStatusClosed(catalogs.entries, "workStatus", subtask.status);
          return (
            <div key={subtask.id} className="flex items-center gap-3 rounded-md border border-line bg-shell/40 px-3 py-2 transition hover:border-fern/60 hover:bg-white">
              <button
                type="button"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                  done ? "border-fern bg-fern text-white" : "border-steel-300 bg-white text-transparent hover:border-fern"
                }`}
                aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
                onClick={() => void onUpdate(subtask.id, { status: done ? openStatusKey : closedStatusKey, expectedVersion: subtask.version }).catch(() => undefined)}
              >
                <Check size={15} />
              </button>
              <span className={`min-w-0 flex-1 truncate text-sm font-medium ${done ? "text-steel-500 line-through" : "text-ink"}`}>{subtask.title}</span>
              <Button aria-label="Löschen" title="Löschen" icon={<Trash2 size={18} />} variant="ghost" className="h-10 w-10" onClick={() => void onDelete(subtask.id).catch(() => undefined)} />
            </div>
          );
        })}

        <div className="mt-2 flex gap-2 rounded-md border border-dashed border-steel-300 bg-steel-100/35 p-2">
          <input
            className="h-10 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
            placeholder="Neue Aufgabe hinzufügen"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void add();
              }
            }}
          />
          <Button icon={<Plus size={16} />} variant="primary" onClick={add}>
            Hinzufügen
          </Button>
        </div>
      </section>
    </div>
  );
}
