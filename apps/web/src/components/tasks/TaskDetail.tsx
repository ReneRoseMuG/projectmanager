import type { Note, Priority, Tag, TaskStatus } from "@taskmanager/shared-types";
import { CalendarDays, Paperclip, Save, StickyNote } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAttachments } from "../../hooks/useAttachments";
import { errorMessage } from "../../hooks/errors";
import { useNotes } from "../../hooks/useNotes";
import { useTaskDetail } from "../../hooks/useTaskDetail";
import { useTickets } from "../../hooks/useTickets";
import { formatHumanDate, toDateInput } from "../../utils/date";
import { priorityLabels, priorityPillTones, taskStatusLabels, taskStatusTones } from "../../utils/domainLabels";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { TagPicker } from "../tags/TagPicker";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { DatePicker } from "../ui/DatePicker";
import { DetailModal } from "../ui/DetailModal";
import { FormField } from "../ui/FormField";
import { Pill } from "../ui/Pill";
import { RadioList } from "../ui/RadioList";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";
import { SectionHeader } from "../ui/SectionHeader";
import { TaskListSkeleton } from "../ui/Skeleton";
import { useToast } from "../ui/ToastProvider";
import { SubtaskList } from "./SubtaskList";

interface TaskDetailProps {
  taskId: number | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

type DetailTab = "details" | "subtasks" | "tickets" | "comments" | "notes" | "attachments";

const tabs: Array<{ value: DetailTab; label: string }> = [
  { value: "details", label: "Details" },
  { value: "subtasks", label: "Tasks" },
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

export function TaskDetail({ taskId, open, onClose, onChanged }: TaskDetailProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const detail = useTaskDetail(open ? taskId : null);
  const ticketOwner = taskId !== null && open ? { type: "task" as const, id: taskId } : null;
  const tickets = useTickets(ticketOwner);
  const notes = useNotes(taskId && open ? { type: "task", id: taskId } : null);
  const attachments = useAttachments(taskId && open ? { type: "task", id: taskId } : null);
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab("details");
    }
  }, [open, taskId]);

  useEffect(() => {
    if (!detail.task) {
      return;
    }
    setTitle(detail.task.title);
    setDescription(detail.task.description ?? "");
    setStatus(detail.task.status);
    setPriority(detail.task.priority);
    setDueDate(toDateInput(detail.task.dueDate));
    setSelectedTags(detail.task.tags);
  }, [detail.task]);

  const saveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await detail.updateTask({ title, description, status, priority, assignee: null, dueDate: dueDate || null });
      await detail.updateTags(selectedTags);
      await onChanged();
      showToast({ tone: "success", title: "Aufgabe gespeichert" });
      onClose();
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

  if (!open) {
    return null;
  }

  const task = detail.task;
  const counts: Partial<Record<DetailTab, number>> = {
    subtasks: task?.subtasks.length ?? 0,
    tickets: tickets.tickets.length,
    comments: task?.comments.length ?? 0,
    notes: notes.notes.length,
    attachments: attachments.attachments.length
  };
  const tabItems = tabs.map((tab) => ({ ...tab, count: counts[tab.value] }));

  return (
    <DetailModal
      open={open}
      title={task?.title ?? "Aufgabe"}
      breadcrumb={task ? ["Aufgaben", task.title] : ["Aufgaben"]}
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
          <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-white/85">
            <CalendarDays size={13} />
            {task.dueDate ? formatHumanDate(task.dueDate) : "Kein Datum"}
          </span>
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
        <TaskListSkeleton />
      ) : task ? (
        <>
          {activeTab === "details" ? (
            <form id="task-detail-form" className="grid gap-4" onSubmit={saveDetails}>
              <Section>
                <div className="grid gap-4">
                  <SectionHeader title="Basisdaten" description="Titel und Beschreibung der Aufgabe." variant="label" />
                  <FormField label="Titel" required>
                    <input
                      className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                    />
                  </FormField>
                  <FormField label="Beschreibung">
                    <RichTextEditor content={description} placeholder="Beschreibung" toolbar="full" minHeight="10rem" onChange={setDescription} />
                  </FormField>
                </div>
              </Section>

              <Section>
                <div className="grid items-start gap-4 md:grid-cols-2">
                  <div className="grid content-start gap-2">
                    <SectionHeader title="Status" variant="label" />
                    <RadioList value={status} options={statuses} onChange={setStatus} />
                  </div>
                  <div className="grid content-start gap-2">
                    <SectionHeader title="Priorität" variant="label" />
                    <RadioList value={priority} options={priorities} onChange={setPriority} />
                  </div>
                </div>
              </Section>

              <Section>
                <div className="grid gap-4 md:grid-cols-2">
                  <DatePicker label="Fällig" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </div>
              </Section>

              <Section>
                <TagPicker selected={selectedTags} onChange={setSelectedTags} />
              </Section>
            </form>
          ) : null}

          {activeTab === "subtasks" ? (
            <SubtaskList
              subtasks={task.subtasks}
              onCreate={async (input) => {
                try {
                  await detail.createSubtask(input);
                  await onChanged();
                  showToast({ tone: "success", title: "Aufgabe erstellt" });
                } catch (taskError) {
                  showToast({ tone: "error", title: "Aufgabe konnte nicht erstellt werden", message: errorMessage(taskError) });
                  throw taskError;
                }
              }}
              onUpdate={async (id, input) => {
                try {
                  await detail.updateSubtask(id, input);
                  await onChanged();
                  showToast({ tone: "success", title: "Aufgabe aktualisiert" });
                } catch (taskError) {
                  showToast({ tone: "error", title: "Aufgabe konnte nicht aktualisiert werden", message: errorMessage(taskError) });
                  throw taskError;
                }
              }}
              onDelete={async (id) => {
                try {
                  await detail.removeSubtask(id);
                  await onChanged();
                  showToast({ tone: "success", title: "Aufgabe gelöscht" });
                } catch (taskError) {
                  showToast({ tone: "error", title: "Aufgabe konnte nicht gelöscht werden", message: errorMessage(taskError) });
                  throw taskError;
                }
              }}
            />
          ) : null}

          {activeTab === "tickets" && ticketOwner ? <OwnerTicketBoard owner={ticketOwner} /> : null}

          {activeTab === "comments" ? (
            <CommentThread
              comments={task.comments}
              entityLabel="Aufgabe"
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
                          .catch((attachmentError: unknown) =>
                            showToast({ tone: "error", title: "Datei konnte nicht gelöscht werden", message: errorMessage(attachmentError) })
                          );
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
