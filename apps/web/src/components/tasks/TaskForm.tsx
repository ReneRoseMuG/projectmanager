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
import { ClipboardList, ListChecks, Paperclip, StickyNote } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { DraftFile } from "../../types";
import { assetUrl } from "../../api/client";
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
import { useNotes } from "../../hooks/useNotes";
import { useTaskDetail } from "../../hooks/useTaskDetail";
import { TagPicker } from "../tags/TagPicker";
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
import { PrioritySelect } from "../ui/PrioritySelect";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { SectionHeader } from "../ui/SectionHeader";
import { Select } from "../ui/Select";
import { TaskListSkeleton } from "../ui/Skeleton";
import { StatusPill } from "../ui/StatusPill";
import { StatusToggle } from "../ui/StatusToggle";
import { TabBar, type Tab } from "../ui/TabBar";
import { useToast } from "../ui/ToastProvider";
import { SubtaskList } from "./SubtaskList";
import { useHasPermission } from "../../hooks/usePermissions";

interface TaskFormProps {
  open: boolean;
  task?: Task | null;
  owner?: TaskOwner;
  initialStatus?: TaskStatus;
  onSubmit: (input: TaskFormInput) => Promise<Task | void>;
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
  { value: "comments", label: "Kommentare" },
  { value: "notes", label: "Notizen" },
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
  const ticketCandidateOwner: TicketOwner | null =
    ticketOwner ?? (owner && Number.isFinite(owner.id) ? owner : null);
  const tickets = useTickets(ticketOwner);
  const catalogs = useCatalogs();
  const notes = useNotes(taskId && open ? { type: "task", id: taskId } : null);
  const attachments = useAttachments(
    taskId && open ? { type: "task", id: taskId } : null,
  );
  const { showToast } = useToast();
  const canReadJournal = useHasPermission("journal", "read");
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<TaskFormTab>("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("active");
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
  }, [open, task]);

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
        assignee: null,
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
    try {
      const note = await notes.createNote({
        title: "Ohne Titel",
        contentJson: {},
      });
      if (note) {
        setEditingNote(note);
        showToast({ tone: "success", title: "Notiz erstellt" });
      }
    } catch (noteError) {
      showToast({
        tone: "error",
        title: "Notiz konnte nicht erstellt werden",
        message: errorMessage(noteError),
      });
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

  const uploadEditorImage = task
    ? async (file: File): Promise<string> => {
        const uploaded = await uploadAttachment(file);
        if (!uploaded) {
          throw new Error("Image upload requires a saved task.");
        }
        return assetUrl(uploaded.url);
      }
    : undefined;

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

  return (
    <>
      <FormModal
        open={open}
        title={task ? "Aufgabe bearbeiten" : "Aufgabe anlegen"}
        icon={<ClipboardList size={20} />}
        breadcrumb={["Aufgaben", task ? task.title : "Neu"]}
        submitLabel={
          saving
            ? (savingLabel ?? "Speichern…")
            : task
              ? "Speichern"
              : "Aufgabe anlegen"
        }
        saving={saving}
        onSubmit={submit}
        onClose={onClose}
        variant={variant}
        onOpenInTab={onOpenInTab}
        contentClassName={
          activeTab === "details" || activeTab === "overview" ? "w-full max-w-7xl self-center" : ""
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
          <>
            <Section title="Basisdaten">
              <div className="grid gap-4">
                <FormField label="Titel" required>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    autoFocus={!task}
                  />
                </FormField>
                <FormField label="Beschreibung">
                  <RichTextInlineField
                    value={description}
                    placeholder="Beschreibung"
                    minRows={12}
                    testIdPrefix="task-description"
                    onImageUpload={uploadEditorImage}
                    onChange={setDescription}
                  />
                </FormField>
              </div>
            </Section>

            <Section title="Status & Priorität">
              <div className="grid items-start gap-4 md:grid-cols-2">
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

            <Section title="Termin">
              <DatePicker
                label="Fällig"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
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
                emptyIcon={<ListChecks size={22} />}
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
          <Section title="Tickets" fill={Boolean(ticketOwner)}>
            {ticketOwner ? (
              <OwnerTicketBoard owner={ticketOwner} />
            ) : (
              <PendingRelationList
                existingItems={pendingTickets.flatMap((item) =>
                  item.kind === "existing"
                    ? [
                        {
                          id: item.ticket.id,
                          title: item.ticket.title,
                          statusLabel: catalogLabel(
                            catalogs.entries,
                            "workStatus",
                            item.ticket.status,
                          ),
                          statusColor: catalogColor(
                            catalogs.entries,
                            "workStatus",
                            item.ticket.status,
                          ),
                        },
                      ]
                    : [],
                )}
                draftItems={pendingTickets.flatMap((item) =>
                  item.kind === "new"
                    ? [{ title: item.draft.title, badge: "Wird erstellt" }]
                    : [],
                )}
                emptyIcon={<ClipboardList size={22} />}
                emptyTitle="Keine Tickets vorgemerkt"
                showLinkExisting={ticketCandidateOwner !== null}
                onLinkExisting={() => setTicketLinkOpen(true)}
                onCreateNew={() => setTicketDraftOpen(true)}
                onRemoveExisting={(index) =>
                  setPendingTickets((items) =>
                    removeDraftByKindIndex(items, "existing", index),
                  )
                }
                onRemoveDraft={(index) =>
                  setPendingTickets((items) =>
                    removeDraftByKindIndex(items, "new", index),
                  )
                }
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
                    showToast({
                      tone: "error",
                      title: "Kommentar konnte nicht erstellt werden",
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
                  note={editingNote}
                  open={Boolean(editingNote)}
                  onSave={notes.updateNote}
                  onClose={() => setEditingNote(null)}
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
          <Section title="Journal" fill>
            <JournalPanel objectType="task" objectId={task.id} />
          </Section>
        ) : null}
      </FormModal>

      <TicketLinkDialog
        open={ticketLinkOpen}
        owner={ticketCandidateOwner}
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
      <SubtaskDraftDialog
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

function SubtaskDraftDialog({
  open,
  onCreate,
  onClose,
}: {
  open: boolean;
  onCreate: (subtask: DraftSubtask) => void;
  onClose: () => void;
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
      title="Subtask vormerken"
      icon={<ListChecks size={20} />}
      breadcrumb={["Aufgaben", "Subtask"]}
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

function TicketDraftDialog({
  open,
  onCreate,
  onClose,
}: {
  open: boolean;
  onCreate: (ticket: Extract<DraftTicket, { kind: "new" }>["draft"]) => void;
  onClose: () => void;
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
      title="Ticket vormerken"
      icon={<ClipboardList size={20} />}
      breadcrumb={["Aufgaben", "Ticket"]}
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
