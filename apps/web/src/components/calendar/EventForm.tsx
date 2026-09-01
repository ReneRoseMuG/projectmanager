import type { CalendarEvent, EventInput, EventOwner, Milestone, Project, Task } from "@taskmanager/shared-types";
import { Bell, CalendarClock, Trash2, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { uploadContentImage } from "../../api/content-images";
import { useAuth } from "../../hooks/useAuth";
import { useHasPermission } from "../../hooks/usePermissions";
import { fromDateTimeLocalInput, toDateTimeLocalInput } from "../../utils/date";
import { JournalPanel } from "../journal/JournalPanel";
import { Button } from "../ui/Button";
import { DatePicker } from "../ui/DatePicker";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { FormSidebar } from "../ui/FormSidebar";
import { Input } from "../ui/Input";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { UserSelectField } from "../users/UserSelectField";

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
  canDelete?: boolean;
  onClose: () => void;
}

const defaultEventColor = "var(--color-steel-700)";

function dateAtHour(date: string, hour: number): string {
  return `${date.slice(0, 10)}T${String(hour).padStart(2, "0")}:00`;
}

function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function preservedOwners(event: CalendarEvent | null, initialOwners: EventOwner[] | undefined): EventOwner[] {
  return event?.owners ?? initialOwners ?? [];
}

function ownerKey(owner: EventOwner): string {
  return `${owner.type}:${owner.id}`;
}

function hasOwner(owners: EventOwner[], owner: EventOwner): boolean {
  return owners.some((candidate) => ownerKey(candidate) === ownerKey(owner));
}

function ownerLabel(owner: EventOwner, projects: Project[], milestones: Milestone[], tasks: Task[]): string {
  if (owner.type === "project") {
    return projects.find((project) => project.id === owner.id)?.name ?? `Projekt #${owner.id}`;
  }
  if (owner.type === "milestone") {
    return milestones.find((milestone) => milestone.id === owner.id)?.name ?? `Meilenstein #${owner.id}`;
  }
  if (owner.type === "task") {
    return tasks.find((task) => task.id === owner.id)?.title ?? `Aufgabe #${owner.id}`;
  }
  return `Tagesplan #${owner.id}`;
}

