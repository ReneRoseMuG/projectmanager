import type { CalendarEvent, EventInput, EventOwner, Milestone, Project, Task } from "@taskmanager/shared-types";
import { CalendarClock, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { fromDateTimeLocalInput, toDateTimeLocalInput } from "../../utils/date";
import { Button } from "../ui/Button";
import { ColorPicker } from "../ui/ColorPicker";
import { DatePicker } from "../ui/DatePicker";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";

interface EventFormProps {
  open: boolean;
  event: CalendarEvent | null;
  initialDate?: string | null;
  initialOwners?: EventOwner[];
  projects: Project[];
  milestones?: Milestone[];
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

function ownerIds(event: CalendarEvent | null, initialOwners: EventOwner[] | undefined, type: EventOwner["type"]): number[] {
  const owners = event?.owners ?? initialOwners ?? [];
  return owners.filter((owner) => owner.type === type).map((owner) => owner.id);
}

function toggleId(values: number[], id: number): number[] {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

export function EventForm({ open, event, initialDate, initialOwners, projects, milestones = [], tasks, onSubmit, onDelete, onClose }: EventFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [color, setColor] = useState(colors[0] ?? "var(--color-steel-700)");
  const [projectIds, setProjectIds] = useState<number[]>([]);
  const [milestoneIds, setMilestoneIds] = useState<number[]>([]);
  const [taskIds, setTaskIds] = useState<number[]>([]);
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
    setProjectIds(ownerIds(event, initialOwners, "project"));
    setMilestoneIds(ownerIds(event, initialOwners, "milestone"));
    setTaskIds(ownerIds(event, initialOwners, "task"));
  }, [event, initialDate, initialOwners, open]);

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
          owners: [
            ...projectIds.map((id) => ({ type: "project" as const, id })),
            ...milestoneIds.map((id) => ({ type: "milestone" as const, id })),
            ...taskIds.map((id) => ({ type: "task" as const, id }))
          ]
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
          <RichTextInlineField value={description} placeholder="Beschreibung" minRows={12} testIdPrefix="event-description" onChange={setDescription} />
        </FormField>
      </Section>

      <Section title="Zeitraum">
        <label className="mb-4 flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={isAllDay} onChange={(inputEvent) => setIsAllDay(inputEvent.target.checked)} />
          Ganztägig
        </label>
        <div className="grid gap-4 lg:grid-cols-3">
          <DatePicker label="Start" mode="datetime-local" value={startTime} onChange={(inputEvent) => setStartTime(inputEvent.target.value)} />
          <DatePicker label="Ende" mode="datetime-local" value={endTime} onChange={(inputEvent) => setEndTime(inputEvent.target.value)} />
        </div>
      </Section>

      <Section title="Zuordnung">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Projekte">
            <div className="grid max-h-44 gap-2 overflow-auto rounded-md border border-line bg-white p-3">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <label key={project.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={projectIds.includes(project.id)} onChange={() => setProjectIds((current) => toggleId(current, project.id))} />
                    {project.name}
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-500">Keine Projekte</p>
              )}
            </div>
          </FormField>
          <FormField label="Meilensteine">
            <div className="grid max-h-44 gap-2 overflow-auto rounded-md border border-line bg-white p-3">
              {milestones.length > 0 ? (
                milestones.map((milestone) => (
                  <label key={milestone.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={milestoneIds.includes(milestone.id)} onChange={() => setMilestoneIds((current) => toggleId(current, milestone.id))} />
                    {milestone.name}
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-500">Keine Meilensteine</p>
              )}
            </div>
          </FormField>
          <FormField label="Aufgaben">
            <div className="grid max-h-44 gap-2 overflow-auto rounded-md border border-line bg-white p-3">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <label key={task.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={taskIds.includes(task.id)} onChange={() => setTaskIds((current) => toggleId(current, task.id))} />
                    {task.title}
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-500">Keine Aufgaben</p>
              )}
            </div>
          </FormField>
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
