import type { Feature, FeatureStatus, Task, UseCase, UseCaseInput } from "@taskmanager/shared-types";
import { BookOpen, LinkIcon, ListTodo, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { EmptyState } from "../ui/EmptyState";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { Pill } from "../ui/Pill";
import { RelationPanel } from "../ui/RelationPanel";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Select } from "../ui/Select";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useUseCaseTaskLinks } from "../../hooks/useDocLinks";
import { priorityLabels, priorityPillTones, taskStatusLabels, taskStatusTones } from "../../utils/domainLabels";

interface UseCaseFormProps {
  open: boolean;
  useCase?: UseCase | null;
  featureTitle?: string;
  currentFeatureId?: number;
  features?: Feature[];
  onSubmit: (input: UseCaseInput) => Promise<void>;
  onDelete?: (useCase: UseCase) => Promise<boolean> | boolean;
  onClose: () => void;
}

const statuses: Array<{ value: FeatureStatus; label: string; activeClassName: string }> = [
  { value: "draft", label: "Entwurf", activeClassName: "data-[active=true]:bg-mustard data-[active=true]:text-mustard-dark" },
  { value: "active", label: "Aktiv", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" },
  { value: "done", label: "Erledigt", activeClassName: "data-[active=true]:bg-violet data-[active=true]:text-white" },
  { value: "archived", label: "Archiviert", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" }
];

export function UseCaseForm({ open, useCase, featureTitle, currentFeatureId, features = [], onSubmit, onDelete, onClose }: UseCaseFormProps) {
  const comments = useEntityComments("useCase", useCase?.id);
  const taskLinks = useUseCaseTaskLinks(useCase?.id);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<FeatureStatus>("draft");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [content, setContent] = useState("");
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | "">("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [taskLinksSaving, setTaskLinksSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(useCase?.title ?? "");
    setSlug(useCase?.slug ?? "");
    setStatus(useCase?.status ?? "draft");
    setDescription(useCase?.description ?? "");
    setSortOrder(useCase?.sortOrder ?? 0);
    setContent(useCase?.content ?? "");
    setSelectedFeatureId(useCase?.featureId ?? currentFeatureId ?? "");
  }, [currentFeatureId, open, useCase]);

  useEffect(() => {
    setSelectedTaskIds(taskLinks.linkedTasks.map((task) => task.id));
  }, [taskLinks.linkedTasks]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ featureId: selectedFeatureId ? Number(selectedFeatureId) : undefined, title, slug, status, description, sortOrder, content });
      onClose();
    } catch {
      // Error feedback is handled by the page-level toast.
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrentUseCase = async () => {
    if (!useCase || !onDelete) {
      return;
    }

    setDeleting(true);
    try {
      const deleted = await onDelete(useCase);
      if (deleted) {
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  };

  const saveTaskLinks = async () => {
    setTaskLinksSaving(true);
    try {
      await taskLinks.setTasksForUseCase(selectedTaskIds);
    } finally {
      setTaskLinksSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      title={useCase ? "Use Case bearbeiten" : "Use Case anlegen"}
      subtitle={featureTitle ? `Feature: ${featureTitle}` : undefined}
      icon={<BookOpen size={21} />}
      breadcrumb={["Use Cases", useCase ? useCase.title : "Neu"]}
      onSubmit={submit}
      saving={saving}
      onClose={onClose}
    >
      <Section title="Stammdaten">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Titel" required className="min-w-0">
            <Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} required />
          </FormField>
          <FormField label="Slug" required className="min-w-0">
            <Input iconLeft={<LinkIcon size={16} />} value={slug} onChange={(event) => setSlug(event.target.value)} required variant="mono" />
          </FormField>
        </div>
      </Section>

      <Section title="Zuordnung">
        <Select label="Feature" value={selectedFeatureId} onChange={(event) => setSelectedFeatureId(event.target.value ? Number(event.target.value) : "")}>
          <option value="">Ohne Feature</option>
          {features.map((feature) => (
            <option key={feature.id} value={feature.id}>
              {feature.title}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-xs text-slate-500">Die bestehende API speichert Use Cases aktuell über den Feature-Kontext der Route; die Auswahl zeigt die Zuordnung transparent an.</p>
      </Section>

      <Section title="Status & Sortierung">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
          <FormField label="Status">
            <SegmentedControl value={status} options={statuses} onChange={setStatus} />
          </FormField>
          <FormField label="Sortierung">
            <Input type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
          </FormField>
        </div>
      </Section>

      <Section title="Kurzbeschreibung">
        <FormField label="Kurzbeschreibung">
          <RichTextEditor content={description} placeholder="Kurze fachliche Zusammenfassung" toolbar="minimal" minHeight="7rem" onChange={setDescription} />
        </FormField>
      </Section>

      <Section title="Inhalt" actions={<span className="text-xs font-semibold text-slate-500">HTML</span>}>
        {/* TODO: migrate existing markdown content to HTML. */}
        <RichTextEditor content={content} placeholder="Use-Case-Inhalt" toolbar="full" onChange={setContent} />
      </Section>

      {useCase && onDelete ? (
        <Section title="Gefahrenzone">
          <Button className="text-crimson hover:bg-crimson/10" icon={<Trash2 size={16} />} variant="ghost" disabled={deleting} onClick={() => void deleteCurrentUseCase()}>
            Löschen
          </Button>
        </Section>
      ) : null}

      {useCase ? (
        <>
          {taskLinks.error ? <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{taskLinks.error}</div> : null}
          <RelationPanel
            items={taskLinks.tasks}
            selectedIds={selectedTaskIds}
            onChange={setSelectedTaskIds}
            onSave={saveTaskLinks}
            saving={taskLinksSaving}
            title="Aufgaben"
            searchKeys={["title", "description", "status", "priority"]}
            emptyAvailable={<EmptyState icon={<ListTodo size={22} />} title="Keine Aufgaben vorhanden" body="Lege zuerst Aufgaben an, um sie mit diesem Use Case zu verknüpfen." tone="fern" variant="tinted" />}
            renderItem={(task) => <TaskRelationItem task={task} />}
          />
        </>
      ) : null}

      {useCase ? (
        <Section title="Kommentare">
          {comments.error ? <div className="mb-3 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{comments.error}</div> : null}
          <CommentThread comments={comments.comments} entityLabel="Use Case" onCreate={comments.createComment} onDelete={comments.removeComment} />
        </Section>
      ) : null}
    </FormModal>
  );
}

function TaskRelationItem({ task }: { task: Task }) {
  return (
    <span className="grid gap-1">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="truncate text-sm font-semibold text-ink">{task.title}</span>
        <Pill tone={taskStatusTones[task.status]}>{taskStatusLabels[task.status]}</Pill>
        <Pill tone={priorityPillTones[task.priority]}>{priorityLabels[task.priority]}</Pill>
      </span>
      <span className="truncate text-xs text-slate-500">{task.description || "Keine Beschreibung"}</span>
    </span>
  );
}
