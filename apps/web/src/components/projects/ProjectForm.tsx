import type {
  BacklogItem,
  DraftComment,
  DraftNote,
  DraftTask,
  DraftTicket,
  Feature,
  Milestone,
  Note,
  Priority,
  Project,
  ProjectInput,
  ProjectStatus,
  Tag,
  TaskStatus,
  TicketStatus
} from "@taskmanager/shared-types";
import { Flag, FolderKanban, Inbox, ListTodo, Paperclip, StickyNote, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { DraftFile, ViewMode } from "../../types";
import { errorMessage } from "../../hooks/errors";
import { useAttachments } from "../../hooks/useAttachments";
import { useBacklog } from "../../hooks/useBacklog";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useFeatures } from "../../hooks/useFeatures";
import { useMilestones } from "../../hooks/useMilestones";
import { useNotes } from "../../hooks/useNotes";
import { useProjectFeatureLinks } from "../../hooks/useDocLinks";
import { useTickets } from "../../hooks/useTickets";
import { useWikiImport } from "../../hooks/useWikiImport";
import { formatHumanDate } from "../../utils/date";
import { priorityLabels, projectStatusLabels, taskStatusLabels, taskStatusTones, ticketStatusLabels, ticketStatusTones } from "../../utils/domainLabels";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { BacklogListBoardView } from "../backlog/BacklogListBoardView";
import { ProjectFeaturePanel } from "../features/ProjectFeaturePanel";
import { WikiImportPanel } from "../imports/WikiImportPanel";
import { MilestoneListBoardView } from "../milestones/MilestoneListBoardView";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { TagPicker } from "../tags/TagPicker";
import { TaskLinkDialog } from "../tasks/TaskLinkDialog";
import { OwnerTaskBoard } from "../tasks/OwnerTaskBoard";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";
import { TicketLinkDialog } from "../tickets/TicketLinkDialog";
import { Button } from "../ui/Button";
import { ColorPicker } from "../ui/ColorPicker";
import { CommentThread } from "../ui/CommentThread";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { DatePicker } from "../ui/DatePicker";
import { EmptyState } from "../ui/EmptyState";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { PendingCommentList } from "../ui/PendingCommentList";
import { PendingFileList } from "../ui/PendingFileList";
import { PendingNoteList } from "../ui/PendingNoteList";
import { PendingRelationList } from "../ui/PendingRelationList";
import { RadioList } from "../ui/RadioList";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";
import { SectionHeader } from "../ui/SectionHeader";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Select } from "../ui/Select";
import { TaskListSkeleton } from "../ui/Skeleton";
import { TabBar, type Tab } from "../ui/TabBar";
import { useToast } from "../ui/ToastProvider";

interface ProjectFormProps {
  open: boolean;
  project?: Project | null;
  onSubmit: (input: ProjectInput, tagIds: number[]) => Promise<Project | void>;
  onClose: () => void;
  onDelete?: (project: Project) => Promise<boolean>;
  savingLabel?: string;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onPostCreate?: (
    projectId: number,
    pending: {
      tasks: DraftTask[];
      tickets: DraftTicket[];
      featureIds: number[];
      comments: DraftComment[];
      notes: DraftNote[];
      files: DraftFile[];
    }
  ) => Promise<void>;
}

type ProjectFormTab = "details" | "milestones" | "features" | "tasks" | "tickets" | "comments" | "notes" | "attachments" | "backlog" | "import";

const baseTabs: Array<Tab<ProjectFormTab>> = [
  { value: "details", label: "Details" },
  { value: "milestones", label: "Meilensteine" },
  { value: "features", label: "Features" },
  { value: "tasks", label: "Aufgaben" },
  { value: "tickets", label: "Tickets" },
  { value: "comments", label: "Kommentare" },
  { value: "notes", label: "Notizen" },
  { value: "attachments", label: "Dateien" },
  { value: "backlog", label: "Backlog" },
  { value: "import", label: "Import" }
];

