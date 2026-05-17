import type { CalendarEvent, EventInput, Project, Task } from "@taskmanager/shared-types";
import { CalendarClock, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { fromDateTimeLocalInput, toDateTimeLocalInput } from "../../utils/date";
import { Button } from "../ui/Button";
import { ColorPicker } from "../ui/ColorPicker";
import { DatePicker } from "../ui/DatePicker";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";
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

const colors = [
  "var(--color-steel-700)",
  "var(--color-teal)",
  "var(--color-tangerine)",
  "var(--color-mustard)",
  "var(--color-fern)",
  "var(--color-steel-500)",
  "var(--color-violet)",
  "var(--color-magenta)"
];

function dateAtHour(date: string, hour: number): string {
  return `${date.slice(0, 10)}T${String(hour).padStart(2, "0")}:00`;
}

export function EventForm({ open, event, initialDate, projects, tasks, onSubmit, onDelete, onClose }: EventFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [color, setColor] = useState(colors[0] ?? "var(--color-steel-700)");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setStartTime(event ? toDateTimeLocalInput(event.startTime) : dateAtHour(initialDate ?? new Date().toISOString(), 9));
    setEndTime(event ? toDateTimeLocalInput(event.endTime) : dateAtHour(initialDate ?? new Date().toISOString(), 10));
    setIsAllDay(event?.isAllDay ?? false);
    setColor(event?.color ?? colors[0] ?? "var(--color-steel-700)");
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
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      title={event ? "Termin bearbeiten" : "Termin anlegen"}
      subtitle={isAllDay ? "Ganztägig" : undefined}
      icon={<CalendarClock size={21} />}
      breadcrumb={["Kalender", event ? event.title : "Neuer Termin"]}
      onSubmit={submit}
      saving={saving}
      onClose={onClose}
    >
      <Section title="Stammdaten">
        <FormField label="Titel" required>
          <Input value={title} onChange={(inputEvent) => setTitle(inputEvent.target.value)} required />
        </FormField>
        <FormField label="Beschreibung" className="mt-4">
          <RichTextEditor content={description} placeholder="Beschreibung" toolbar="minimal" minHeight="7rem" onChange={setDescription} />
        </FormField>
      </Section>

      <Section title="Zeitraum">
        <label className="mb-4 flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={isAllDay} onChange={(inputEvent) => setIsAllDay(inputEvent.target.checked)} />
          Ganztägig
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <DatePicker label="Start" mode="datetime-local" value={startTime} onChange={(inputEvent) => setStartTime(inputEvent.target.value)} />
          <DatePicker label="Ende" mode="datetime-local" value={endTime} onChange={(inputEvent) => setEndTime(inputEvent.target.value)} />
        </div>
      </Section>

      <Section title="Zuordnung">
        <div className="grid gap-4 sm:grid-cols-2">
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
      </Section>

      <Section title="Farbe">
        <ColorPicker value={color} onChange={setColor} swatches={colors} />
      </Section>

      {event ? (
        <Section title="Gefahrenzone">
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => void onDelete(event).catch(() => undefined)}>
            Löschen
          </Button>
        </Section>
      ) : null}
    </FormModal>
  );
}
