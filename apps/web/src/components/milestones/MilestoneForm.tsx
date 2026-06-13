import type {
  DraftComment,
  DraftNote,
  DraftTask,
  DraftTicket,
  Milestone,
  MilestoneInput,
  Note,
  Project,
  ProjectStatus,
  Tag,
} from "@taskmanager/shared-types";
import {
  Flag,
  FolderKanban,
  Link2,
  ListChecks,
  Trash2,
  Users,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { DraftFile, ViewMode } from "../../types";
import { uploadContentImage } from "../../api/content-images";
import { errorMessage } from "../../hooks/errors";
import { useAttachments } from "../../hooks/useAttachments";
import { useAuth } from "../../hooks/useAuth";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useNotes } from "../../hooks/useNotes";
import { useTasks } from "../../hooks/useTasks";
import { useTickets } from "../../hooks/useTickets";
import { objectReference } from "../../lib/references";
import {
  countOpenStatusItems,
  resolveCatalogEntryKey,
} from "../../utils/catalogs";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { MilestoneDashboard } from "../dashboard/DashboardView";
import { JournalPanel } from "../journal/JournalPanel";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { TagPicker } from "../tags/TagPicker";
import { OwnerTaskBoard } from "../tasks/OwnerTaskBoard";
import { DetailBoardShell } from "../ui/DetailBoardShell";
import { TaskDraftDialog, TicketDraftDialog } from "../tasks/TaskForm";
import { TaskLinkDialog } from "../tasks/TaskLinkDialog";
import { TaskListBoardView } from "../tasks/TaskListBoardView";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";
import { TicketLinkDialog } from "../tickets/TicketLinkDialog";
import { TicketListBoardView } from "../tickets/TicketListBoardView";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { DatePicker } from "../ui/DatePicker";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { SaveStatus } from "../ui/SaveStatus";
import { FormSidebar } from "../ui/FormSidebar";
import { Input } from "../ui/Input";
import { PendingCommentList } from "../ui/PendingCommentList";
import { PendingFileList } from "../ui/PendingFileList";
import { PendingNoteList } from "../ui/PendingNoteList";
import { CatalogSelect } from "../ui/CatalogSelect";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";
import { TaskListSkeleton } from "../ui/Skeleton";
import { TabBar, type Tab } from "../ui/TabBar";
import { useToast } from "../ui/ToastProvider";
import { UserSelectField } from "../users/UserSelectField";
import { useHasPermission } from "../../hooks/usePermissions";
import { draftTaskItem, draftTicketItem } from "../../utils/draftRelations";

interface MilestoneFormProps {
  open: boolean;
  milestone?: Milestone | null;
  projects: Project[];
  initialProjectId?: number;
  lockProjectSelection?: boolean;
  onSubmit: (
    input: MilestoneInput,
    tagIds: number[],
  ) => Promise<Milestone | void>;
  onAutoSave?: (input: MilestoneInput, tagIds: number[]) => Promise<void>;
  onClose: () => void;
  onDelete?: (milestone: Milestone) => Promise<boolean>;
  savingLabel?: string;
  initialTab?: MilestoneFormTab;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onOpenInTab?: () => void;
  onPostCreate?: (
    milestoneId: number,
    pending: {
      tasks: DraftTask[];
      tickets: DraftTicket[];
      comments: DraftComment[];
      notes: DraftNote[];
      files: DraftFile[];
    },
  ) => Promise<void>;
}
function workStatusValue(
  entries: Parameters<typeof resolveCatalogEntryKey>[0],
  value: string,
  preferredKey = "active",
) {
  return (
    resolveCatalogEntryKey(entries, "workStatus", value, preferredKey) ??
    preferredKey
  );
}

export type MilestoneFormTab =
  | "overview"
  | "details"
  | "tasks"
  | "tickets"
  | "comments"
  | "notes"
  | "attachments"
  | "journal";

const tabs: Array<Tab<MilestoneFormTab>> = [
  { value: "overview", label: "Übersicht" },
  { value: "details", label: "Details" },
  { value: "tasks", label: "Aufgaben" },
  { value: "tickets", label: "Tickets" },
  { value: "notes", label: "Notizen" },
  { value: "comments", label: "Kommentare" },
  { value: "attachments", label: "Dateien" },
  { value: "journal", label: "Journal" },
];

