import type {
  DraftComment,
  DraftNote,
  DraftSubtask,
  DraftTicket,
  Note,
  Priority,
  Tag,
  Task,
  TaskInput,
  TaskStatus,
  TicketStatus,
  TicketType,
} from "@taskmanager/shared-types";
import { Bug, Flag, Link2, ListChecks, ListTodo, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DraftFile, ViewMode } from "../../types";
import { uploadContentImage } from "../../api/content-images";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useTickets } from "../../hooks/useTickets";
import {
  catalogColor,
  catalogEntriesByKind,
  catalogLabel,
  countOpenStatusItems,
  resolveCatalogEntryKey,
} from "../../utils/catalogs";
import { toDateInput } from "../../utils/date";
import { errorMessage } from "../../hooks/errors";
import { useAttachments } from "../../hooks/useAttachments";
import { useAuth } from "../../hooks/useAuth";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useNotes } from "../../hooks/useNotes";
import { useTaskDetail } from "../../hooks/useTaskDetail";
import { objectReference } from "../../lib/references";
import { TagPicker } from "../tags/TagPicker";
import { SaveStatus } from "../ui/SaveStatus";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { TaskDashboard } from "../dashboard/DashboardView";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { JournalPanel } from "../journal/JournalPanel";
import type { TaskOwner } from "../../api/tasks";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";
import type { TicketOwner } from "../../api/tickets";
import { TicketLinkDialog } from "../tickets/TicketLinkDialog";
import { TicketListBoardView } from "../tickets/TicketListBoardView";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { DatePicker } from "../ui/DatePicker";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { FormSidebar } from "../ui/FormSidebar";
import { Input } from "../ui/Input";
import { ParentContextField } from "../ui/ParentContextField";
import { PendingCommentList } from "../ui/PendingCommentList";
import { PendingFileList } from "../ui/PendingFileList";
import { PendingNoteList } from "../ui/PendingNoteList";
import { PendingRelationList } from "../ui/PendingRelationList";
import { Pill } from "../ui/Pill";
import { CatalogSelect } from "../ui/CatalogSelect";
import { PrioritySelect } from "../ui/PrioritySelect";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";
import { TaskListSkeleton } from "../ui/Skeleton";
import { StatusPill } from "../ui/StatusPill";
import { StatusToggle } from "../ui/StatusToggle";
import { TabBar, type Tab } from "../ui/TabBar";
import { useToast } from "../ui/ToastProvider";
import { UserSelectField } from "../users/UserSelectField";
import { SubtaskList } from "./SubtaskList";
import { useHasPermission } from "../../hooks/usePermissions";
import { draftTicketItem } from "../../utils/draftRelations";

interface TaskFormProps {
  open: boolean;
  task?: Task | null;
  owner?: TaskOwner;
  initialStatus?: TaskStatus;
  onSubmit: (input: TaskFormInput) => Promise<Task | void>;
  onAutoSave?: (input: TaskFormInput) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
  onChanged?: () => Promise<void>;
  savingLabel?: string;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onOpenInTab?: () => void;
}

export interface TaskFormInput extends TaskInput {
  tagIds: number[];
  pendingSubtasks: DraftSubtask[];
  pendingTickets: DraftTicket[];
  pendingComments: DraftComment[];
  pendingNotes: DraftNote[];
  pendingFiles: DraftFile[];
}

type TaskFormTab =
  | "overview"
  | "details"
  | "subtasks"
  | "tickets"
  | "comments"
  | "notes"
  | "attachments"
  | "journal";

const tabs: Array<Tab<TaskFormTab>> = [
  { value: "overview", label: "Übersicht" },
  { value: "details", label: "Details" },
  { value: "subtasks", label: "Subtasks" },
  { value: "tickets", label: "Tickets" },
  { value: "notes", label: "Notizen" },
  { value: "comments", label: "Kommentare" },
  { value: "attachments", label: "Dateien" },
  { value: "journal", label: "Journal" },
];

