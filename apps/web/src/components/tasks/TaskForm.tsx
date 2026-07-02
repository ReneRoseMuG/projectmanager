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
  VisibleParentContext,
  MoveOwner,
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
import { unlinkOwnerTask as unlinkOwnerTaskRequest, type TaskOwner } from "../../api/tasks";
import { setTaskTags } from "../../api/tags";
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
import { ProjectContextTreeDialog, type MoveTarget } from "../ui/ProjectContextTreeDialog";
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
import { withStandaloneView } from "../../utils/standalone";

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
  onOpenTask?: (task: Task) => void;
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
  onOpenTask,
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
  const [movingSubtask, setMovingSubtask] = useState<Task | null>(null);
  const [pendingFiles, setPendingFiles] = useState<DraftFile[]>([]);
  const [subtaskDraftOpen, setSubtaskDraftOpen] = useState(false);
  const [subtaskInitialStatus, setSubtaskInitialStatus] = useState<TaskStatus | undefined>();
  const [ticketLinkOpen, setTicketLinkOpen] = useState(false);
  const [ticketDraftOpen, setTicketDraftOpen] = useState(false);
  const [subtaskViewMode, setSubtaskViewMode] = useState<ViewMode>("list");
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
      setSubtaskInitialStatus(undefined);
      setTicketLinkOpen(false);
      setTicketDraftOpen(false);
      setSubtaskViewMode("list");
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
    if (open && catalogs.entries.length > 0) {
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

  const canManageSubtasks = !task || task.parentId === null;
  const canShowOverview = Boolean(canManageSubtasks && task && ((detail.task?.subtasks.length ?? task.subtaskCount) > 0));
  const visibleTabs = task
    ? tabs.filter((tab) => (tab.value !== "overview" || canShowOverview) && (tab.value !== "subtasks" || canManageSubtasks) && (tab.value !== "journal" || canReadJournal))
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

  useEffect(() => {
    if (activeTab === "subtasks" && !canManageSubtasks) {
      setActiveTab("details");
    }
  }, [activeTab, canManageSubtasks]);

  const handleUnlinkParent = taskId !== null
    ? async (parent: VisibleParentContext) => {
        const type = parent.type;
        if (type === "task" || type === "ticket" || type === "dayPlan") return;
        try {
          await unlinkOwnerTaskRequest({ type, id: parent.id }, taskId);
          await detail.reload();
          await onChanged?.();
          showToast({ tone: "success", title: "Verknüpfung aufgehoben" });
        } catch (unlinkError) {
          showToast({ tone: "error", title: "Verknüpfung konnte nicht aufgehoben werden", message: errorMessage(unlinkError) });
        }
      }
    : undefined;

  const pendingTicketItems = pendingTickets.map(draftTicketItem);

  const removePendingTicket = (ticketId: number) => {
    setPendingTickets((items) =>
      items.filter((item, index) => draftTicketItem(item, index).id !== ticketId),
    );
  };

  const openSubtaskDraft = (initialSubtaskStatus?: TaskStatus) => {
    setSubtaskInitialStatus(initialSubtaskStatus);
    setSubtaskDraftOpen(true);
  };

  const openSubtask = (subtask: Task) => {
    if (onOpenTask) {
      onOpenTask(subtask);
      return;
    }
    window.open(withStandaloneView(`/tasks/${subtask.id}`), "_blank");
  };

  const createSubtaskFromDialog = async (subtask: DraftSubtask) => {
    if (!task) {
      setPendingSubtasks((items) => [...items, subtask]);
      return;
    }

    try {
      await detail.createSubtask(subtask);
      await detail.reload();
      await onChanged?.();
      showToast({ tone: "success", title: "Unteraufgabe erstellt" });
    } catch (taskError) {
      showToast({
        tone: "error",
        title: "Unteraufgabe konnte nicht erstellt werden",
        message: errorMessage(taskError),
      });
      throw taskError;
    }
  };

  const updateSubtaskTags = async (taskId: number, tagIds: number[]) => {
    try {
      await setTaskTags(taskId, tagIds);
      await detail.reload();
      await onChanged?.();
      showToast({ tone: "success", title: "Aufgabentags aktualisiert" });
    } catch (taskError) {
      showToast({
        tone: "error",
        title: "Aufgabentags konnten nicht geändert werden",
        message: errorMessage(taskError),
      });
      throw taskError;
    }
  };

  // Reload the active collection tab from the server (e.g. after an external MCP change).
  // Only for a persisted task; in create mode the lists are local drafts.
  const collectionReload: Partial<Record<TaskFormTab, () => Promise<void>>> = task
    ? {
        subtasks: detail.reload,
        tickets: tickets.reload,
        notes: notes.reload,
        comments: detail.reload,
        attachments: attachments.reload,
      }
    : {};
  const refreshActiveTab = collectionReload[activeTab];

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
        onRefresh={refreshActiveTab}
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
              {showParentContexts ? <ParentContextField parents={currentTask?.parentContexts} onUnlink={handleUnlinkParent} /> : null}
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

        {activeTab === "subtasks" && canManageSubtasks ? (
          task && loadedTask ? (
              <SubtaskList
                subtasks={loadedTask.subtasks}
                viewMode={subtaskViewMode}
                onViewModeChange={setSubtaskViewMode}
                onCreate={openSubtaskDraft}
                onOpen={openSubtask}
                onOpenInTab={(subtask) => window.open(withStandaloneView(`/tasks/${subtask.id}`), "_blank")}
                onMove={setMovingSubtask}
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
                onTagsChange={updateSubtaskTags}
              />
            ) : (
              <Section>
              <PendingRelationList
                existingItems={[]}
                draftItems={pendingSubtasks.map((subtask) => ({
                  title: subtask.title,
                  badge: "Wird erstellt",
                }))}
                emptyIcon={<ListTodo size={22} />}
                emptyTitle="Keine Subtasks vorgemerkt"
                showLinkExisting={false}
                onCreateNew={() => openSubtaskDraft()}
                onRemoveExisting={() => undefined}
                onRemoveDraft={(index) =>
                  setPendingSubtasks((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
              </Section>
            )
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
                  onMove={(note, target) => notes.moveNote(note.id, { source: { type: "task", id: task.id }, target })}
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
                  objectReference={editingNote ? objectReference("note", editingNote.id) : undefined}
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
      <ProjectContextTreeDialog
        open={Boolean(movingSubtask && task)}
        source={task ? { type: "task", id: task.id } : null}
        itemType="task"
        itemId={movingSubtask?.id ?? null}
        onSelect={async (target: MoveTarget) => {
          if (!movingSubtask || !task) return;
          if (target.type === "ticket") return;
          const taskTarget: MoveOwner<"project" | "milestone" | "task"> = { type: target.type, id: target.id };
          try {
            await detail.moveSubtask(movingSubtask.id, { source: { type: "task", id: task.id }, target: taskTarget, expectedVersion: movingSubtask.version });
            await detail.reload();
            await onChanged?.();
            showToast({ tone: "success", title: "Aufgabe verschoben" });
            setMovingSubtask(null);
          } catch (taskError) {
            showToast({ tone: "error", title: "Aufgabe konnte nicht verschoben werden", message: errorMessage(taskError) });
            throw taskError;
          }
        }}
        onClose={() => setMovingSubtask(null)}
      />
      <TaskDraftDialog
        open={subtaskDraftOpen}
        initialStatus={subtaskInitialStatus}
        onCreate={createSubtaskFromDialog}
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
  initialStatus,
  title: dialogTitle = "Subtask anlegen",
  breadcrumb = ["Aufgaben", "Subtask"],
}: {
  open: boolean;
  onCreate: (subtask: DraftSubtask) => void | Promise<void>;
  onClose: () => void;
  initialStatus?: TaskStatus;
  title?: string;
  breadcrumb?: string[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const catalogs = useCatalogs();
  const [status, setStatus] = useState<TaskStatus>("active");
  const [priority, setPriority] = useState<Priority>("medium");
  const trimmedTitle = title.trim();

  useEffect(() => {
    if (open) {
      setStatus(taskStatusValue(catalogs.entries, initialStatus ?? "active"));
      setPriority(priorityValue(catalogs.entries, "medium"));
    }
  }, [catalogs.entries, initialStatus, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    const nextStatus = taskStatusValue(catalogs.entries, status);
    const nextPriority = priorityValue(catalogs.entries, priority);
    try {
      await onCreate({
        title: trimmedTitle,
        description: description || null,
        status: nextStatus,
        priority: nextPriority,
      });
    } catch {
      return;
    }
    setTitle("");
    setDescription("");
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
      submitLabel="Anlegen"
      onSubmit={submit}
      onClose={onClose}
    >
      <Section title="Allgemein">
        <FormField label="Titel" required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            required
          />
        </FormField>
        <FormField label="Beschreibung" className="mt-4">
          <RichTextInlineField
            value={description}
            placeholder="Beschreibung"
            minRows={6}
            testIdPrefix="task-draft-description"
            onImageUpload={uploadContentImage}
            onChange={setDescription}
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
  title: dialogTitle = "Ticket anlegen",
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
      submitLabel="Anlegen"
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
