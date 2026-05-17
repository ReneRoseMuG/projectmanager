import type { Note, Priority, Tag, TaskStatus } from "@taskmanager/shared-types";
import { CalendarDays, Check, Link2, MoreHorizontal, Paperclip, Save, StickyNote, UserRound, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAttachments } from "../../hooks/useAttachments";
import { useTaskDocLinks } from "../../hooks/useDocLinks";
import { errorMessage } from "../../hooks/errors";
import { useFeatures } from "../../hooks/useFeatures";
import { useNotes } from "../../hooks/useNotes";
import { useTaskDetail } from "../../hooks/useTaskDetail";
import { formatHumanDate, toDateInput } from "../../utils/date";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { FeaturePicker } from "../features/FeaturePicker";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { TagPicker } from "../tags/TagPicker";
import { UseCasePicker } from "../usecases/UseCasePicker";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { DatePicker } from "../ui/DatePicker";
import { Modal } from "../ui/Modal";
import { Pill, type PillTone } from "../ui/Pill";
import { TaskListSkeleton } from "../ui/Skeleton";
import { useToast } from "../ui/ToastProvider";
import { CommentSection } from "./CommentSection";
import { SubtaskList } from "./SubtaskList";

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

const statusLabels: Record<TaskStatus, string> = {
  todo: "Offen",
  in_progress: "In Arbeit",
  done: "Erledigt"
};

const priorityLabels: Record<Priority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  urgent: "Dringend"
};

const statusTones: Record<TaskStatus, PillTone> = {
  todo: "steel",
  in_progress: "tangerine",
  done: "fern"
};

const priorityTones: Record<Priority, PillTone> = {
  low: "steel",
  medium: "mustard",
  high: "tangerine",
  urgent: "crimson"
};

