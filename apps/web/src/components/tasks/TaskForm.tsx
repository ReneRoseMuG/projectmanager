import type { Feature, Priority, Tag, Task, TaskInput, TaskStatus, UseCase } from "@taskmanager/shared-types";
import { ClipboardList, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { getUseCases } from "../../api/use-cases";
import { toDateInput } from "../../utils/date";
import { FeatureRelationPanel } from "../features/FeatureRelationPanel";
import { TagPicker } from "../tags/TagPicker";
import { UseCaseRelationPanel } from "../usecases/UseCaseRelationPanel";
import { DatePicker } from "../ui/DatePicker";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { RadioList } from "../ui/RadioList";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";

export interface TaskFormInput extends TaskInput {
  tagIds: number[];
  featureIds: number[];
  useCaseIds: number[];
}

interface TaskFormProps {
  open: boolean;
  task?: Task | null;
  features?: Feature[];
  initialStatus?: TaskStatus;
  title?: string;
  onSubmit: (input: TaskFormInput) => Promise<void>;
  onClose: () => void;
}

const statuses: Array<{ value: TaskStatus; label: string; activeColor: "fern" | "tangerine" | "crimson" }> = [
  { value: "todo", label: "Offen", activeColor: "crimson" },
  { value: "in_progress", label: "In Arbeit", activeColor: "tangerine" },
  { value: "done", label: "Erledigt", activeColor: "fern" }
];

const priorities: Array<{ value: Priority; label: string; activeColor: "fern" | "tangerine" | "crimson" | "violet" }> = [
  { value: "low", label: "Niedrig", activeColor: "fern" },
  { value: "medium", label: "Mittel", activeColor: "violet" },
  { value: "high", label: "Hoch", activeColor: "tangerine" },
  { value: "urgent", label: "Dringend", activeColor: "crimson" }
];

export function TaskForm({ open, task, features = [], initialStatus = "todo", title = "Aufgabe", onSubmit, onClose }: TaskFormProps) {
  const [taskTitle, setTaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>([]);
  const [selectedUseCaseIds, setSelectedUseCaseIds] = useState<number[]>([]);
  const [availableUseCases, setAvailableUseCases] = useState<UseCase[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTaskTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setStatus(task?.status ?? initialStatus);
    setPriority(task?.priority ?? "medium");
    setAssignee(task?.assignee ?? "");
    setDueDate(toDateInput(task?.dueDate));
    setSelectedTags(task?.tags ?? []);
    setSelectedFeatureIds([]);
    setSelectedUseCaseIds([]);
  }, [initialStatus, open, task]);

  useEffect(() => {
    if (!open || selectedFeatureIds.length === 0) {
      setAvailableUseCases([]);
      setSelectedUseCaseIds([]);
      return;
    }

    let cancelled = false;
    const loadUseCases = async () => {
      const lists = await Promise.all(selectedFeatureIds.map((featureId) => getUseCases(featureId)));
      if (cancelled) {
        return;
      }
      const merged = lists.flat();
      const allowedIds = new Set(merged.map((useCase) => useCase.id));
      setAvailableUseCases(merged);
      setSelectedUseCaseIds((current) => current.filter((id) => allowedIds.has(id)));
    };

    void loadUseCases();
    return () => {
      cancelled = true;
    };
  }, [open, selectedFeatureIds]);

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
        dueDate: dueDate || null,
        tagIds: selectedTags.map((tag) => tag.id),
        featureIds: selectedFeatureIds,
        useCaseIds: selectedUseCaseIds
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
      subtitle="Aufgabe, Tags und Dokumentverknüpfungen in einem Schritt pflegen."
      icon={<ClipboardList size={20} />}
      breadcrumb={["Projekt", task ? "Aufgabe bearbeiten" : "Neue Aufgabe"]}
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
            <RichTextEditor content={description} placeholder="Beschreibung" toolbar="minimal" minHeight="8rem" onChange={setDescription} />
          </FormField>
        </div>
      </Section>

      <Section title="Status & Priorität">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status">
            <RadioList value={status} options={statuses} onChange={setStatus} />
          </FormField>
          <FormField label="Priorität">
            <RadioList value={priority} options={priorities} onChange={setPriority} />
          </FormField>
        </div>
      </Section>

      <Section title="Zuweisung">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Zuständig">
            <Input iconLeft={<UserRound size={16} />} value={assignee} onChange={(event) => setAssignee(event.target.value)} />
          </FormField>
          <DatePicker label="Fällig" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
      </Section>

      <Section title="Tags">
        <TagPicker selected={selectedTags} onChange={setSelectedTags} />
      </Section>

      <Section title="Features">
        <FeatureRelationPanel features={features} selectedIds={selectedFeatureIds} onChange={setSelectedFeatureIds} onSave={async () => undefined} showSave={false} />
      </Section>

      <Section title="Use Cases">
        <UseCaseRelationPanel useCases={availableUseCases} selectedIds={selectedUseCaseIds} onChange={setSelectedUseCaseIds} onSave={async () => undefined} showSave={false} />
      </Section>
    </FormModal>
  );
}
