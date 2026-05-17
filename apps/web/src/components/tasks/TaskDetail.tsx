import type { Note, Priority, Tag, TaskStatus } from "@taskmanager/shared-types";
import { CalendarDays, Paperclip, Save, StickyNote, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAttachments } from "../../hooks/useAttachments";
import { useTaskDocLinks } from "../../hooks/useDocLinks";
import { errorMessage } from "../../hooks/errors";
import { useFeatures } from "../../hooks/useFeatures";
import { useNotes } from "../../hooks/useNotes";
import { useTaskDetail } from "../../hooks/useTaskDetail";
import { formatHumanDate, toDateInput } from "../../utils/date";
import { priorityLabels, priorityPillTones, taskStatusLabels, taskStatusTones } from "../../utils/domainLabels";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { FeatureRelationPanel } from "../features/FeatureRelationPanel";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { TagPicker } from "../tags/TagPicker";
import { UseCaseRelationPanel } from "../usecases/UseCaseRelationPanel";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { DatePicker } from "../ui/DatePicker";
import { DetailModal } from "../ui/DetailModal";
import { FormField } from "../ui/FormField";
import { Pill } from "../ui/Pill";
import { ProgressBar } from "../ui/ProgressBar";
import { RadioList } from "../ui/RadioList";
import { Section } from "../ui/Section";
import { SectionHeader } from "../ui/SectionHeader";
import { TaskListSkeleton } from "../ui/Skeleton";
import { useToast } from "../ui/ToastProvider";
import { CommentThread } from "../ui/CommentThread";
import { SubtaskList } from "./SubtaskList";