function taskStatusValue(
  entries: Parameters<typeof resolveCatalogEntryKey>[0],
  value: TaskStatus,
): TaskStatus {
  return (
    resolveCatalogEntryKey(entries, "workStatus", value, "active") ?? "active"
  );
}

function ticketStatusValue(
  entries: Parameters<typeof resolveCatalogEntryKey>[0],
  value: TicketStatus,
): TicketStatus {
  return resolveCatalogEntryKey(entries, "workStatus", value, "open") ?? "open";
}

function priorityValue(
  entries: Parameters<typeof resolveCatalogEntryKey>[0],
  value: Priority,
): Priority {
  return (
    resolveCatalogEntryKey(entries, "priority", value, "medium") ?? "medium"
  );
}

function ticketTypeValue(
  entries: Parameters<typeof resolveCatalogEntryKey>[0],
  value: TicketType,
): TicketType {
  return resolveCatalogEntryKey(entries, "ticketType", value, "bug") ?? "bug";
}

export function TaskForm({
  open,
  task,
  owner,
  initialStatus = "active",
  onSubmit,
  onAutoSave,
  onDelete,
  onClose,
  onChanged,
  savingLabel,
  variant = "modal",
  closeOnSubmit = true,
  onOpenInTab,
}: TaskFormProps) {
  const taskId = task?.id ?? null;
  const detail = useTaskDetail(open && taskId ? taskId : null);
  const ticketOwner =
    taskId && open ? { type: "task" as const, id: taskId } : null;
  const ticketContextOwner: TicketOwner | null =
    ticketOwner ?? (owner && Number.isFinite(owner.id) ? owner : null);
  const tickets = useTickets(ticketOwner);
  const catalogs = useCatalogs();
  const notes = useNotes(taskId && open ? { type: "task", id: taskId } : null);
  const attachments = useAttachments(
    taskId && open ? { type: "task", id: taskId } : null,
  );
  const auth = useAuth();
  const { showToast } = useToast();
  const canReadJournal = useHasPermission("journal", "read");
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<TaskFormTab>("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("active");
  const [priority, setPriority] = useState<Priority>("medium");
  const [responsibleUserId, setResponsibleUserId] = useState<number | null>(null);
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
  const [pendingTicketViewMode, setPendingTicketViewMode] = useState<ViewMode>("kanban");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const prevOpenRef = useRef(false);

  // Updated synchronously before each flush so doSave reads fresh values
  const formStateRef = useRef({ title, description, status, priority, responsibleUserId, dueDate, selectedTags });
  formStateRef.current = { title, description, status, priority, responsibleUserId, dueDate, selectedTags };

  const autoSave = useAutoSave({
    enabled: !!task && !!onAutoSave,
    save: async () => {
      if (!onAutoSave) return;
      const s = formStateRef.current;
      await onAutoSave({
        title: s.title,
        description: s.description,
        status: resolveCatalogEntryKey(catalogs.entries, "workStatus", s.status, "active"),
        priority: resolveCatalogEntryKey(catalogs.entries, "priority", s.priority, "medium"),
        responsibleUserId: s.responsibleUserId,
        dueDate: s.dueDate || null,
        tagIds: s.selectedTags.map((t) => t.id),
        pendingSubtasks: [],
        pendingTickets: [],
        pendingComments: [],
        pendingNotes: [],
        pendingFiles: [],
      });
    },
  });
  const af = task ? autoSave.flush : undefined;

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
      setPendingTicketViewMode("kanban");
      setEditingNote(null);
      prevOpenRef.current = false;
      return;
    }
    if (!prevOpenRef.current) {
      setActiveTab("details");
    }
    prevOpenRef.current = true;
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
    setResponsibleUserId(source ? source.responsibleUserId : (auth.user?.id ?? null));
    setDueDate(toDateInput(source?.dueDate));
    setSelectedTags(source?.tags ?? []);
  }, [auth.user?.id, detail.task, initialStatus, open, task]);

  useEffect(() => {
    if (open) {
      setStatus((currentStatus) =>
        taskStatusValue(catalogs.entries, currentStatus),
      );
      setPriority((currentPriority) =>
        priorityValue(catalogs.entries, currentPriority),
      );
    }
  }, [catalogs.entries, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        title,
        description,
        status: resolveCatalogEntryKey(
          catalogs.entries,
          "workStatus",
          status,
          "active",
        ),
        priority: resolveCatalogEntryKey(
          catalogs.entries,
          "priority",
          priority,
          "medium",
        ),
        responsibleUserId,
        dueDate: dueDate || null,
        tagIds: selectedTags.map((tag) => tag.id),
        pendingSubtasks,
        pendingTickets,
        pendingComments,
        pendingNotes,
        pendingFiles,
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
    setIsCreatingNote(true);
  };

  const handleCreateNote = async (title: string, contentJson: Note["contentJson"]) => {
    try {
      await notes.createNote({ title, contentJson });
      showToast({ tone: "success", title: "Notiz erstellt" });
    } catch (noteError) {
      showToast({
        tone: "error",
        title: "Notiz konnte nicht erstellt werden",
        message: errorMessage(noteError),
      });
      throw noteError;
    }
  };

  const uploadAttachment = async (file: File) => {
    try {
      const uploaded = await attachments.uploadAttachment(file);
      showToast({ tone: "success", title: "Datei hochgeladen" });
      return uploaded;
    } catch (attachmentError) {
      showToast({
        tone: "error",
        title: "Datei konnte nicht hochgeladen werden",
        message: errorMessage(attachmentError),
      });
      throw attachmentError;
    }
  };

  const canShowOverview = Boolean(task && ((detail.task?.subtasks.length ?? task.subtaskCount) > 0));
  const visibleTabs = task
    ? tabs.filter((tab) => (tab.value !== "overview" || canShowOverview) && (tab.value !== "journal" || canReadJournal))
    : tabs.filter((tab) => tab.value !== "overview" && tab.value !== "journal");
  const tabItems = visibleTabs.map((tab) => {
    if (tab.value === "details") {
      return tab;
    }
    if (tab.value === "subtasks") {
      return {
        ...tab,
        count: task
          ? countOpenStatusItems(
              detail.task?.subtasks ?? [],
              catalogs.entries,
              "workStatus",
            )
          : countOpenStatusItems(
              pendingSubtasks,
              catalogs.entries,
              "workStatus",
            ),
      };
    }
    if (tab.value === "tickets") {
      const pending = pendingTickets.map((item) =>
        item.kind === "existing" ? item.ticket : item.draft,
      );
      return {
        ...tab,
        count: task
          ? countOpenStatusItems(
              tickets.tickets,
              catalogs.entries,
              "workStatus",
            )
          : countOpenStatusItems(pending, catalogs.entries, "workStatus"),
      };
    }
    if (tab.value === "comments") {
      return {
        ...tab,
        count: task
          ? (detail.task?.comments.length ?? 0)
          : pendingComments.length,
      };
    }
    if (tab.value === "notes") {
      return { ...tab, count: task ? notes.notes.length : pendingNotes.length };
    }
    if (tab.value === "attachments") {
      return {
        ...tab,
        count: task ? attachments.attachments.length : pendingFiles.length,
      };
    }
    return { ...tab, count: 0 };
  });
  const loadedTask = detail.task;
  const currentTask = detail.task ?? task;
  const showParentContexts = !owner && (currentTask?.parentContexts?.length ?? 0) > 0;
  const pendingTicketItems = pendingTickets.map(draftTicketItem);

  const removePendingTicket = (ticketId: number) => {
    setPendingTickets((items) =>
      items.filter((item, index) => draftTicketItem(item, index).id !== ticketId),
    );
  };

  return (
    <>
      <FormModal
        open={open}
        title={task ? "Aufgabe bearbeiten" : "Aufgabe anlegen"}
        entityTitle={task?.title}
        objectReference={task ? objectReference("task", task.id) : undefined}
        icon={<ListTodo size={20} />}
        breadcrumb={["Aufgaben"]}
        submitLabel={saving ? (savingLabel ?? "Speichern…") : "Aufgabe anlegen"}
        saving={saving}
        hideFooter={!!task}
        onDelete={onDelete}
        saveStatus={task ? <SaveStatus status={autoSave.status} errorMessage={autoSave.errorMessage} /> : undefined}
        onSubmit={submit}
        onClose={onClose}
        variant={variant}
        onOpenInTab={onOpenInTab}
        contentLayout={activeTab === "details" ? "flush" : "default"}
        contentClassName={
          activeTab === "overview" ? "w-full max-w-7xl self-center" : ""
        }
        tabBar={
          <TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />
        }
        headerMeta={
          <div className="flex flex-wrap gap-2">
            <StatusPill kind="workStatus" value={status} />
            <Pill color={catalogColor(catalogs.entries, "priority", priority)}>
              {catalogLabel(catalogs.entries, "priority", priority)}
            </Pill>
          </div>
        }
      >
        {task && detail.loading ? <TaskListSkeleton /> : null}
        {task && detail.error ? (
          <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">
            {detail.error}
          </div>
        ) : null}

        {activeTab === "overview" && task && canShowOverview ? (
          <TaskDashboard taskId={task.id} />
        ) : null}

        {activeTab === "details" ? (
          <div className="flex min-h-0 w-full flex-1">
            <div className="min-w-0 flex-1 overflow-auto p-2.5">
              <div className="flex min-h-full flex-col gap-4 w-full">
                <Section className="flex flex-1 flex-col">
                  <div className="flex flex-1 flex-col gap-4">
                    <FormField label="Titel" required>
                      <Input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        onBlur={af}
                        required
                        autoFocus={!task}
                      />
                    </FormField>
                    <FormField label="Beschreibung" fill>
                      <RichTextInlineField
                        value={description}
                        placeholder="Beschreibung"
                        fill
                        minRows={12}
                        testIdPrefix="task-description"
                        onImageUpload={uploadContentImage}
                        onChange={(v) => {
                          setDescription(v);
                          formStateRef.current = { ...formStateRef.current, description: v };
                          af?.();
                        }}
                      />
                    </FormField>
                  </div>
                </Section>
              </div>
            </div>
            <FormSidebar storageKey="task-form-sidebar">
              {showParentContexts ? <ParentContextField parents={currentTask?.parentContexts} /> : null}
              <CatalogSelect label="Status" icon={<ListChecks size={14} />} variant="panel" kind="workStatus" value={status} onChange={(v) => { setStatus(v); formStateRef.current = { ...formStateRef.current, status: v }; af?.(); }} />
              <CatalogSelect label="Priorität" icon={<Flag size={14} />} variant="panel" kind="priority" value={priority} onChange={(v) => { setPriority(v); formStateRef.current = { ...formStateRef.current, priority: v }; af?.(); }} />
              <DatePicker label="Fällig" variant="panel" value={dueDate} onChange={(event) => { const v = event.target.value; setDueDate(v); formStateRef.current = { ...formStateRef.current, dueDate: v }; af?.(); }} />
              <UserSelectField
                label="Verantwortlich"
                icon={<Users size={14} />}
                variant="panel"
                value={responsibleUserId}
                selectedUser={currentTask?.responsibleUser ?? null}
                onChange={(v) => { setResponsibleUserId(v); formStateRef.current = { ...formStateRef.current, responsibleUserId: v }; af?.(); }}
              />
              <TagPicker selected={selectedTags} onChange={(v) => { setSelectedTags(v); formStateRef.current = { ...formStateRef.current, selectedTags: v }; af?.(); }} variant="panel" />
            </FormSidebar>
          </div>
        ) : null}

        {activeTab === "subtasks" ? (
          <Section>
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
                    showToast({
                      tone: "error",
                      title: "Aufgabe konnte nicht erstellt werden",
                      message: errorMessage(taskError),
                    });
                    throw taskError;
                  }
                }}
                onUpdate={async (id, input) => {
                  try {
                    await detail.updateSubtask(id, input);
                    await detail.reload();
                    await onChanged?.();
                    showToast({
                      tone: "success",
                      title: "Aufgabe aktualisiert",
                    });
                  } catch (taskError) {
                    showToast({
                      tone: "error",
                      title: "Aufgabe konnte nicht aktualisiert werden",
                      message: errorMessage(taskError),
                    });
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
                    showToast({
                      tone: "error",
                      title: "Aufgabe konnte nicht gelöscht werden",
                      message: errorMessage(taskError),
                    });
                    throw taskError;
                  }
                }}
              />
            ) : (
              <PendingRelationList
                existingItems={[]}
                draftItems={pendingSubtasks.map((subtask) => ({
                  title: subtask.title,
                  badge: "Wird erstellt",
                }))}
                emptyIcon={<ListTodo size={22} />}
                emptyTitle="Keine Subtasks vorgemerkt"
                showLinkExisting={false}
                onCreateNew={() => setSubtaskDraftOpen(true)}
                onRemoveExisting={() => undefined}
                onRemoveDraft={(index) =>
                  setPendingSubtasks((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
            )}
          </Section>
        ) : null}

        {activeTab === "tickets" ? (
          <Section fill={Boolean(ticketOwner)}>
            {ticketOwner ? (
              <OwnerTicketBoard owner={ticketOwner} />
            ) : (
              <TicketListBoardView
                tickets={pendingTicketItems}
                loading={false}
                viewMode={pendingTicketViewMode}
                onViewModeChange={setPendingTicketViewMode}
                onAdd={() => setTicketDraftOpen(true)}
                onAddStatus={() => setTicketDraftOpen(true)}
                onOpen={() => undefined}
                onDelete={(ticket) => removePendingTicket(ticket.id)}
                linkAction={
                  ticketContextOwner ? (
                    <Button
                      aria-label="Verknüpfen"
                      title="Verknüpfen"
                      variant="secondary"
                      icon={<Link2 size={17} />}
                      className="h-9 w-9 bg-transparent px-0"
                      onClick={() => setTicketLinkOpen(true)}
                    />
                  ) : undefined
                }
              />
            )}
          </Section>
        ) : null}

        {activeTab === "comments" ? (
          <Section>
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
                    showToast({
                      tone: "error",
                      title: "Kommentar konnte nicht erstellt werden",
                      message: errorMessage(commentError),
                    });
                    throw commentError;
                  }
                }}
                onUpdate={async (id, input) => {
                  try {
                    await detail.updateComment(id, input);
                    await detail.reload();
                    showToast({ tone: "success", title: "Kommentar gespeichert" });
                  } catch (commentError) {
                    showToast({
                      tone: "error",
                      title: "Kommentar konnte nicht gespeichert werden",
                      message: errorMessage(commentError),
                    });
                    throw commentError;
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await detail.removeComment(id);
                    await detail.reload();
                    showToast({ tone: "success", title: "Kommentar gelöscht" });
                  } catch (commentError) {
                    showToast({
                      tone: "error",
                      title: "Kommentar konnte nicht gelöscht werden",
                      message: errorMessage(commentError),
                    });
                    throw commentError;
                  }
                }}
              />
            ) : (
              <PendingCommentList
                comments={pendingComments}
                onAdd={(comment) =>
                  setPendingComments((items) => [...items, comment])
                }
                onUpdate={(index, comment) =>
                  setPendingComments((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? comment : item,
                    ),
                  )
                }
                onRemove={(index) =>
                  setPendingComments((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
            )}
          </Section>
        ) : null}

        {activeTab === "notes" ? (
          <Section fill={Boolean(task)}>
            {task ? (
              <>
                <NoteList
                  notes={notes.notes}
                  owner={{ type: "task", id: task.id }}
                  onCreate={createNote}
                  onEdit={setEditingNote}
                  onDelete={(note) => {
                    void confirm({
                      title: "Notiz löschen?",
                      body: `Die Notiz "${note.title}" wird entfernt.`,
                      severity: "danger",
                      confirmLabel: "Löschen",
                    }).then((approved) => {
                      if (approved) {
                        void notes
                          .removeNote(note.id)
                          .then(() =>
                            showToast({
                              tone: "success",
                              title: "Notiz gelöscht",
                            }),
                          )
                          .catch((noteError: unknown) =>
                            showToast({
                              tone: "error",
                              title: "Notiz konnte nicht gelöscht werden",
                              message: errorMessage(noteError),
                            }),
                          );
                      }
                    });
                  }}
                />
                <NoteEditor
                  note={isCreatingNote ? null : editingNote}
                  open={isCreatingNote || Boolean(editingNote)}
                  onSave={notes.updateNote}
                  onCreateNote={handleCreateNote}
                  onClose={() => { setEditingNote(null); setIsCreatingNote(false); }}
                />
              </>
            ) : (
              <PendingNoteList
                notes={pendingNotes}
                onAdd={(note) => setPendingNotes((items) => [...items, note])}
                onRemove={(index) =>
                  setPendingNotes((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
            )}
          </Section>
        ) : null}

        {activeTab === "attachments" ? (
          <Section>
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
                      confirmLabel: "Löschen",
                    }).then((approved) => {
                      if (approved) {
                        void attachments
                          .removeAttachment(attachment.id)
                          .then(() =>
                            showToast({
                              tone: "success",
                              title: "Datei gelöscht",
                            }),
                          )
                          .catch((attachmentError: unknown) =>
                            showToast({
                              tone: "error",
                              title: "Datei konnte nicht gelöscht werden",
                              message: errorMessage(attachmentError),
                            }),
                          );
                      }
                    });
                  }}
                  onOpen={(attachment) => attachments.openAttachment(attachment.id)}
                  openingAttachmentId={attachments.openingAttachmentId}
                />
              </div>
            ) : (
              <PendingFileList
                files={pendingFiles}
                onAdd={(files) =>
                  setPendingFiles((items) => [...items, ...files])
                }
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

        {activeTab === "journal" && task ? (
          <Section fill>
            <JournalPanel objectType="task" objectId={task.id} />
          </Section>
        ) : null}
      </FormModal>

      <TicketLinkDialog
        open={ticketLinkOpen}
        owner={ticketOwner}
        contextOwner={ticketOwner ? undefined : ticketContextOwner}
        currentTickets={pendingTickets.flatMap((item) =>
          item.kind === "existing" ? [item.ticket] : [],
        )}
        onLink={async (ticket) => {
          setPendingTickets((items) => [
            ...items,
            { kind: "existing", ticket },
          ]);
          setTicketLinkOpen(false);
        }}
        onClose={() => setTicketLinkOpen(false)}
      />
      <TaskDraftDialog
        open={subtaskDraftOpen}
        onCreate={(subtask) =>
          setPendingSubtasks((items) => [...items, subtask])
        }
        onClose={() => setSubtaskDraftOpen(false)}
      />
      <TicketDraftDialog
        open={ticketDraftOpen}
        onCreate={(ticket) =>
          setPendingTickets((items) => [
            ...items,
            { kind: "new", draft: ticket },
          ])
        }
        onClose={() => setTicketDraftOpen(false)}
      />
    </>
  );
}