export function parseMilestoneFormTab(
  value: string | null | undefined,
): MilestoneFormTab | undefined {
  return tabs.some((tab) => tab.value === value)
    ? (value as MilestoneFormTab)
    : undefined;
}

export function MilestoneForm({
  open,
  milestone,
  projects,
  initialProjectId,
  lockProjectSelection = false,
  onSubmit,
  onAutoSave,
  onClose,
  onDelete,
  savingLabel,
  initialTab,
  variant = "modal",
  closeOnSubmit = true,
  onOpenInTab,
  onPostCreate,
}: MilestoneFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const auth = useAuth();
  const milestoneId = milestone?.id;
  const taskOwner = milestoneId
    ? { type: "milestone" as const, id: milestoneId }
    : undefined;
  const tasks = useTasks(taskOwner);
  const tickets = useTickets(
    milestoneId ? { type: "milestone", id: milestoneId } : null,
  );
  const catalogs = useCatalogs();
  const notes = useNotes(
    milestoneId ? { type: "milestone", id: milestoneId } : null,
  );
  const attachments = useAttachments(
    milestoneId ? { type: "milestone", id: milestoneId } : null,
  );
  const comments = useEntityComments("milestone", milestoneId);
  const canReadJournal = useHasPermission("journal", "read");
  const [activeTab, setActiveTab] = useState<MilestoneFormTab>("details");
  const [projectId, setProjectId] = useState<number | "">("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [color, setColor] = useState("var(--color-teal)");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<DraftTask[]>([]);
  const [pendingTickets, setPendingTickets] = useState<DraftTicket[]>([]);
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
  const [pendingNotes, setPendingNotes] = useState<DraftNote[]>([]);
  const [pendingFiles, setPendingFiles] = useState<DraftFile[]>([]);
  const [taskLinkOpen, setTaskLinkOpen] = useState(false);
  const [taskDraftOpen, setTaskDraftOpen] = useState(false);
  const [ticketLinkOpen, setTicketLinkOpen] = useState(false);
  const [ticketDraftOpen, setTicketDraftOpen] = useState(false);
  const [pendingTaskViewMode, setPendingTaskViewMode] = useState<ViewMode>("kanban");
  const [pendingTicketViewMode, setPendingTicketViewMode] = useState<ViewMode>("kanban");
  const prevOpenRef = useRef(false);

  const formStateRef = useRef({ name, description, status, color, startDate, dueDate, responsibleUserId, selectedTags, projectId });
  formStateRef.current = { name, description, status, color, startDate, dueDate, responsibleUserId, selectedTags, projectId };

  const autoSave = useAutoSave({
    enabled: !!milestone && !!onAutoSave,
    save: async () => {
      if (!onAutoSave) return;
      const s = formStateRef.current;
      if (!s.projectId) return;
      await onAutoSave(
        {
          projectId: s.projectId as number,
          name: s.name,
          description: s.description,
          status: resolveCatalogEntryKey(catalogs.entries, "workStatus", s.status, "active"),
          color: s.color,
          startDate: s.startDate || null,
          dueDate: s.dueDate || null,
          responsibleUserId: s.responsibleUserId,
        },
        s.selectedTags.map((t) => t.id),
      );
    },
  });
  const af = milestone ? autoSave.flush : undefined;

  const returnTo = `${location.pathname}${location.search}`;
  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.name,
  }));
  const handleTabChange = (nextTab: MilestoneFormTab) => {
    setActiveTab(nextTab);
    if (variant !== "page") {
      return;
    }
    const params = new URLSearchParams(location.search);
    params.set("tab", nextTab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  useEffect(() => {
    if (!open) {
      setTaskLinkOpen(false);
      setTaskDraftOpen(false);
      setTicketLinkOpen(false);
      setTicketDraftOpen(false);
      setPendingTaskViewMode("kanban");
      setPendingTicketViewMode("kanban");
      prevOpenRef.current = false;
      return;
    }

    if (!prevOpenRef.current) {
      setActiveTab(initialTab ?? "details");
      setTaskLinkOpen(false);
      setTaskDraftOpen(false);
      setTicketLinkOpen(false);
      setTicketDraftOpen(false);
      setPendingTasks([]);
      setPendingTickets([]);
      setPendingComments([]);
      setPendingNotes([]);
      setPendingFiles([]);
    }
    prevOpenRef.current = true;
  }, [initialTab, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const fallbackProjectId = initialProjectId ?? projects[0]?.id ?? "";
    setProjectId(milestone?.projectId ?? fallbackProjectId);
    setName(milestone?.name ?? "");
    setDescription(milestone?.description ?? "");
    setStatus(milestone?.status ?? "active");
    setColor(milestone?.color ?? "var(--color-teal)");
    setStartDate(milestone?.startDate ?? "");
    setDueDate(milestone?.dueDate ?? "");
    setResponsibleUserId(milestone ? milestone.responsibleUserId : (auth.user?.id ?? null));
    setSelectedTags(milestone?.tags ?? []);
  }, [auth.user?.id, initialProjectId, milestone, open, projects]);

  useEffect(() => {
    if (open) {
      setStatus((currentStatus) =>
        workStatusValue(catalogs.entries, currentStatus, "active"),
      );
    }
  }, [catalogs.entries, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (projectId === "") {
      showToast({ tone: "error", title: "Projektzuordnung fehlt" });
      return;
    }
    setSaving(true);
    try {
      const created = await onSubmit(
        {
          projectId,
          name,
          description,
          status: resolveCatalogEntryKey(
            catalogs.entries,
            "workStatus",
            status,
            "active",
          ),
          color,
          startDate: startDate || null,
          dueDate: dueDate || null,
          responsibleUserId,
        },
        selectedTags.map((tag) => tag.id),
      );
      if (!milestone && created && onPostCreate) {
        await onPostCreate(created.id, {
          tasks: pendingTasks,
          tickets: pendingTickets,
          comments: pendingComments,
          notes: pendingNotes,
          files: pendingFiles,
        });
      }
      if (closeOnSubmit) {
        onClose();
      }
    } catch {
      // Error feedback is handled by the page-level toast.
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrentMilestone = async () => {
    if (!milestone || !onDelete) {
      return;
    }
    setDeleting(true);
    try {
      const deleted = await onDelete(milestone);
      if (deleted) {
        onClose();
      }
    } finally {
      setDeleting(false);
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

  const visibleTabs = milestone
    ? tabs.filter((tab) => tab.value !== "journal" || canReadJournal)
    : tabs.filter((tab) => tab.value !== "overview" && tab.value !== "journal");
  const tabItems = visibleTabs.map((tab) => {
    if (tab.value === "details") {
      return tab;
    }
    if (tab.value === "tasks") {
      return {
        ...tab,
        count: milestone
          ? countOpenStatusItems(tasks.tasks, catalogs.entries, "workStatus")
          : countOpenStatusItems(pendingTasks.map((item) => (item.kind === "existing" ? item.task : item.draft)), catalogs.entries, "workStatus"),
      };
    }
    if (tab.value === "tickets") {
      return {
        ...tab,
        count: milestone
          ? countOpenStatusItems(
              tickets.tickets,
              catalogs.entries,
              "workStatus",
            )
          : countOpenStatusItems(pendingTickets.map((item) => (item.kind === "existing" ? item.ticket : item.draft)), catalogs.entries, "workStatus"),
      };
    }
    if (tab.value === "comments") {
      return { ...tab, count: milestone ? comments.comments.length : pendingComments.length };
    }
    if (tab.value === "notes") {
      return { ...tab, count: milestone ? notes.notes.length : pendingNotes.length };
    }
    if (tab.value === "attachments") {
      return { ...tab, count: milestone ? attachments.attachments.length : pendingFiles.length };
    }
    return { ...tab, count: 0 };
  });
  const pendingTaskItems = pendingTasks.map(draftTaskItem);
  const pendingTicketItems = pendingTickets.map(draftTicketItem);
  const selectedProjectContext = typeof projectId === "number" ? { type: "project" as const, id: projectId } : null;

  const removePendingTask = (taskId: number) => {
    setPendingTasks((items) =>
      items.filter((item, index) => draftTaskItem(item, index).id !== taskId),
    );
  };

  const removePendingTicket = (ticketId: number) => {
    setPendingTickets((items) =>
      items.filter((item, index) => draftTicketItem(item, index).id !== ticketId),
    );
  };

  return (
    <>
      <FormModal
        open={open}
        title={milestone ? "Meilenstein bearbeiten" : "Meilenstein anlegen"}
        entityTitle={milestone?.name}
        objectReference={milestone ? objectReference("milestone", milestone.id) : undefined}
        icon={<Flag size={20} />}
        breadcrumb={["Meilensteine"]}
        onSubmit={submit}
        saving={saving}
        submitLabel={saving ? (savingLabel ?? "Speichern...") : "Meilenstein anlegen"}
        onOpenInTab={onOpenInTab}
        hideFooter={!!milestone}
        onDelete={milestone && onDelete ? () => { void deleteCurrentMilestone(); } : undefined}
        saveStatus={milestone ? <SaveStatus status={autoSave.status} errorMessage={autoSave.errorMessage} /> : undefined}
        onClose={onClose}
        variant={variant}
        contentLayout={activeTab === "details" ? "flush" : "default"}
        contentClassName={
          activeTab === "overview" ? "w-full max-w-7xl self-center" : ""
        }
        tabBar={
          <TabBar tabs={tabItems} active={activeTab} onChange={handleTabChange} />
        }
      >
        {activeTab === "overview" && milestone ? (
          <MilestoneDashboard milestoneId={milestone.id} />
        ) : null}

        {activeTab === "details" ? (
          <div className="flex min-h-0 w-full flex-1">
            <div className="min-w-0 flex-1 overflow-auto p-2.5">
              <div className="flex min-h-full flex-col gap-4 w-full">
                <Section className="flex flex-1 flex-col">
                  <div className="flex flex-1 flex-col gap-4">
                    <FormField label="Name" required className="min-w-0">
                      <Input
                        value={name}
                        onChange={(inputEvent) => setName(inputEvent.target.value)}
                        onBlur={af}
                        required
                      />
                    </FormField>
                    <FormField label="Beschreibung" fill>
                      <RichTextInlineField
                        value={description}
                        onChange={(v) => { setDescription(v); formStateRef.current = { ...formStateRef.current, description: v }; af?.(); }}
                        placeholder="Wofür steht dieser Meilenstein?"
                        fill
                        minRows={12}
                        testIdPrefix="milestone-description"
                        onImageUpload={uploadContentImage}
                      />
                    </FormField>
                  </div>
                </Section>
              </div>
            </div>
            <FormSidebar storageKey="milestone-form-sidebar">
              <Select
                label="Projekt"
                icon={<FolderKanban size={14} />}
                variant="panel"
                required
                value={projectId}
                disabled={lockProjectSelection}
                onChange={(inputEvent) =>
                  setProjectId(
                    inputEvent.target.value
                      ? Number(inputEvent.target.value)
                      : "",
                  )
                }
              >
                <option value="">Projekt auswählen</option>
                {projectOptions.map((project) => (
                  <option key={project.value} value={project.value}>
                    {project.label}
                  </option>
                ))}
              </Select>
              <CatalogSelect label="Status" icon={<ListChecks size={14} />} variant="panel" kind="workStatus" value={status} onChange={(v) => { setStatus(v); formStateRef.current = { ...formStateRef.current, status: v }; af?.(); }} />
              <UserSelectField
                label="Verantwortlich"
                icon={<Users size={14} />}
                variant="panel"
                value={responsibleUserId}
                selectedUser={milestone?.responsibleUser ?? null}
                onChange={(v) => { setResponsibleUserId(v); formStateRef.current = { ...formStateRef.current, responsibleUserId: v }; af?.(); }}
              />
              <DatePicker label="Start" variant="panel" value={startDate} onChange={(inputEvent) => { const v = inputEvent.target.value; setStartDate(v); formStateRef.current = { ...formStateRef.current, startDate: v }; af?.(); }} />
              <DatePicker label="Fällig" variant="panel" value={dueDate} onChange={(inputEvent) => { const v = inputEvent.target.value; setDueDate(v); formStateRef.current = { ...formStateRef.current, dueDate: v }; af?.(); }} />
              <TagPicker selected={selectedTags} onChange={(v) => { setSelectedTags(v); formStateRef.current = { ...formStateRef.current, selectedTags: v }; af?.(); }} variant="panel" />
            </FormSidebar>
          </div>
        ) : null}

        {activeTab === "tasks" ? (
          <DetailBoardShell>
            {milestone ? (
              <OwnerTaskBoard owner={{ type: "milestone", id: milestone.id }} />
            ) : (
              <TaskListBoardView
                tasks={pendingTaskItems}
                loading={false}
                viewMode={pendingTaskViewMode}
                onViewModeChange={setPendingTaskViewMode}
                onAdd={() => setTaskDraftOpen(true)}
                onAddStatus={() => setTaskDraftOpen(true)}
                onOpen={() => undefined}
                onDelete={(task) => removePendingTask(task.id)}
                linkAction={
                  selectedProjectContext ? (
                    <Button
                      aria-label="Verknüpfen"
                      title="Verknüpfen"
                      variant="secondary"
                      icon={<Link2 size={17} />}
                      className="h-9 w-9 bg-transparent px-0"
                      onClick={() => setTaskLinkOpen(true)}
                    />
                  ) : undefined
                }
              />
            )}
          </DetailBoardShell>
        ) : null}

        {activeTab === "tickets" ? (
          <DetailBoardShell>
            {milestone ? (
              <OwnerTicketBoard
                owner={{ type: "milestone", id: milestone.id }}
              />
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
                  selectedProjectContext ? (
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
          </DetailBoardShell>
        ) : null}

        {activeTab === "comments" ? (
          <DetailBoardShell>
            {milestone ? (
              <CommentThread
                comments={comments.comments}
                entityLabel="Meilenstein"
                onCreate={comments.createComment}
                onUpdate={comments.updateComment}
                onDelete={comments.removeComment}
              />
            ) : (
              <PendingCommentList
                comments={pendingComments}
                onAdd={(comment) => setPendingComments((items) => [...items, comment])}
                onUpdate={(index, comment) => setPendingComments((items) => items.map((item, itemIndex) => (itemIndex === index ? comment : item)))}
                onRemove={(index) => setPendingComments((items) => items.filter((_, itemIndex) => itemIndex !== index))}
              />
            )}
          </DetailBoardShell>
        ) : null}

        {activeTab === "notes" ? (
          <DetailBoardShell>
            {milestone ? (
              <>
                <NoteList
                  notes={notes.notes}
                  owner={{ type: "milestone", id: milestone.id }}
                  onCreate={createNote}
                  onEdit={setEditingNote}
                  onDelete={(note) => void notes.removeNote(note.id)}
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
                onRemove={(index) => setPendingNotes((items) => items.filter((_, itemIndex) => itemIndex !== index))}
              />
            )}
          </DetailBoardShell>
        ) : null}

        {activeTab === "attachments" ? (
          <Section>
            {milestone ? (
              <div className="grid gap-4">
                <AttachmentUploader onUpload={uploadAttachment} />
                <AttachmentList
                  attachments={attachments.attachments}
                  onDelete={(attachment) =>
                    void attachments.removeAttachment(attachment.id)
                  }
                  onOpen={(attachment) => attachments.openAttachment(attachment.id)}
                  openingAttachmentId={attachments.openingAttachmentId}
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

        {activeTab === "journal" && milestone ? (
          <Section fill>
            <JournalPanel objectType="milestone" objectId={milestone.id} />
          </Section>
        ) : null}
      </FormModal>

      <TaskLinkDialog
        open={taskLinkOpen}
        owner={null}
        contextOwner={selectedProjectContext}
        currentTasks={pendingTasks.flatMap((item) => (item.kind === "existing" ? [item.task] : []))}
        onLink={async (task) => {
          setPendingTasks((items) => [...items, { kind: "existing", task }]);
          setTaskLinkOpen(false);
        }}
        onClose={() => setTaskLinkOpen(false)}
      />
      <TicketLinkDialog
        open={ticketLinkOpen}
        owner={null}
        contextOwner={selectedProjectContext}
        currentTickets={pendingTickets.flatMap((item) => (item.kind === "existing" ? [item.ticket] : []))}
        onLink={async (ticket) => {
          setPendingTickets((items) => [...items, { kind: "existing", ticket }]);
          setTicketLinkOpen(false);
        }}
        onClose={() => setTicketLinkOpen(false)}
      />
      <TaskDraftDialog
        open={taskDraftOpen}
        title="Aufgabe anlegen"
        breadcrumb={["Meilensteine", "Aufgabe"]}
        onCreate={(task) => setPendingTasks((items) => [...items, { kind: "new", draft: task }])}
        onClose={() => setTaskDraftOpen(false)}
      />
      <TicketDraftDialog
        open={ticketDraftOpen}
        title="Ticket anlegen"
        breadcrumb={["Meilensteine", "Ticket"]}
        onCreate={(ticket) => setPendingTickets((items) => [...items, { kind: "new", draft: ticket }])}
        onClose={() => setTicketDraftOpen(false)}
      />
    </>
  );
}

