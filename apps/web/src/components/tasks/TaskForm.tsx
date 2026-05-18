import type { Priority, Tag, Task, TaskInput, TaskStatus } from "@taskmanager/shared-types";
import { ClipboardList } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { toDateInput } from "../../utils/date";
import { priorityLabels, taskStatusLabels } from "../../utils/domainLabels";
import { TagPicker } from "../tags/TagPicker";
import { DatePicker } from "../ui/DatePicker";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { RadioList } from "../ui/RadioList";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";

export interface TaskFormInput extends TaskInput {
  tagIds: number[];
}

interface TaskFormProps {
  open: boolean;
  task?: Task | null;
  initialStatus?: TaskStatus;
  title?: string;
  onSubmit: (input: TaskFormInput) => Promise<void>;
  onClose: () => void;
}

const statuses: Array<{ value: TaskStatus; label: string; activeColor: "fern" | "tangerine" | "crimson" }> = [
  { value: "todo", label: taskStatusLabels.todo, activeColor: "crimson" },
  { value: "in_progress", label: taskStatusLabels.in_progress, activeColor: "tangerine" },
  { value: "done", label: taskStatusLabels.done, activeColor: "fern" }
];

const priorities: Array<{ value: Priority; label: string; activeColor: "fern" | "tangerine" | "crimson" | "violet" }> = [
  { value: "low", label: priorityLabels.low, activeColor: "fern" },
  { value: "medium", label: priorityLabels.medium, activeColor: "violet" },
  { value: "high", label: priorityLabels.high, activeColor: "tangerine" },
  { value: "urgent", label: priorityLabels.urgent, activeColor: "crimson" }
];

export function TaskForm({ open, task, initialStatus = "todo", title = "Aufgabe", onSubmit, onClose }: TaskFormProps) {
  const [taskTitle, setTaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTaskTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setStatus(task?.status ?? initialStatus);
    setPriority(task?.priority ?? "medium");
    setDueDate(toDateInput(task?.dueDate));
    setSelectedTags(task?.tags ?? []);
  }, [initialStatus, open, task]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        title: taskTitle,
        description,
        status,
        priority,
        assignee: null,
        dueDate: dueDate || null,
        tagIds: selectedTags.map((tag) => tag.id)
      });
      onClose();
    } catch {
      // Error feedback is handled by the caller.
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      title={task ? "Aufgabe bearbeiten" : title}
      subtitle="Aufgabe, Beschreibung, Status, Termin und Tags pflegen."
      icon={<ClipboardList size={20} />}
      breadcrumb={["Aufgaben", task ? "Bearbeiten" : "Neu"]}
      submitLabel={task ? "Speichern" : "Aufgabe anlegen"}
      saving={saving}
      onSubmit={submit}
      onClose={onClose}
    >
      <Section title="Basisdaten">
        <div className="grid gap-4">
          <FormField label="Titel" required>
            <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} required autoFocus={!task} />
          </FormField>
          <FormField label="Beschreibung">
            <RichTextEditor content={description} placeholder="Beschreibung" toolbar="full" minHeight="8rem" onChange={setDescription} />
          </FormField>
        </div>
      </Section>

      <Section title="Status & Priorität">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <FormField label="Status">
            <RadioList value={status} options={statuses} onChange={setStatus} />
          </FormField>
          <FormField label="Priorität">
            <RadioList value={priority} options={priorities} onChange={setPriority} />
          </FormField>
        </div>
      </Section>

      <Section title="Termin">
        <DatePicker label="Fällig" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      </Section>

      <Section title="Tags">
        <TagPicker selected={selectedTags} onChange={setSelectedTags} />
      </Section>
    </FormModal>
  );
}
