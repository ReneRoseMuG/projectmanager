import type { Task, TaskInput, TaskUpdate } from "@taskmanager/shared-types";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";

interface SubtaskListProps {
  subtasks: Task[];
  onCreate: (input: TaskInput) => Promise<unknown>;
  onUpdate: (id: number, input: TaskUpdate) => Promise<unknown>;
  onDelete: (id: number) => Promise<void>;
}

export function SubtaskList({ subtasks, onCreate, onUpdate, onDelete }: SubtaskListProps) {
  const [title, setTitle] = useState("");

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
    <div className="grid gap-3">
      <div className="flex gap-2">
        <input
          className="h-10 min-w-0 flex-1 rounded-md border border-line px-3 outline-none focus:border-teal"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void add();
            }
          }}
        />
        <Button icon={<Plus size={16} />} onClick={add}>
          Hinzufügen
        </Button>
      </div>
      <div className="grid gap-2">
        {subtasks.map((subtask) => (
          <div key={subtask.id} className="flex items-center gap-3 rounded-md border border-line bg-white p-3">
            <input
              type="checkbox"
              checked={subtask.status === "done"}
              onChange={(event) => void onUpdate(subtask.id, { status: event.target.checked ? "done" : "todo" }).catch(() => undefined)}
            />
            <span className={`min-w-0 flex-1 text-sm ${subtask.status === "done" ? "text-slate-500 line-through" : "text-ink"}`}>{subtask.title}</span>
            <Button aria-label="Löschen" title="Löschen" icon={<Trash2 size={15} />} variant="ghost" className="h-8 w-8" onClick={() => void onDelete(subtask.id).catch(() => undefined)} />
          </div>
        ))}
      </div>
    </div>
  );
}