function removeDraftByKindIndex<TItem extends { kind: "new" | "existing" }>(
  items: TItem[],
  kind: TItem["kind"],
  removeIndex: number,
): TItem[] {
  let currentIndex = -1;
  return items.filter((item) => {
    if (item.kind !== kind) {
      return true;
    }
    currentIndex += 1;
    return currentIndex !== removeIndex;
  });
}

export function TaskDraftDialog({
  open,
  onCreate,
  onClose,
  title: dialogTitle = "Subtask vormerken",
  breadcrumb = ["Aufgaben", "Subtask"],
}: {
  open: boolean;
  onCreate: (subtask: DraftSubtask) => void;
  onClose: () => void;
  title?: string;
  breadcrumb?: string[];
}) {
  const [title, setTitle] = useState("");
  const catalogs = useCatalogs();
  const [status, setStatus] = useState<TaskStatus>("active");
  const [priority, setPriority] = useState<Priority>("medium");
  const trimmedTitle = title.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    const nextStatus = taskStatusValue(catalogs.entries, status);
    const nextPriority = priorityValue(catalogs.entries, priority);
    onCreate({
      title: trimmedTitle,
      status: nextStatus,
      priority: nextPriority,
    });
    setTitle("");
    setStatus(taskStatusValue(catalogs.entries, "active"));
    setPriority(priorityValue(catalogs.entries, "medium"));
    onClose();
  };

  return (
    <FormModal
      open={open}
      title={dialogTitle}
      icon={<ListTodo size={20} />}
      breadcrumb={breadcrumb}
      submitLabel="Vormerken"
      onSubmit={submit}
      onClose={onClose}
    >
      <Section title="Subtask">
        <FormField label="Titel" required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            required
          />
        </FormField>
      </Section>
      <Section title="Status & Priorität">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status">
            <StatusToggle
              kind="workStatus"
              value={status}
              onChange={setStatus}
            />
          </FormField>
          <FormField label="Priorität">
            <PrioritySelect value={priority} onChange={setPriority} />
          </FormField>
        </div>
      </Section>
    </FormModal>
  );
}

