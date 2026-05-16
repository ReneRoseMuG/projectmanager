import type { Note, Priority, Tag, TaskStatus } from "@taskmanager/shared-types";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAttachments } from "../../hooks/useAttachments";
import { useTaskDocLinks } from "../../hooks/useDocLinks";
import { errorMessage } from "../../hooks/errors";
import { useFeatures } from "../../hooks/useFeatures";
import { useNotes } from "../../hooks/useNotes";
import { useTaskDetail } from "../../hooks/useTaskDetail";
import { toDateInput } from "../../utils/date";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { FeaturePicker } from "../features/FeaturePicker";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { TagPicker } from "../tags/TagPicker";
import { Button } from "../ui/Button";
import { DatePicker } from "../ui/DatePicker";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { TaskListSkeleton } from "../ui/Skeleton";
import { useToast } from "../ui/ToastProvider";
import { CommentSection } from "./CommentSection";
import { SubtaskList } from "./SubtaskList";
import { UseCasePicker } from "../usecases/UseCasePicker";

interface TaskDetailProps {
  taskId: number | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

type DetailTab = "details" | "subtasks" | "comments" | "docs" | "notes" | "attachments";

const tabs: Array<{ value: DetailTab; label: string }> = [
  { value: "details", label: "Details" },
  { value: "subtasks", label: "Subtasks" },
  { value: "comments", label: "Kommentare" },
  { value: "docs", label: "Features & UCs" },
  { value: "notes", label: "Notizen" },
  { value: "attachments", label: "Dateien" }
];

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

export function TaskDetail({ taskId, open, onClose, onChanged }: TaskDetailProps) {
  const { showToast } = useToast();
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

  const saveDocLinks = async () => {
    try {
      await docLinks.setFeaturesForTask(selectedFeatureIds);
      await docLinks.setUseCasesForTask(selectedUseCaseIds);
      showToast({ tone: "success", title: "Verknüpfungen gespeichert" });
    } catch (linkError) {
      showToast({ tone: "error", title: "Verknüpfungen konnten nicht gespeichert werden", message: errorMessage(linkError) });
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Modal open={open} title={detail.task?.title ?? "Aufgabe"} size="xl" onClose={onClose}>
      {detail.loading ? (
        <TaskListSkeleton />
      ) : detail.task ? (
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-2 border-b border-line pb-3">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`h-9 rounded-md px-3 text-sm font-medium ${activeTab === tab.value ? "bg-ink text-white" : "hover:bg-line/50"}`}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "details" ? (
            <form className="grid gap-4" onSubmit={saveDetails}>
              <label className="grid gap-1 text-sm font-medium">
                Titel
                <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" value={title} onChange={(event) => setTitle(event.target.value)} required />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Beschreibung
                <textarea
                  className="min-h-28 rounded-md border border-line px-3 py-2 outline-none focus:border-teal"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
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
              <TagPicker selected={selectedTags} onChange={setSelectedTags} />
              <div className="flex justify-end border-t border-line pt-4">
                <Button type="submit" variant="primary" icon={<Save size={16} />}>
                  Speichern
                </Button>
              </div>
            </form>
          ) : null}

          {activeTab === "subtasks" ? (
            <SubtaskList
              subtasks={detail.task.subtasks}
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
            <CommentSection
              comments={detail.task.comments}
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

          {activeTab === "docs" ? (
            allFeatures.loading || docLinks.loading ? (
              <TaskListSkeleton />
            ) : (
              <div className="grid gap-5">
                {docLinks.error ? <div className="rounded-md border border-line p-3 text-sm text-coral">{docLinks.error}</div> : null}
                <section className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-ink">Features</h3>
                      <p className="text-sm text-slate-600">{selectedFeatureIds.length} ausgewählt</p>
                    </div>
                    <Button variant="primary" icon={<Save size={16} />} onClick={() => void saveDocLinks()}>
                      Speichern
                    </Button>
                  </div>
                  <FeaturePicker features={allFeatures.features} selectedIds={selectedFeatureIds} onChange={setSelectedFeatureIds} />
                </section>
                <section className="grid gap-3">
                  <div>
                    <h3 className="font-semibold text-ink">Use Cases</h3>
                    <p className="text-sm text-slate-600">{selectedUseCaseIds.length} ausgewählt</p>
                  </div>
                  <UseCasePicker useCases={docLinks.availableUseCases} selectedIds={selectedUseCaseIds} onChange={setSelectedUseCaseIds} />
                </section>
              </div>
            )
          ) : null}

          {activeTab === "notes" ? (
            <>
              <NoteList
                notes={notes.notes}
                onCreate={createNote}
                onEdit={setEditingNote}
                onDelete={(note) => {
                  if (window.confirm("Notiz löschen?")) {
                    void notes.removeNote(note.id)
                      .then(() => showToast({ tone: "success", title: "Notiz gelöscht" }))
                      .catch((noteError: unknown) => showToast({ tone: "error", title: "Notiz konnte nicht gelöscht werden", message: errorMessage(noteError) }));
                  }
                }}
              />
              <NoteEditor note={editingNote} open={Boolean(editingNote)} onSave={notes.updateNote} onClose={() => setEditingNote(null)} />
            </>
          ) : null}

          {activeTab === "attachments" ? (
            <div className="grid gap-4">
              <AttachmentUploader onUpload={uploadAttachment} />
              <AttachmentList
                attachments={attachments.attachments}
                onDelete={(attachment) => {
                  if (window.confirm("Datei löschen?")) {
                    void attachments.removeAttachment(attachment.id)
                      .then(() => showToast({ tone: "success", title: "Datei gelöscht" }))
                      .catch((attachmentError: unknown) => showToast({ tone: "error", title: "Datei konnte nicht gelöscht werden", message: errorMessage(attachmentError) }));
                  }
                }}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-slate-600">{detail.error ?? "Nicht gefunden"}</div>
      )}
    </Modal>
  );
}