function OwnerCheckboxGroup({
  title,
  owners,
  selectedOwners,
  projects,
  milestones,
  tasks,
  onToggle,
}: {
  title: string;
  owners: EventOwner[];
  selectedOwners: EventOwner[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  onToggle: (owner: EventOwner) => void;
}) {
  if (owners.length === 0) {
    return null;
  }

  return (
    <fieldset className="grid gap-2">
      <legend className="text-xs font-bold uppercase tracking-wide text-steel-500">{title}</legend>
      <div className="grid max-h-36 gap-1 overflow-auto pr-1">
        {owners.map((owner) => {
          const label = ownerLabel(owner, projects, milestones, tasks);
          return (
            <label key={ownerKey(owner)} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-ink hover:bg-steel-50">
              <input type="checkbox" checked={hasOwner(selectedOwners, owner)} onChange={() => onToggle(owner)} />
              <span className="min-w-0 truncate">{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function EventForm({ open, event, initialDate, initialOwners, projects, milestones = [], tasks, onSubmit, onDelete, canDelete = true, onClose }: EventFormProps) {
  const auth = useAuth();
  const canReadJournal = useHasPermission("journal", "read");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(60);
  const [responsibleUserId, setResponsibleUserId] = useState<number | null>(null);
  const [owners, setOwners] = useState<EventOwner[]>([]);
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
    setReminderMinutes(event?.reminderMinutes ?? 60);
    setResponsibleUserId(event ? event.responsibleUserId : (auth.user?.id ?? null));
    setOwners(preservedOwners(event, initialOwners));
  }, [auth.user?.id, event, initialDate, initialOwners, open]);

  const toggleOwner = (owner: EventOwner) => {
    setOwners((current) =>
      hasOwner(current, owner)
        ? current.filter((candidate) => ownerKey(candidate) !== ownerKey(owner))
        : [...current, owner]
    );
  };

  const handleStartChange = (value: string) => {
    if (!value) {
      setStartTime(value);
      return;
    }
    let durationMs = 60 * 60 * 1000;
    if (startTime && endTime) {
      const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
      if (diff > 0) durationMs = diff;
    }
    setStartTime(value);
    setEndTime(toLocalDateTimeInput(new Date(new Date(value).getTime() + durationMs)));
  };

  const handleEndChange = (value: string) => {
    if (!value || !startTime) {
      setEndTime(value);
      return;
    }
    if (value <= startTime) {
      setEndTime(new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16));
    } else {
      setEndTime(value);
    }
  };

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
          color: event?.color ?? defaultEventColor,
          reminderMinutes,
          responsibleUserId,
          owners
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
      contentLayout="flush"
    >
      <div className="flex min-h-0 w-full flex-1">
        <div className="min-w-0 flex-1 overflow-auto p-2.5">
          <div className="grid w-full gap-4">
            <Section title="Stammdaten">
              <FormField label="Titel" required>
                <Input value={title} onChange={(inputEvent) => setTitle(inputEvent.target.value)} required />
              </FormField>
              <FormField label="Beschreibung" className="mt-4">
                <RichTextInlineField value={description} placeholder="Beschreibung" minRows={12} testIdPrefix="event-description" onImageUpload={uploadContentImage} onChange={setDescription} />
              </FormField>
            </Section>

            {event && canReadJournal ? (
              <Section title="Journal" fill>
                <JournalPanel objectType="event" objectId={event.id} />
              </Section>
            ) : null}
          </div>
        </div>

        <FormSidebar storageKey="event-form-sidebar">
          <DatePicker label="Start" mode="datetime-local" variant="panel" value={startTime} onChange={(inputEvent) => handleStartChange(inputEvent.target.value)} />
          <DatePicker label="Ende" mode="datetime-local" variant="panel" value={endTime} onChange={(inputEvent) => handleEndChange(inputEvent.target.value)} />
          <FormField label="Erinnerung" icon={<Bell size={14} />} variant="panel">
            <select
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
              value={reminderMinutes}
              onChange={(inputEvent) => setReminderMinutes(Number(inputEvent.target.value))}
            >
              <option value={15}>15 Minuten vorher</option>
              <option value={60}>1 Stunde vorher</option>
              <option value={1440}>1 Tag vorher</option>
            </select>
          </FormField>
          <UserSelectField label="Verantwortlich" icon={<Users size={14} />} variant="panel" value={responsibleUserId} selectedUser={event?.responsibleUser ?? null} onChange={setResponsibleUserId} />
          <FormField label="Verknüpfungen" icon={<Users size={14} />} variant="panel" hint={projects.length === 0 && milestones.length === 0 && tasks.length === 0 ? "Keine Projekte, Meilensteine oder Aufgaben verfügbar." : undefined}>
            <div className="grid gap-3">
              <OwnerCheckboxGroup
                title="Projekte"
                owners={projects.map((project) => ({ type: "project", id: project.id }))}
                selectedOwners={owners}
                projects={projects}
                milestones={milestones}
                tasks={tasks}
                onToggle={toggleOwner}
              />
              <OwnerCheckboxGroup
                title="Meilensteine"
                owners={milestones.map((milestone) => ({ type: "milestone", id: milestone.id }))}
                selectedOwners={owners}
                projects={projects}
                milestones={milestones}
                tasks={tasks}
                onToggle={toggleOwner}
              />
              <OwnerCheckboxGroup
                title="Aufgaben"
                owners={tasks.map((task) => ({ type: "task", id: task.id }))}
                selectedOwners={owners}
                projects={projects}
                milestones={milestones}
                tasks={tasks}
                onToggle={toggleOwner}
              />
            </div>
          </FormField>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2.5 shadow-sm text-sm font-medium text-ink cursor-pointer hover:bg-steel-50">
            <input type="checkbox" checked={isAllDay} onChange={(inputEvent) => setIsAllDay(inputEvent.target.checked)} />
            Ganztägig
          </label>
          {event && canDelete && !event.readonly ? (
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => void onDelete(event).catch(() => undefined)}>
              Löschen
            </Button>
          ) : null}
        </FormSidebar>
      </div>
    </FormModal>
  );
}
