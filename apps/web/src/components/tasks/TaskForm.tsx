import type { Priority, Task, TaskInput, TaskStatus } from "@taskmanager/shared-types";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { toDateInput } from "../../utils/date";
import { Button } from "../ui/Button";
import { DatePicker } from "../ui/DatePicker";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

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
    <Modal open={open} title={task ? "Aufgabe bearbeiten" : title} onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm font-medium">
          Titel
          <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Beschreibung
          <textarea
            className="min-h-28 rounded-md border border-line px-3 py-2 outline-none focus:border-teal"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select label="Priorität" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {priorities.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <label className="grid gap-1 text-sm font-medium">
            Zuständig
            <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" value={assignee} onChange={(event) => setAssignee(event.target.value)} />
          </label>
          <DatePicker label="Fällig" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
            Speichern
          </Button>
        </div>
      </form>
    </Modal>
  );
}
