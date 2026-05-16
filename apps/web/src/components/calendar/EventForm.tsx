import type { CalendarEvent, EventInput, Project, Task } from "@taskmanager/shared-types";
import { Save, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { fromDateTimeLocalInput, toDateTimeLocalInput } from "../../utils/date";
import { Button } from "../ui/Button";
import { DatePicker } from "../ui/DatePicker";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

interface EventFormProps {
  open: boolean;
  event: CalendarEvent | null;
  initialDate?: string | null;
  projects: Project[];
  tasks: Task[];
  onSubmit: (input: EventInput, eventId?: number) => Promise<void>;
  onDelete: (event: CalendarEvent) => Promise<void>;
  onClose: () => void;
}

const colors = ["#6366f1", "#0f766e", "#e76f51", "#d99a21", "#6a994e", "#475569", "#8a4fff", "#2563eb"];

function dateAtHour(date: string, hour: number): string {
  return `${date.slice(0, 10)}T${String(hour).padStart(2, "0")}:00`;
}

export function EventForm({ open, event, initialDate, projects, tasks, onSubmit, onDelete, onClose }: EventFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [color, setColor] = useState(colors[0]);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setStartTime(event ? toDateTimeLocalInput(event.startTime) : dateAtHour(initialDate ?? new Date().toISOString(), 9));
    setEndTime(event ? toDateTimeLocalInput(event.endTime) : dateAtHour(initialDate ?? new Date().toISOString(), 10));
    setIsAllDay(event?.isAllDay ?? false);
    setColor(event?.color ?? colors[0]);
    setProjectId(event?.projectId ? String(event.projectId) : "");
    setTaskId(event?.taskId ? String(event.taskId) : "");
  }, [event, initialDate, open]);

  const filteredTasks = useMemo(() => {
    if (!projectId) {
      return tasks;
    }
    return tasks.filter((task) => task.projectId === Number(projectId));
  }, [projectId, tasks]);

  const submit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    try {
      await onSubmit(
        {
          title,
          description,
          startTime: fromDateTimeLocalInput(startTime),
          endTime: fromDateTimeLocalInput(endTime),
          isAllDay,
          color,
          projectId: projectId ? Number(projectId) : null,
          taskId: taskId ? Number(taskId) : null
        },
        event?.id
      );
      onClose();
    } catch {
      // Error feedback is handled by the page-level toast.
    }
  };

  return (
    <Modal open={open} title={event ? "Termin bearbeiten" : "Neuer Termin"} onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm font-medium">
          Titel
          <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" value={title} onChange={(inputEvent) => setTitle(inputEvent.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Beschreibung
          <textarea className="min-h-24 rounded-md border border-line px-3 py-2 outline-none focus:border-teal" value={description} onChange={(inputEvent) => setDescription(inputEvent.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={isAllDay} onChange={(inputEvent) => setIsAllDay(inputEvent.target.checked)} />
          Ganztägig
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <DatePicker label="Start" mode="datetime-local" value={startTime} onChange={(inputEvent) => setStartTime(inputEvent.target.value)} />
          <DatePicker label="Ende" mode="datetime-local" value={endTime} onChange={(inputEvent) => setEndTime(inputEvent.target.value)} />
          <Select label="Projekt" value={projectId} onChange={(inputEvent) => {
            setProjectId(inputEvent.target.value);
            setTaskId("");
          }}>
            <option value="">Keins</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Select label="Aufgabe" value={taskId} onChange={(inputEvent) => setTaskId(inputEvent.target.value)}>
            <option value="">Keine</option>
            {filteredTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          {colors.map((item) => (
            <button
              key={item}
              type="button"
              className={`h-8 w-8 rounded border border-white shadow ${color === item ? "ring-2 ring-ink ring-offset-2" : ""}`}
              style={{ backgroundColor: item }}
              title={item}
              aria-label={item}
              onClick={() => setColor(item)}
            />
          ))}
        </div>
        <div className="flex justify-between gap-2 border-t border-line pt-4">
          {event ? (
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => void onDelete(event).catch(() => undefined)}>
              Löschen
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button onClick={onClose}>Abbrechen</Button>
            <Button type="submit" variant="primary" icon={<Save size={16} />}>
              Speichern
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
