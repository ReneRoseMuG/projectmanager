import type { DraftComment, DraftNote, DraftSubtask, DraftTicket, Note, Priority, Tag, Task, TaskInput, TaskStatus, TicketStatus, TicketType } from "@taskmanager/shared-types";
import { ClipboardList, ListChecks, Paperclip, StickyNote } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { DraftFile } from "../../types";
import { toDateInput } from "../../utils/date";
import { priorityLabels, priorityPillTones, taskStatusLabels, taskStatusTones, ticketStatusLabels, ticketStatusTones, ticketTypeLabels } from "../../utils/domainLabels";
import { errorMessage } from "../../hooks/errors";
import { useAttachments } from "../../hooks/useAttachments";
import { useNotes } from "../../hooks/useNotes";
import { useTaskDetail } from "../../hooks/useTaskDetail";
import { TagPicker } from "../tags/TagPicker";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";
import { TicketLinkDialog } from "../tickets/TicketLinkDialog";
import { CommentThread } from "../ui/CommentThread";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { DatePicker } from "../ui/DatePicker";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { PendingCommentList } from "../ui/PendingCommentList";
import { PendingFileList } from "../ui/PendingFileList";
import { PendingNoteList } from "../ui/PendingNoteList";
import { PendingRelationList } from "../ui/PendingRelationList";
import { Pill } from "../ui/Pill";
import { RadioList } from "../ui/RadioList";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { SectionHeader } from "../ui/SectionHeader";
import { Select } from "../ui/Select";
import { TaskListSkeleton } from "../ui/Skeleton";
import { TabBar, type Tab } from "../ui/TabBar";
import { useToast } from "../ui/ToastProvider";
import { SubtaskList } from "./SubtaskList";

interface TaskModalProps {
  open: boolean;
  task?: Task | null;
  initialStatus?: TaskStatus;
  onSubmit: (input: TaskModalInput) => Promise<Task | void>;
  onClose: () => void;
  onChanged?: () => Promise<void>;
  savingLabel?: string;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
}

export interface TaskModalInput extends TaskInput {
  tagIds: number[];
  pendingSubtasks: DraftSubtask[];
  pendingTickets: DraftTicket[];
  pendingComments: DraftComment[];
  pendingNotes: DraftNote[];
  pendingFiles: DraftFile[];
}

type TaskModalTab = "details" | "subtasks" | "tickets" | "comments" | "notes" | "attachments";

const tabs: Array<Tab<TaskModalTab>> = [
  { value: "details", label: "Details" },
  { value: "subtasks", label: "Subtasks" },
  { value: "tickets", label: "Tickets" },
  { value: "comments", label: "Kommentare" },
  { value: "notes", label: "Notizen" },
  { value: "attachments", label: "Dateien" }
];