interface TaskDetailProps {
  taskId: number | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

type DetailTab = "details" | "features" | "useCases" | "subtasks" | "comments" | "notes" | "attachments";

const tabs: Array<{ value: DetailTab; label: string }> = [
  { value: "details", label: "Details" },
  { value: "features", label: "Features" },
  { value: "useCases", label: "Use Cases" },
  { value: "subtasks", label: "Subtasks" },
  { value: "comments", label: "Kommentare" },
  { value: "notes", label: "Notizen" },
  { value: "attachments", label: "Dateien" }
];

const statuses: Array<{ value: TaskStatus; label: string; activeColor: "fern" | "tangerine" | "crimson" | "violet" }> = [
  { value: "todo", label: "Offen", activeColor: "violet" },
  { value: "in_progress", label: "In Arbeit", activeColor: "tangerine" },
  { value: "done", label: "Erledigt", activeColor: "fern" }
];

const priorities: Array<{ value: Priority; label: string; activeColor: "fern" | "tangerine" | "crimson" | "violet" }> = [
  { value: "low", label: "Niedrig", activeColor: "violet" },
  { value: "medium", label: "Mittel", activeColor: "fern" },
  { value: "high", label: "Hoch", activeColor: "tangerine" },
  { value: "urgent", label: "Dringend", activeColor: "crimson" }
];

export function TaskDetail({ taskId, open, onClose, onChanged }: TaskDetailProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const detail = useTaskDetail(open ? taskId : null);
  const allFeatures = useFeatures();
  const docLinks = useTaskDocLinks(open ? taskId : null);
  const notes = useNotes(taskId && open ? { type: "task", id: taskId } : null);
  const attachments = useAttachments(taskId && open ? { type: "task", id: taskId } : null);
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>([]);
  const [selectedUseCaseIds, setSelectedUseCaseIds] = useState<number[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!detail.task) {
      return;
    }
    setTitle(detail.task.title);
    setDescription(detail.task.description ?? "");
    setStatus(detail.task.status);
    setPriority(detail.task.priority);
    setAssignee(detail.task.assignee ?? "");
    setDueDate(toDateInput(detail.task.dueDate));
    setSelectedTags(detail.task.tags);
  }, [detail.task]);

  useEffect(() => {
    setSelectedFeatureIds(docLinks.features.map((feature) => feature.id));
    setSelectedUseCaseIds(docLinks.useCases.map((useCase) => useCase.id));
  }, [docLinks.features, docLinks.useCases]);

  const saveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await detail.updateTask({ title, description, status, priority, assignee, dueDate: dueDate || null });
      await detail.updateTags(selectedTags);
      await onChanged();
      showToast({ tone: "success", title: "Aufgabe gespeichert" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabe konnte nicht gespeichert werden", message: errorMessage(taskError) });
    }
  };

  const createNote = async () => {
    try {
      const note = await notes.createNote({ title: "Ohne Titel", contentJson: {} });
      if (note) {
        setEditingNote(note);
        showToast({ tone: "success", title: "Notiz erstellt" });
      }
    } catch (noteError) {
      showToast({ tone: "error", title: "Notiz konnte nicht erstellt werden", message: errorMessage(noteError) });
    }
  };

  const uploadAttachment = async (file: File) => {
    try {
      const uploaded = await attachments.uploadAttachment(file);
      showToast({ tone: "success", title: "Datei hochgeladen" });
      return uploaded;
    } catch (attachmentError) {
      showToast({ tone: "error", title: "Datei konnte nicht hochgeladen werden", message: errorMessage(attachmentError) });
      throw attachmentError;
    }
  };

  const saveFeatureLinks = async () => {
    try {
      await docLinks.setFeaturesForTask(selectedFeatureIds);
      showToast({ tone: "success", title: "Feature-Verknüpfungen gespeichert" });
    } catch (linkError) {
      showToast({ tone: "error", title: "Feature-Verknüpfungen konnten nicht gespeichert werden", message: errorMessage(linkError) });
    }
  };

  const saveUseCaseLinks = async () => {
    try {
      await docLinks.setUseCasesForTask(selectedUseCaseIds);
      showToast({ tone: "success", title: "Use-Case-Verknüpfungen gespeichert" });
    } catch (linkError) {
      showToast({ tone: "error", title: "Use-Case-Verknüpfungen konnten nicht gespeichert werden", message: errorMessage(linkError) });
    }
  };

  if (!open) {
    return null;
  }

  const task = detail.task;
  const completedSubtasks = task?.subtasks.filter((subtask) => subtask.status === "done").length ?? 0;
  const totalSubtasks = task?.subtasks.length ?? 0;
  const counts: Partial<Record<DetailTab, number>> = {
    features: docLinks.features.length,
    useCases: docLinks.useCases.length,
    subtasks: totalSubtasks,
    comments: task?.comments.length ?? 0,
    notes: notes.notes.length,
    attachments: attachments.attachments.length
  };
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  const tabItems = tabs.map((tab) => ({ ...tab, count: counts[tab.value] }));

  return (
    <DetailModal
      open={open}
      title={task?.title ?? "Aufgabe"}
      subtitle={task ? `TASK-${task.id}` : undefined}
      breadcrumb={task ? [`Projekt #${task.projectId}`, "Aufgaben", `TASK-${task.id}`] : ["Aufgaben"]}
      tabs={tabItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onClose={onClose}
      metaPills={
        task ? (
          <>
            <Pill tone={taskStatusTones[task.status]}>{taskStatusLabels[task.status]}</Pill>
            <Pill tone={priorityPillTones[task.priority]}>{priorityLabels[task.priority]}</Pill>
          </>
        ) : null
      }
      metaInfo={
        task ? (
          <>
            <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-white/85">
              <CalendarDays size={13} />
              {task.dueDate ? formatHumanDate(task.dueDate) : "Kein Datum"}
            </span>
            <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-white/85">
              <UserRound size={13} />
              {task.assignee || "Nicht zugewiesen"}
            </span>
          </>
        ) : null
      }
      footer={
        task ? (
          <Button type="submit" form="task-detail-form" variant="primary" icon={<Save size={16} />} disabled={activeTab !== "details"}>
            Speichern
          </Button>
        ) : undefined
      }
    >
      {detail.loading ? (
        <div>
          <TaskListSkeleton />
        </div>
      ) : task ? (
        <>
            {activeTab === "details" ? (
              <form id="task-detail-form" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]" onSubmit={saveDetails}>
                <div className="grid gap-4">
                  <Section>
                    <div className="grid gap-4">
                      <div>
                        <SectionHeader title="Basisdaten" description="Titel und Beschreibung der Aufgabe." variant="label" />
                      </div>
                      <FormField label="Titel" required>
                        <input
                          className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          required
                        />
                      </FormField>
                      <FormField label="Beschreibung">
                        <textarea
                          className="min-h-32 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
                          value={description}
                          onChange={(event) => setDescription(event.target.value)}
                        />
                      </FormField>
                    </div>
                  </Section>

                  <Section>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <SectionHeader title="Status" variant="label" />
                        <RadioList value={status} options={statuses} onChange={setStatus} />
                      </div>
                      <div className="grid gap-2">
                        <SectionHeader title="Priorität" variant="label" />
                        <RadioList value={priority} options={priorities} onChange={setPriority} />
                      </div>
                    </div>
                  </Section>

                  <Section>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Zuständig">
                        <input
                          className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
                          value={assignee}
                          onChange={(event) => setAssignee(event.target.value)}
                        />
                      </FormField>
                      <DatePicker label="Fällig" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                    </div>
                  </Section>

                  <Section>
                    <TagPicker selected={selectedTags} onChange={setSelectedTags} />
                  </Section>
                </div>

                <aside className="grid content-start gap-4">
                  <Section>
                    <div className="grid gap-3">
                      <div>
                        <SectionHeader title="Aktivität" description="Letzte bekannte Änderungen." variant="label" />
                      </div>
                      <div className="rounded-md border border-line bg-shell/60 p-3">
                        <p className="text-sm font-semibold text-ink">Aufgabe erstellt</p>
                        <time className="text-xs text-slate-500">{formatHumanDate(task.createdAt)}</time>
                      </div>
                      <div className="rounded-md border border-line bg-shell/60 p-3">
                        <p className="text-sm font-semibold text-ink">Zuletzt aktualisiert</p>
                        <time className="text-xs text-slate-500">{formatHumanDate(task.updatedAt)}</time>
                      </div>
                    </div>
                  </Section>
                  <Section>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <SectionHeader title="Subtasks" variant="label" actions={<span className="text-xs font-semibold text-slate-500">{completedSubtasks}/{totalSubtasks}</span>} />
                      </div>
                      <ProgressBar value={progress} size="sm" />
                    </div>
                  </Section>
                </aside>
              </form>
            ) : null}

            {activeTab === "subtasks" ? (
              <SubtaskList
                subtasks={task.subtasks}
                onCreate={async (input) => {
                  try {
                    await detail.createSubtask(input);
                    await onChanged();
                    showToast({ tone: "success", title: "Subtask erstellt" });
                  } catch (taskError) {
                    showToast({ tone: "error", title: "Subtask konnte nicht erstellt werden", message: errorMessage(taskError) });
                    throw taskError;
                  }
                }}
                onUpdate={async (id, input) => {
                  try {
                    await detail.updateSubtask(id, input);
                    await onChanged();
                    showToast({ tone: "success", title: "Subtask aktualisiert" });
                  } catch (taskError) {
                    showToast({ tone: "error", title: "Subtask konnte nicht aktualisiert werden", message: errorMessage(taskError) });
                    throw taskError;
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await detail.removeSubtask(id);
                    await onChanged();
                    showToast({ tone: "success", title: "Subtask gelöscht" });
                  } catch (taskError) {
                    showToast({ tone: "error", title: "Subtask konnte nicht gelöscht werden", message: errorMessage(taskError) });
                    throw taskError;
                  }
                }}
              />
            ) : null}

            {activeTab === "comments" ? (
              <CommentThread
                comments={task.comments}
                entityLabel="Task"
                onCreate={async (input) => {
                  try {
                    await detail.createComment(input);
                    showToast({ tone: "success", title: "Kommentar erstellt" });
                  } catch (commentError) {
                    showToast({ tone: "error", title: "Kommentar konnte nicht erstellt werden", message: errorMessage(commentError) });
                    throw commentError;
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await detail.removeComment(id);
                    showToast({ tone: "success", title: "Kommentar gelöscht" });
                  } catch (commentError) {
                    showToast({ tone: "error", title: "Kommentar konnte nicht gelöscht werden", message: errorMessage(commentError) });
                    throw commentError;
                  }
                }}
              />
            ) : null}

            {activeTab === "features" ? (
              allFeatures.loading || docLinks.loading ? (
                <TaskListSkeleton />
              ) : (
                <div className="grid gap-4">
                  {docLinks.error ? <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{docLinks.error}</div> : null}
                  <Section>
                    <FeatureRelationPanel features={allFeatures.features} selectedIds={selectedFeatureIds} onChange={setSelectedFeatureIds} onSave={saveFeatureLinks} />
                  </Section>
                </div>
              )
            ) : null}

            {activeTab === "useCases" ? (
              docLinks.loading ? (
                <TaskListSkeleton />
              ) : (
                <div className="grid gap-4">
                  {docLinks.error ? <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{docLinks.error}</div> : null}
                  <UseCaseRelationPanel useCases={docLinks.availableUseCases} selectedIds={selectedUseCaseIds} onChange={setSelectedUseCaseIds} onSave={saveUseCaseLinks} />
                </div>
              )
            ) : null}

            {activeTab === "notes" ? (
              <Section>
                <div className="mb-4 flex items-center gap-2">
                  <StickyNote size={18} className="text-fern" />
                  <SectionHeader title="Notizen" />
                </div>
                <NoteList
                  notes={notes.notes}
                  onCreate={createNote}
                  onEdit={setEditingNote}
                  onDelete={(note) => {
                    void confirm({
                      title: "Notiz löschen?",
                      body: `Die Notiz "${note.title}" wird entfernt.`,
                      severity: "danger",
                      confirmLabel: "Löschen"
                    }).then((approved) => {
                      if (approved) {
                        void notes
                          .removeNote(note.id)
                          .then(() => showToast({ tone: "success", title: "Notiz gelöscht" }))
                          .catch((noteError: unknown) => showToast({ tone: "error", title: "Notiz konnte nicht gelöscht werden", message: errorMessage(noteError) }));
                      }
                    });
                  }}
                />
                <NoteEditor note={editingNote} open={Boolean(editingNote)} onSave={notes.updateNote} onClose={() => setEditingNote(null)} />
              </Section>
            ) : null}

            {activeTab === "attachments" ? (
              <Section>
                <div className="mb-4 flex items-center gap-2">
                  <Paperclip size={18} className="text-fern" />
                  <SectionHeader title="Dateien" />
                </div>
                <div className="grid gap-4">
                  <AttachmentUploader size="sm" onUpload={uploadAttachment} />
                  <AttachmentList
                    attachments={attachments.attachments}
                    onDelete={(attachment) => {
                      void confirm({
                        title: "Datei löschen?",
                        body: attachment.originalName,
                        severity: "danger",
                        confirmLabel: "Löschen"
                      }).then((approved) => {
                        if (approved) {
                          void attachments
                            .removeAttachment(attachment.id)
                            .then(() => showToast({ tone: "success", title: "Datei gelöscht" }))
                            .catch((attachmentError: unknown) => showToast({ tone: "error", title: "Datei konnte nicht gelöscht werden", message: errorMessage(attachmentError) }));
                        }
                      });
                    }}
                  />
                </div>
              </Section>
            ) : null}
        </>
      ) : (
        <div className="p-8 text-center text-sm text-slate-600">{detail.error ?? "Nicht gefunden"}</div>
      )}
    </DetailModal>
  );
}