export function TicketDraftDialog({
  open,
  onCreate,
  onClose,
  title: dialogTitle = "Ticket vormerken",
  breadcrumb = ["Aufgaben", "Ticket"],
}: {
  open: boolean;
  onCreate: (ticket: Extract<DraftTicket, { kind: "new" }>["draft"]) => void;
  onClose: () => void;
  title?: string;
  breadcrumb?: string[];
}) {
  const [title, setTitle] = useState("");
  const catalogs = useCatalogs();
  const [type, setType] = useState<TicketType>("bug");
  const [status, setStatus] = useState<TicketStatus>("open");
  const [priority, setPriority] = useState<Priority>("medium");
  const trimmedTitle = title.trim();
  const ticketTypeOptions = useMemo(() => catalogEntriesByKind(catalogs.entries, "ticketType"), [catalogs.entries]);

  useEffect(() => {
    if (open) {
      setType((currentType) => ticketTypeValue(catalogs.entries, currentType));
    }
  }, [catalogs.entries, open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    const nextStatus = resolveCatalogEntryKey(
      catalogs.entries,
      "workStatus",
      status,
      "open",
    );
    const nextPriority = resolveCatalogEntryKey(
      catalogs.entries,
      "priority",
      priority,
      "medium",
    );
    onCreate({
      title: trimmedTitle,
      type: ticketTypeValue(catalogs.entries, type),
      status: nextStatus,
      priority: nextPriority,
    });
    setTitle("");
    setType(ticketTypeValue(catalogs.entries, "bug"));
    setStatus(ticketStatusValue(catalogs.entries, "open"));
    setPriority(priorityValue(catalogs.entries, "medium"));
    onClose();
  };

  return (
    <FormModal
      open={open}
      title={dialogTitle}
      icon={<Bug size={20} />}
      breadcrumb={breadcrumb}
      submitLabel="Vormerken"
      onSubmit={submit}
      onClose={onClose}
    >
      <Section title="Ticket">
        <FormField label="Titel" required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            required
          />
        </FormField>
        <div className="mt-4">
          <Select
            label="Typ"
            value={type}
            onChange={(event) => setType(event.target.value as TicketType)}
          >
            {ticketTypeOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Section>
      <Section title="Status & Priorität">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status">
            <StatusToggle
              kind="workStatus"
              value={status}
              onChange={setStatus}
            />
          </FormField>
          <FormField label="Priorität">
            <PrioritySelect value={priority} onChange={setPriority} />
          </FormField>
        </div>
      </Section>
    </FormModal>
  );
}