const statuses: Array<{ value: TaskStatus; label: string; activeColor: "fern" | "tangerine" | "crimson" | "violet" }> = [
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

export function TaskModal({ open, task, initialStatus = "todo", onSubmit, onClose, onChanged, savingLabel, variant = "modal", closeOnSubmit = true }: TaskModalProps) {
  const taskId = task?.id ?? null;
  const detail = useTaskDetail(open && taskId ? taskId : null);
  const ticketOwner = taskId && open ? { type: "task" as const, id: taskId } : null;
  const notes = useNotes(taskId && open ? { type: "task", id: taskId } : null);
  const attachments = useAttachments(taskId && open ? { type: "task", id: taskId } : null);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<TaskModalTab>("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingSubtasks, setPendingSubtasks] = useState<DraftSubtask[]>([]);
  const [pendingTickets, setPendingTickets] = useState<DraftTicket[]>([]);
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
  const [pendingNotes, setPendingNotes] = useState<DraftNote[]>([]);
  const [pendingFiles, setPendingFiles] = useState<DraftFile[]>([]);
  const [subtaskDraftOpen, setSubtaskDraftOpen] = useState(false);
  const [ticketLinkOpen, setTicketLinkOpen] = useState(false);
  const [ticketDraftOpen, setTicketDraftOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!open) {
      setPendingSubtasks([]);
      setPendingTickets([]);
      setPendingComments([]);
      setPendingNotes([]);
      setPendingFiles([]);
      setSubtaskDraftOpen(false);
      setTicketLinkOpen(false);
      setTicketDraftOpen(false);
      setEditingNote(null);
      return;
    }
    setActiveTab("details");
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const source = detail.task ?? task;
    setTitle(source?.title ?? "");
    setDescription(source?.description ?? "");
    setStatus(source?.status ?? initialStatus);
    setPriority(source?.priority ?? "medium");
    setDueDate(toDateInput(source?.dueDate));
    setSelectedTags(source?.tags ?? []);
  }, [detail.task, initialStatus, open, task]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        title,
        description,
        status,
        priority,
        assignee: null,
        dueDate: dueDate || null,
        tagIds: selectedTags.map((tag) => tag.id),
        pendingSubtasks,
        pendingTickets,
        pendingComments,
        pendingNotes,
        pendingFiles
      });
      if (closeOnSubmit) {
        onClose();
      }
    } catch {
      // Error feedback is handled by the caller.
    } finally {
      setSaving(false);
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

  const tabItems = tabs.map((tab) => {
    if (tab.value === "subtasks") {
      return { ...tab, count: task ? detail.task?.subtasks.length ?? 0 : pendingSubtasks.length };
    }
    if (tab.value === "tickets") {
      return { ...tab, count: task ? undefined : pendingTickets.length };
    }
    if (tab.value === "comments") {
      return { ...tab, count: task ? detail.task?.comments.length ?? 0 : pendingComments.length };
    }
    if (tab.value === "notes") {
      return { ...tab, count: task ? notes.notes.length : pendingNotes.length };
    }
    if (tab.value === "attachments") {
      return { ...tab, count: task ? attachments.attachments.length : pendingFiles.length };
    }
    return tab;
  });
  const loadedTask = detail.task;

  return (
    <>
      <FormModal
        open={open}
        title={task ? "Aufgabe bearbeiten" : "Aufgabe anlegen"}
        subtitle="Aufgabe, Relationen und Anhänge in einem Formular pflegen."
        icon={<ClipboardList size={20} />}
        breadcrumb={["Aufgaben", task ? task.title : "Neu"]}
        submitLabel={saving ? savingLabel ?? "Speichern…" : task ? "Speichern" : "Aufgabe anlegen"}
        saving={saving}
        onSubmit={submit}
        onClose={onClose}
        variant={variant}
        headerMeta={
          <div className="flex flex-wrap gap-2">
            <Pill tone={taskStatusTones[status]}>{taskStatusLabels[status]}</Pill>
            <Pill tone={priorityPillTones[priority]}>{priorityLabels[priority]}</Pill>
          </div>
        }
      >
        <TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />

        {task && detail.loading ? <TaskListSkeleton /> : null}
        {task && detail.error ? <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{detail.error}</div> : null}

        {activeTab === "details" ? (
          <>
            <Section title="Basisdaten">
              <div className="grid gap-4">
                <FormField label="Titel" required>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus={!task} />
                </FormField>
                <FormField label="Beschreibung">
                  <RichTextInlineField value={description} placeholder="Beschreibung" testIdPrefix="task-description" onChange={setDescription} />
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
          </>
        ) : null}

        {activeTab === "subtasks" ? (
          <Section title="Subtasks">
            {task && loadedTask ? (
              <SubtaskList
                subtasks={loadedTask.subtasks}
                onCreate={async (input) => {
                  try {
                    await detail.createSubtask(input);
                    await detail.reload();
                    await onChanged?.();
                    showToast({ tone: "success", title: "Aufgabe erstellt" });
                  } catch (taskError) {
                    showToast({ tone: "error", title: "Aufgabe konnte nicht erstellt werden", message: errorMessage(taskError) });
                    throw taskError;
                  }
                }}
                onUpdate={async (id, input) => {
                  try {
                    await detail.updateSubtask(id, input);
                    await detail.reload();
                    await onChanged?.();
                    showToast({ tone: "success", title: "Aufgabe aktualisiert" });
                  } catch (taskError) {
                    showToast({ tone: "error", title: "Aufgabe konnte nicht aktualisiert werden", message: errorMessage(taskError) });
                    throw taskError;
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await detail.removeSubtask(id);
                    await detail.reload();
                    await onChanged?.();
                    showToast({ tone: "success", title: "Aufgabe gelöscht" });
                  } catch (taskError) {
                    showToast({ tone: "error", title: "Aufgabe konnte nicht gelöscht werden", message: errorMessage(taskError) });
                    throw taskError;
                  }
                }}
              />
            ) : (
              <PendingRelationList
                existingItems={[]}
                draftItems={pendingSubtasks.map((subtask) => ({ title: subtask.title, badge: "Wird erstellt" }))}
                emptyIcon={<ListChecks size={22} />}
                emptyTitle="Keine Subtasks vorgemerkt"
                showLinkExisting={false}
                onCreateNew={() => setSubtaskDraftOpen(true)}
                onRemoveExisting={() => undefined}
                onRemoveDraft={(index) => setPendingSubtasks((items) => items.filter((_, itemIndex) => itemIndex !== index))}
              />
            )}
          </Section>
        ) : null}

        {activeTab === "tickets" ? (
          <Section title="Tickets">
            {ticketOwner ? (
              <OwnerTicketBoard owner={ticketOwner} />
            ) : (
              <PendingRelationList
                existingItems={pendingTickets.flatMap((item) =>
                  item.kind === "existing"
                    ? [{ id: item.ticket.id, title: item.ticket.title, statusLabel: ticketStatusLabels[item.ticket.status], statusTone: ticketStatusTones[item.ticket.status] }]
                    : []
                )}
                draftItems={pendingTickets.flatMap((item) => (item.kind === "new" ? [{ title: item.draft.title, badge: "Wird erstellt" }] : []))}
                emptyIcon={<ClipboardList size={22} />}
                emptyTitle="Keine Tickets vorgemerkt"
                onLinkExisting={() => setTicketLinkOpen(true)}
                onCreateNew={() => setTicketDraftOpen(true)}
                onRemoveExisting={(index) => setPendingTickets((items) => removeDraftByKindIndex(items, "existing", index))}
                onRemoveDraft={(index) => setPendingTickets((items) => removeDraftByKindIndex(items, "new", index))}
              />
            )}
          </Section>
        ) : null}

        {activeTab === "comments" ? (
          <Section title="Kommentare">
            {task && loadedTask ? (
              <CommentThread
                comments={loadedTask.comments}
                entityLabel="Aufgabe"
                onCreate={async (input) => {
                  try {
                    await detail.createComment(input);
                    await detail.reload();
                    showToast({ tone: "success", title: "Kommentar erstellt" });
                  } catch (commentError) {
                    showToast({ tone: "error", title: "Kommentar konnte nicht erstellt werden", message: errorMessage(commentError) });
                    throw commentError;
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await detail.removeComment(id);
                    await detail.reload();
                    showToast({ tone: "success", title: "Kommentar gelöscht" });
                  } catch (commentError) {
                    showToast({ tone: "error", title: "Kommentar konnte nicht gelöscht werden", message: errorMessage(commentError) });
                    throw commentError;
                  }
                }}
              />
            ) : (
              <PendingCommentList comments={pendingComments} onAdd={(comment) => setPendingComments((items) => [...items, comment])} onRemove={(index) => setPendingComments((items) => items.filter((_, itemIndex) => itemIndex !== index))} />
            )}
          </Section>
        ) : null}

        {activeTab === "notes" ? (
          <Section>
            <div className="mb-4 flex items-center gap-2">
              <StickyNote size={18} className="text-fern" />
              <SectionHeader title="Notizen" />
            </div>
            {task ? (
              <>
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
              </>
            ) : (
              <PendingNoteList notes={pendingNotes} onAdd={(note) => setPendingNotes((items) => [...items, note])} onRemove={(index) => setPendingNotes((items) => items.filter((_, itemIndex) => itemIndex !== index))} />
            )}
          </Section>
        ) : null}

        {activeTab === "attachments" ? (
          <Section>
            <div className="mb-4 flex items-center gap-2">
              <Paperclip size={18} className="text-fern" />
              <SectionHeader title="Dateien" />
            </div>
            {task ? (
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
            ) : (
              <PendingFileList
                files={pendingFiles}
                onAdd={(files) => setPendingFiles((items) => [...items, ...files])}
                onRemove={(index) =>
                  setPendingFiles((items) => {
                    const removed = items[index];
                    if (removed?.previewUrl) {
                      URL.revokeObjectURL(removed.previewUrl);
                    }
                    return items.filter((_, itemIndex) => itemIndex !== index);
                  })
                }
              />
            )}
          </Section>
        ) : null}
      </FormModal>

      <TicketLinkDialog
        open={ticketLinkOpen}
        currentTickets={pendingTickets.flatMap((item) => (item.kind === "existing" ? [item.ticket] : []))}
        onLink={async (ticket) => {
          setPendingTickets((items) => [...items, { kind: "existing", ticket }]);
          setTicketLinkOpen(false);
        }}
        onClose={() => setTicketLinkOpen(false)}
      />
      <SubtaskDraftDialog
        open={subtaskDraftOpen}
        onCreate={(subtask) => setPendingSubtasks((items) => [...items, subtask])}
        onClose={() => setSubtaskDraftOpen(false)}
      />
      <TicketDraftDialog
        open={ticketDraftOpen}
        onCreate={(ticket) => setPendingTickets((items) => [...items, { kind: "new", draft: ticket }])}
        onClose={() => setTicketDraftOpen(false)}
      />
    </>
  );
}