const statusOptions: Array<{ value: ProjectStatus; label: string; activeClassName: string }> = [
  { value: "active", label: projectStatusLabels.active, activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" },
  { value: "on_hold", label: projectStatusLabels.on_hold, activeClassName: "data-[active=true]:bg-tangerine data-[active=true]:text-white" },
  { value: "completed", label: projectStatusLabels.completed, activeClassName: "data-[active=true]:bg-violet data-[active=true]:text-white" },
  { value: "archived", label: projectStatusLabels.archived, activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" }
];

const taskStatuses = [
  { value: "todo" as const, label: taskStatusLabels.todo, activeColor: "crimson" as const },
  { value: "in_progress" as const, label: taskStatusLabels.in_progress, activeColor: "tangerine" as const },
  { value: "done" as const, label: taskStatusLabels.done, activeColor: "fern" as const }
];

const ticketStatuses = [
  { value: "open" as const, label: ticketStatusLabels.open, activeColor: "crimson" as const },
  { value: "in_progress" as const, label: ticketStatusLabels.in_progress, activeColor: "tangerine" as const },
  { value: "in_review" as const, label: ticketStatusLabels.in_review, activeColor: "violet" as const },
  { value: "resolved" as const, label: ticketStatusLabels.resolved, activeColor: "fern" as const },
  { value: "closed" as const, label: ticketStatusLabels.closed, activeColor: "fern" as const }
];

const priorities = [
  { value: "low" as const, label: priorityLabels.low, activeColor: "fern" as const },
  { value: "medium" as const, label: priorityLabels.medium, activeColor: "violet" as const },
  { value: "high" as const, label: priorityLabels.high, activeColor: "tangerine" as const },
  { value: "urgent" as const, label: priorityLabels.urgent, activeColor: "crimson" as const }
];

const swatches = [
  "var(--color-steel-700)",
  "var(--color-crimson)",
  "var(--color-tangerine)",
  "var(--color-mustard)",
  "var(--color-fern)",
  "var(--color-teal)",
  "var(--color-violet)",
  "var(--color-magenta)",
  "var(--color-ink)"
];

function projectCode(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 5)
    .toUpperCase();
}

export function ProjectForm({ open, project, onSubmit, onClose, onDelete, savingLabel, variant = "modal", closeOnSubmit = true, onPostCreate }: ProjectFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = project?.id;
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const allFeatures = useFeatures();
  const milestones = useMilestones(null, projectId);
  const featureLinks = useProjectFeatureLinks(projectId);
  const tickets = useTickets(projectId ? { type: "project", id: projectId } : null);
  const backlog = useBacklog(projectId);
  const notes = useNotes(projectId ? { type: "project", id: projectId } : null);
  const attachments = useAttachments(projectId ? { type: "project", id: projectId } : null);
  const comments = useEntityComments("project", projectId);
  const wikiImport = useWikiImport(projectId);
  const [activeTab, setActiveTab] = useState<ProjectFormTab>("details");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [color, setColor] = useState("var(--color-steel-700)");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [featureViewMode, setFeatureViewMode] = useState<ViewMode>("kanban");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [wikiImportSourcePath, setWikiImportSourcePath] = useState("");
  const [pendingFeatures, setPendingFeatures] = useState<Feature[]>([]);
  const [pendingTasks, setPendingTasks] = useState<DraftTask[]>([]);
  const [pendingTickets, setPendingTickets] = useState<DraftTicket[]>([]);
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
  const [pendingNotes, setPendingNotes] = useState<DraftNote[]>([]);
  const [pendingFiles, setPendingFiles] = useState<DraftFile[]>([]);
  const [featureLinkOpen, setFeatureLinkOpen] = useState(false);
  const [taskLinkOpen, setTaskLinkOpen] = useState(false);
  const [taskDraftOpen, setTaskDraftOpen] = useState(false);
  const [ticketLinkOpen, setTicketLinkOpen] = useState(false);
  const [ticketDraftOpen, setTicketDraftOpen] = useState(false);
  const code = useMemo(() => projectCode(name), [name]);

  useEffect(() => {
    if (!open) {
      setPendingFeatures([]);
      setPendingTasks([]);
      setPendingTickets([]);
      setPendingComments([]);
      setPendingNotes([]);
      setPendingFiles([]);
      setFeatureLinkOpen(false);
      setTaskLinkOpen(false);
      setTaskDraftOpen(false);
      setTicketLinkOpen(false);
      setTicketDraftOpen(false);
      return;
    }

    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setStatus(project?.status ?? "active");
    setColor(project?.color ?? "var(--color-steel-700)");
    setSelectedTags(project?.tags ?? []);
    setStartDate(project?.startDate ?? "");
    setDueDate(project?.dueDate ?? "");
    setActiveTab("details");
  }, [open, project]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await onSubmit(
        {
          name,
          description,
          status,
          color,
          startDate: startDate || null,
          dueDate: dueDate || null
        },
        selectedTags.map((tag) => tag.id)
      );
      if (!project && created && onPostCreate) {
        await onPostCreate(created.id, {
          tasks: pendingTasks,
          tickets: pendingTickets,
          featureIds: pendingFeatures.map((feature) => feature.id),
          comments: pendingComments,
          notes: pendingNotes,
          files: pendingFiles
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

  const deleteCurrentProject = async () => {
    if (!project || !onDelete) {
      return;
    }
    setDeleting(true);
    try {
      const deleted = await onDelete(project);
      if (deleted) {
        onClose();
      }
    } finally {
      setDeleting(false);
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

  const deleteBacklogItem = async (item: BacklogItem) => {
    const approved = await confirm({
      title: "Backlog-Item löschen?",
      body: `Das Backlog-Item "${item.title}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await backlog.removeItem(item.id);
      showToast({ tone: "success", title: "Backlog-Item gelöscht" });
    } catch (backlogError) {
      showToast({ tone: "error", title: "Backlog-Item konnte nicht gelöscht werden", message: errorMessage(backlogError) });
    }
  };

  const deleteMilestone = async (milestone: Milestone) => {
    const approved = await confirm({
      title: "Meilenstein löschen?",
      body: `Der Meilenstein "${milestone.name}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await milestones.removeMilestone(milestone.id);
      showToast({ tone: "success", title: "Meilenstein gelöscht" });
    } catch (milestoneError) {
      showToast({ tone: "error", title: "Meilenstein konnte nicht gelöscht werden", message: errorMessage(milestoneError) });
    }
  };

  const previewWikiImport = async () => {
    try {
      const report = await wikiImport.previewImport(wikiImportSourcePath);
      if (report) {
        showToast({ tone: "success", title: "Import-Vorschau erstellt" });
      }
    } catch (importError) {
      showToast({ tone: "error", title: "Import-Vorschau fehlgeschlagen", message: errorMessage(importError) });
    }
  };

  const runWikiImport = async () => {
    try {
      const report = await wikiImport.runImport(wikiImportSourcePath);
      if (report) {
        await allFeatures.reload();
        await featureLinks.reload();
        showToast({ tone: "success", title: "Wiki importiert" });
      }
    } catch (importError) {
      showToast({ tone: "error", title: "Wiki-Import fehlgeschlagen", message: errorMessage(importError) });
    }
  };

  const visibleTabs = project ? baseTabs : baseTabs.filter((tab) => tab.value !== "import");
  const tabItems = visibleTabs.map((tab) => {
    if (tab.value === "milestones") {
      return { ...tab, count: project ? milestones.milestones.length : undefined };
    }
    if (tab.value === "features") {
      return { ...tab, count: project ? featureLinks.features.length : pendingFeatures.length };
    }
    if (tab.value === "tickets") {
      return { ...tab, count: project ? tickets.tickets.length : pendingTickets.length };
    }
    if (tab.value === "comments") {
      return { ...tab, count: project ? comments.comments.length : pendingComments.length };
    }
    if (tab.value === "notes") {
      return { ...tab, count: project ? notes.notes.length : pendingNotes.length };
    }
    if (tab.value === "attachments") {
      return { ...tab, count: project ? attachments.attachments.length : pendingFiles.length };
    }
    if (tab.value === "backlog") {
      return { ...tab, count: project ? backlog.items.length : undefined };
    }
    return tab;
  });

  return (
    <>
      <FormModal
        open={open}
        title={project ? "Projekt bearbeiten" : "Projekt anlegen"}
        subtitle={project ? `Zuletzt aktualisiert am ${formatHumanDate(project.updatedAt)}` : "Stammdaten, Status und Beziehungen festlegen."}
        icon={<FolderKanban size={21} />}
        breadcrumb={["Projekte", project ? project.name : "Neues Projekt"]}
        onSubmit={submit}
        saving={saving}
        submitLabel={saving ? savingLabel ?? "Speichern…" : project ? "Speichern" : "Projekt anlegen"}
        footerStart={
          project && onDelete ? (
            <Button className="text-crimson hover:bg-crimson/10" icon={<Trash2 size={18} />} variant="ghost" disabled={deleting} onClick={() => void deleteCurrentProject()}>
              Löschen
            </Button>
          ) : undefined
        }
        onClose={onClose}
        variant={variant}
      >
        <TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />

        {activeTab === "details" ? (
          <>
            <Section title="Stammdaten">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
                <FormField label="Projektname" required className="min-w-0">
                  <Input value={name} onChange={(event) => setName(event.target.value)} required />
                </FormField>
                <FormField label="Kürzel" className="min-w-0">
                  <Input value={code} readOnly maxLength={5} variant="mono" className="uppercase text-slate-600" />
                </FormField>
              </div>
              <FormField label="Beschreibung" className="mt-4">
                <RichTextEditor content={description} onChange={setDescription} placeholder="Worum geht es in diesem Projekt?" minHeight="9rem" toolbar="full" />
              </FormField>
            </Section>
            <Section title="Identität">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <FormField label="Farbe">
                  <ColorPicker value={color} onChange={setColor} swatches={swatches} />
                </FormField>
                <FormField label="Status">
                  <SegmentedControl value={status} options={statusOptions} onChange={setStatus} />
                </FormField>
              </div>
            </Section>
            <Section title="Zeitraum">
              <div className="grid gap-4 md:grid-cols-2">
                <DatePicker label="Start" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                <DatePicker label="Fällig" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
            </Section>
            <Section title="Tags">
              <TagPicker selected={selectedTags} onChange={setSelectedTags} />
            </Section>
          </>
        ) : null}

        {activeTab === "milestones" ? (
          <Section title="Meilensteine">
            {project ? (
              <MilestoneListBoardView
                milestones={milestones.milestones}
                loading={milestones.loading}
                onCreate={() => navigate(`/milestones/new?projectId=${project.id}&returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`)}
                onEdit={(milestone) => navigate(`/milestones/${milestone.id}?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`)}
                onDelete={(milestone) => void deleteMilestone(milestone)}
              />
            ) : (
              <EmptyState icon={<Flag size={22} />} title="Meilensteine sind nach dem Speichern verfügbar." tone="teal" variant="tinted" />
            )}
          </Section>
        ) : null}

        {activeTab === "features" ? (
          <Section title="Features">
            {project ? (
              featureLinks.loading ? (
                <TaskListSkeleton />
              ) : (
                <ProjectFeaturePanel
                  features={featureLinks.features}
                  viewMode={featureViewMode}
                  onViewModeChange={setFeatureViewMode}
                  onCreate={() => navigate(`/features/new?projectId=${project.id}&returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`)}
                  onOpen={(feature) => navigate(`/features/${feature.id}?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`)}
                />
              )
            ) : (
              <PendingRelationList
                existingItems={pendingFeatures.map((feature) => ({ id: feature.id, title: feature.title }))}
                draftItems={[]}
                emptyIcon={<FolderKanban size={22} />}
                emptyTitle="Keine Features vorgemerkt"
                showCreateNew={false}
                onLinkExisting={() => setFeatureLinkOpen(true)}
                onRemoveExisting={(index) => setPendingFeatures((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                onRemoveDraft={() => undefined}
              />
            )}
          </Section>
        ) : null}

        {activeTab === "tasks" ? (
          <Section title="Aufgaben">
            {project ? (
              <OwnerTaskBoard owner={{ type: "project", id: project.id }} />
            ) : (
              <PendingRelationList
                existingItems={pendingTasks.flatMap((item) =>
                  item.kind === "existing" ? [{ id: item.task.id, title: item.task.title, statusLabel: taskStatusLabels[item.task.status], statusTone: taskStatusTones[item.task.status] }] : []
                )}
                draftItems={pendingTasks.flatMap((item) => (item.kind === "new" ? [{ title: item.draft.title, badge: "Wird erstellt" }] : []))}
                emptyIcon={<ListTodo size={22} />}
                emptyTitle="Keine Aufgaben vorgemerkt"
                onLinkExisting={() => setTaskLinkOpen(true)}
                onCreateNew={() => setTaskDraftOpen(true)}
                onRemoveExisting={(index) => setPendingTasks((items) => removeDraftByKindIndex(items, "existing", index))}
                onRemoveDraft={(index) => setPendingTasks((items) => removeDraftByKindIndex(items, "new", index))}
              />
            )}
          </Section>
        ) : null}

        {activeTab === "tickets" ? (
          <Section title="Tickets">
            {project ? (
              <OwnerTicketBoard owner={{ type: "project", id: project.id }} />
            ) : (
              <PendingRelationList
                existingItems={pendingTickets.flatMap((item) =>
                  item.kind === "existing"
                    ? [{ id: item.ticket.id, title: item.ticket.title, statusLabel: ticketStatusLabels[item.ticket.status], statusTone: ticketStatusTones[item.ticket.status] }]
                    : []
                )}
                draftItems={pendingTickets.flatMap((item) => (item.kind === "new" ? [{ title: item.draft.title, badge: "Wird erstellt" }] : []))}
                emptyIcon={<ListTodo size={22} />}
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
            {project ? (
              <CommentThread comments={comments.comments} entityLabel="Projekt" onCreate={comments.createComment} onDelete={comments.removeComment} />
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
            {project ? (
              <>
                <NoteList notes={notes.notes} onCreate={createNote} onEdit={setEditingNote} onDelete={(note) => void notes.removeNote(note.id)} />
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
            {project ? (
              <div className="grid gap-4">
                <AttachmentUploader onUpload={uploadAttachment} />
                <AttachmentList attachments={attachments.attachments} onDelete={(attachment) => void attachments.removeAttachment(attachment.id)} />
              </div>
            ) : (
              <PendingFileList files={pendingFiles} onAdd={(files) => setPendingFiles((items) => [...items, ...files])} onRemove={(index) => setPendingFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))} />
            )}
          </Section>
        ) : null}

        {activeTab === "backlog" ? (
          <Section title="Backlog">
            {project ? (
              backlog.loading || allFeatures.loading ? (
                <TaskListSkeleton />
              ) : (
                <BacklogListBoardView
                  items={backlog.items}
                  features={allFeatures.features}
                  statusFilter={backlog.statusFilter}
                  onStatusFilterChange={backlog.setStatusFilter}
                  onCreate={() => navigate(`/backlog/new?projectId=${project.id}&returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`)}
                  onEdit={(item) => navigate(`/backlog/${item.id}?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`)}
                  onDelete={(item) => void deleteBacklogItem(item)}
                />
              )
            ) : (
              <EmptyState icon={<Inbox size={22} />} title="Backlog ist nach dem Speichern verfügbar." tone="tangerine" variant="tinted" />
            )}
          </Section>
        ) : null}

        {activeTab === "import" && project ? (
          <WikiImportPanel
            sourcePath={wikiImportSourcePath}
            report={wikiImport.preview}
            loading={wikiImport.loading}
            error={wikiImport.error}
            onSourcePathChange={setWikiImportSourcePath}
            onPreview={() => void previewWikiImport()}
            onRun={() => void runWikiImport()}
          />
        ) : null}
      </FormModal>

      <FeatureLinkDialog
        open={featureLinkOpen}
        features={allFeatures.features}
        excludeIds={pendingFeatures.map((feature) => feature.id)}
        onLink={(feature) => setPendingFeatures((items) => [...items, feature])}
        onClose={() => setFeatureLinkOpen(false)}
      />
      <TaskLinkDialog
        open={taskLinkOpen}
        currentTasks={pendingTasks.flatMap((item) => (item.kind === "existing" ? [item.task] : []))}
        onLink={async (task) => {
          setPendingTasks((items) => [...items, { kind: "existing", task }]);
          setTaskLinkOpen(false);
        }}
        onClose={() => setTaskLinkOpen(false)}
      />
      <TicketLinkDialog
        open={ticketLinkOpen}
        currentTickets={pendingTickets.flatMap((item) => (item.kind === "existing" ? [item.ticket] : []))}
        onLink={async (ticket) => {
          setPendingTickets((items) => [...items, { kind: "existing", ticket }]);
          setTicketLinkOpen(false);
        }}
        onClose={() => setTicketLinkOpen(false)}
      />
      <TaskDraftDialog
        open={taskDraftOpen}
        onCreate={(draft) => setPendingTasks((items) => [...items, { kind: "new", draft }])}
        onClose={() => setTaskDraftOpen(false)}
      />
      <TicketDraftDialog
        open={ticketDraftOpen}
        onCreate={(draft) => setPendingTickets((items) => [...items, { kind: "new", draft }])}
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

function FeatureLinkDialog({ open, features, excludeIds, onLink, onClose }: { open: boolean; features: Feature[]; excludeIds: number[]; onLink: (feature: Feature) => void; onClose: () => void }) {
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | "">("");
  const availableFeatures = features.filter((feature) => !excludeIds.includes(feature.id));
  const firstFeatureId = availableFeatures[0]?.id ?? "";

  useEffect(() => {
    if (open) {
      setSelectedFeatureId(firstFeatureId);
    }
  }, [firstFeatureId, open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const feature = availableFeatures.find((item) => item.id === selectedFeatureId);
    if (!feature) {
      return;
    }
    onLink(feature);
    onClose();
  };

  return (
    <Modal open={open} title="Feature verknüpfen" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <Select label="Feature" value={selectedFeatureId} onChange={(event) => setSelectedFeatureId(event.target.value ? Number(event.target.value) : "")}>
          {availableFeatures.map((feature) => (
            <option key={feature.id} value={feature.id}>
              {feature.title}
            </option>
          ))}
        </Select>
        <footer className="flex justify-end gap-2">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!selectedFeatureId}>
            Verknüpfen
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function TaskDraftDialog({ open, onCreate, onClose }: { open: boolean; onCreate: (draft: Extract<DraftTask, { kind: "new" }>["draft"]) => void; onClose: () => void }) {
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
    <Modal open={open} title="Aufgabe vormerken" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <FormField label="Titel" required>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required />
        </FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status">
            <RadioList value={status} options={taskStatuses} onChange={setStatus} />
          </FormField>
          <FormField label="Priorität">
            <RadioList value={priority} options={priorities} onChange={setPriority} />
          </FormField>
        </div>
        <footer className="flex justify-end gap-2">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!trimmedTitle}>
            Vormerken
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function TicketDraftDialog({ open, onCreate, onClose }: { open: boolean; onCreate: (draft: Extract<DraftTicket, { kind: "new" }>["draft"]) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TicketStatus>("open");
  const [priority, setPriority] = useState<Priority>("medium");
  const trimmedTitle = title.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    onCreate({ title: trimmedTitle, type: "bug", status, priority });
    setTitle("");
    setStatus("open");
    setPriority("medium");
    onClose();
  };

  return (
    <Modal open={open} title="Ticket vormerken" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <FormField label="Titel" required>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required />
        </FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status">
            <RadioList value={status} options={ticketStatuses} onChange={setStatus} />
          </FormField>
          <FormField label="Priorität">
            <RadioList value={priority} options={priorities} onChange={setPriority} />
          </FormField>
        </div>
        <footer className="flex justify-end gap-2">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!trimmedTitle}>
            Vormerken
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