const sectionClass = "rounded-lg border border-line bg-white p-4 shadow-[0_10px_28px_rgba(31,43,56,0.06)]";

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

  const task = detail.task;
  const completedSubtasks = task?.subtasks.filter((subtask) => subtask.status === "done").length ?? 0;
  const totalSubtasks = task?.subtasks.length ?? 0;
  const docLinkCount = docLinks.features.length + docLinks.useCases.length;
  const counts: Partial<Record<DetailTab, number>> = {
    subtasks: totalSubtasks,
    comments: task?.comments.length ?? 0,
    docs: docLinkCount,
    notes: notes.notes.length,
    attachments: attachments.attachments.length
  };
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <Modal open={open} title={task?.title ?? "Aufgabe"} size="xl" showHeader={false} bodyClassName="p-0" onClose={onClose}>
      {detail.loading ? (
        <div className="bg-shell p-6">
          <TaskListSkeleton />
        </div>
      ) : task ? (
        <div className="flex max-h-[calc(100vh-64px)] flex-col bg-shell">
          <header className="relative overflow-hidden border-b border-steel-900 bg-gradient-to-br from-steel-900 via-steel-800 to-steel-700 px-5 py-5 text-white md:px-6">
            <div className="relative grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-white/70">
                  <span>Projekt #{task.projectId}</span>
                  <span>/</span>
                  <span>Aufgaben</span>
                  <span>/</span>
                  <span>TASK-{task.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white md:inline-flex">
                    <UserRound size={14} />
                    Single User
                  </div>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/12 hover:text-white" aria-label="Link kopieren" title="Link kopieren">
                    <Link2 size={17} />
                  </button>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/12 hover:text-white" aria-label="Mehr Optionen" title="Mehr Optionen">
                    <MoreHorizontal size={18} />
                  </button>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/12 hover:text-white" aria-label="Schließen" title="Schließen" onClick={onClose}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="max-w-[760px] text-2xl font-bold leading-tight tracking-normal text-white md:text-3xl">{task.title}</h2>
                  <Badge tone="steel">TASK-{task.id}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={statusTones[task.status]}>{statusLabels[task.status]}</Pill>
                  <Pill tone={priorityTones[task.priority]}>{priorityLabels[task.priority]}</Pill>
                  <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-white/85">
                    <CalendarDays size={13} />
                    {task.dueDate ? formatHumanDate(task.dueDate) : "Kein Datum"}
                  </span>
                  <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-white/85">
                    <UserRound size={13} />
                    {task.assignee || "Nicht zugewiesen"}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <nav className="flex gap-1 overflow-x-auto border-b border-line bg-white px-4 md:px-5">
            {tabs.map((tab) => {
              const selected = activeTab === tab.value;
              const count = counts[tab.value];
              return (
                <button
                  key={tab.value}
                  type="button"
                  className={`flex h-12 shrink-0 items-center gap-2 border-b-2 px-2 text-sm font-semibold transition md:px-3 ${
                    selected ? "border-fern text-ink" : "border-transparent text-slate-500 hover:text-ink"
                  }`}
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label}
                  {typeof count === "number" ? <span className={`rounded-full px-2 py-0.5 text-xs ${selected ? "bg-fern/10 text-fern" : "bg-shell text-slate-500"}`}>{count}</span> : null}
                </button>
              );
            })}
          </nav>

          <main className="min-h-[420px] flex-1 overflow-auto p-4 md:p-5">
            {activeTab === "details" ? (
              <form id="task-detail-form" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]" onSubmit={saveDetails}>
                <div className="grid gap-4">
                  <section className={sectionClass}>
                    <div className="grid gap-4">
                      <div>
                        <h3 className="text-sm font-bold uppercase text-slate-500">Basisdaten</h3>
                        <p className="mt-1 text-sm text-slate-600">Titel und Beschreibung der Aufgabe.</p>
                      </div>
                      <label className="grid gap-1 text-sm font-semibold text-ink">
                        Titel
                        <input
                          className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-fern focus:ring-2 focus:ring-fern/15"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          required
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-semibold text-ink">
                        Beschreibung
                        <textarea
                          className="min-h-32 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-fern focus:ring-2 focus:ring-fern/15"
                          value={description}
                          onChange={(event) => setDescription(event.target.value)}
                        />
                      </label>
                    </div>
                  </section>

                  <section className={sectionClass}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <h3 className="text-sm font-bold uppercase text-slate-500">Status</h3>
                        <div className="grid gap-2">
                          {statuses.map((item) => {
                            const selected = status === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                className={`flex h-10 items-center justify-between rounded-md border px-3 text-sm font-semibold transition ${
                                  selected ? "border-fern bg-fern/10 text-ink" : "border-line bg-shell/50 text-slate-600 hover:border-fern"
                                }`}
                                onClick={() => setStatus(item.value)}
                              >
                                <span>{item.label}</span>
                                {selected ? <Check size={16} className="text-fern" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <h3 className="text-sm font-bold uppercase text-slate-500">Priorität</h3>
                        <div className="grid gap-2">
                          {priorities.map((item) => {
                            const selected = priority === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                className={`flex h-10 items-center justify-between rounded-md border px-3 text-sm font-semibold transition ${
                                  selected ? "border-tangerine bg-tangerine/10 text-ink" : "border-line bg-shell/50 text-slate-600 hover:border-tangerine"
                                }`}
                                onClick={() => setPriority(item.value)}
                              >
                                <span>{item.label}</span>
                                {selected ? <Check size={16} className="text-tangerine" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={sectionClass}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-1 text-sm font-semibold text-ink">
                        Zuständig
                        <input
                          className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-fern focus:ring-2 focus:ring-fern/15"
                          value={assignee}
                          onChange={(event) => setAssignee(event.target.value)}
                        />
                      </label>
                      <DatePicker label="Fällig" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                    </div>
                  </section>

                  <section className={sectionClass}>
                    <TagPicker selected={selectedTags} onChange={setSelectedTags} />
                  </section>
                </div>

                <aside className="grid content-start gap-4">
                  <section className={sectionClass}>
                    <div className="grid gap-3">
                      <div>
                        <h3 className="text-sm font-bold uppercase text-slate-500">Aktivität</h3>
                        <p className="mt-1 text-sm text-slate-600">Letzte bekannte Änderungen.</p>
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
                  </section>
                  <section className={sectionClass}>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold uppercase text-slate-500">Subtasks</h3>
                        <span className="text-xs font-semibold text-slate-500">
                          {completedSubtasks}/{totalSubtasks}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-steel-100">
                        <div className="h-full rounded-full bg-fern transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </section>
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
              <CommentSection
                comments={task.comments}
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
                <div className="grid gap-4">
                  {docLinks.error ? <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{docLinks.error}</div> : null}
                  <section className={sectionClass}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-ink">Features</h3>
                        <p className="text-sm text-slate-600">{selectedFeatureIds.length} ausgewählt</p>
                      </div>
                      <Button variant="primary" icon={<Save size={16} />} onClick={() => void saveDocLinks()}>
                        Verknüpfungen speichern
                      </Button>
                    </div>
                    <FeaturePicker features={allFeatures.features} selectedIds={selectedFeatureIds} onChange={setSelectedFeatureIds} />
                  </section>
                  <section className={sectionClass}>
                    <div className="mb-4">
                      <h3 className="font-semibold text-ink">Use Cases</h3>
                      <p className="text-sm text-slate-600">{selectedUseCaseIds.length} ausgewählt</p>
                    </div>
                    <UseCasePicker useCases={docLinks.availableUseCases} selectedIds={selectedUseCaseIds} onChange={setSelectedUseCaseIds} />
                  </section>
                </div>
              )
            ) : null}

            {activeTab === "notes" ? (
              <section className={sectionClass}>
                <div className="mb-4 flex items-center gap-2">
                  <StickyNote size={18} className="text-fern" />
                  <h3 className="font-semibold text-ink">Notizen</h3>
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
              </section>
            ) : null}

            {activeTab === "attachments" ? (
              <section className={sectionClass}>
                <div className="mb-4 flex items-center gap-2">
                  <Paperclip size={18} className="text-fern" />
                  <h3 className="font-semibold text-ink">Dateien</h3>
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
              </section>
            ) : null}
          </main>

          <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white px-5 py-4">
            <Button type="submit" form="task-detail-form" variant="primary" icon={<Save size={16} />} disabled={activeTab !== "details"}>
              Speichern
            </Button>
          </footer>
        </div>
      ) : (
        <div className="bg-shell p-8 text-center text-sm text-slate-600">{detail.error ?? "Nicht gefunden"}</div>
      )}
    </Modal>
  );
}