function removeDraftByKindIndex<TItem extends { kind: "new" | "existing" }>(items: TItem[], kind: TItem["kind"], removeIndex: number): TItem[] {
  let currentIndex = -1;
  return items.filter((item) => {
    if (item.kind !== kind) {
      return true;
    }
    currentIndex += 1;
    return currentIndex !== removeIndex;
  });
}

function SubtaskDraftDialog({ open, onCreate, onClose }: { open: boolean; onCreate: (subtask: DraftSubtask) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const trimmedTitle = title.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    onCreate({ title: trimmedTitle, status, priority });
    setTitle("");
    setStatus("todo");
    setPriority("medium");
    onClose();
  };

  return (
    <FormModal open={open} title="Subtask vormerken" icon={<ListChecks size={20} />} breadcrumb={["Aufgaben", "Subtask"]} submitLabel="Vormerken" onSubmit={submit} onClose={onClose}>
      <Section title="Subtask">
        <FormField label="Titel" required>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required />
        </FormField>
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
    </FormModal>
  );
}

function TicketDraftDialog({ open, onCreate, onClose }: { open: boolean; onCreate: (ticket: Extract<DraftTicket, { kind: "new" }>["draft"]) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TicketType>("bug");
  const [status, setStatus] = useState<TicketStatus>("open");
  const [priority, setPriority] = useState<Priority>("medium");
  const trimmedTitle = title.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    onCreate({ title: trimmedTitle, type, status, priority });
    setTitle("");
    setType("bug");
    setStatus("open");
    setPriority("medium");
    onClose();
  };

  return (
    <FormModal open={open} title="Ticket vormerken" icon={<ClipboardList size={20} />} breadcrumb={["Aufgaben", "Ticket"]} submitLabel="Vormerken" onSubmit={submit} onClose={onClose}>
      <Section title="Ticket">
        <FormField label="Titel" required>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required />
        </FormField>
        <div className="mt-4">
          <Select label="Typ" value={type} onChange={(event) => setType(event.target.value as TicketType)}>
            <option value="bug">{ticketTypeLabels.bug}</option>
            <option value="improvement">{ticketTypeLabels.improvement}</option>
            <option value="question">{ticketTypeLabels.question}</option>
            <option value="task">{ticketTypeLabels.task}</option>
          </Select>
        </div>
      </Section>
      <Section title="Status & Priorität">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status">
            <RadioList value={status} options={ticketStatusOptions} onChange={setStatus} />
          </FormField>
          <FormField label="Priorität">
            <RadioList value={priority} options={priorities} onChange={setPriority} />
          </FormField>
        </div>
      </Section>
    </FormModal>
  );
}

const ticketStatusOptions = [
  { value: "open" as const, label: ticketStatusLabels.open, activeColor: "crimson" as const },
  { value: "in_progress" as const, label: ticketStatusLabels.in_progress, activeColor: "tangerine" as const },
  { value: "in_review" as const, label: ticketStatusLabels.in_review, activeColor: "violet" as const },
  { value: "resolved" as const, label: ticketStatusLabels.resolved, activeColor: "fern" as const },
  { value: "closed" as const, label: ticketStatusLabels.closed, activeColor: "fern" as const }
];
