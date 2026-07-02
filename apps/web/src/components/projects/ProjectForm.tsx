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
  TicketStatus,
} from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Flag,
  FolderKanban,
  Inbox,
  ListChecks,
  ListTodo,
  Trash2,
  Users,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { DraftFile, ViewMode } from "../../types";
import { uploadTaskAttachment } from "../../api/attachments";
import { createEntityComment } from "../../api/comments";
import { uploadContentImage } from "../../api/content-images";
import { createTaskNote } from "../../api/notes";
import { createSubtask } from "../../api/subtasks";
import { setTaskTags } from "../../api/tags";
import { addTicketRelation, createOwnerTicket, createSubTicket, createTicketNote, linkOwnerTicket, setTicketTags, uploadTicketAttachment } from "../../api/tickets";
import { errorMessage, errorMessageAsync } from "../../hooks/errors";
import { useAttachments } from "../../hooks/useAttachments";
import { useAuth } from "../../hooks/useAuth";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useBacklog } from "../../hooks/useBacklog";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useFeatures } from "../../hooks/useFeatures";
import { useMilestones } from "../../hooks/useMilestones";
import { useNotes } from "../../hooks/useNotes";
import { useProjectFeatureLinks } from "../../hooks/useDocLinks";
import { useProjectWikiRelation } from "../../hooks/useProjectWikiRelation";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useStatusCascadeWorkflow } from "../../hooks/useStatusCascadeWorkflow";
import { useTasks } from "../../hooks/useTasks";
import { useTickets } from "../../hooks/useTickets";
import { objectReference } from "../../lib/references";
import { invalidateTags } from "../../queries/invalidation";
import {
  catalogColor,
  catalogLabel,
  countOpenStatusItems,
  resolveCatalogEntryKey,
} from "../../utils/catalogs";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { BacklogListBoardView } from "../backlog/BacklogListBoardView";
import { ProjectDashboard } from "../dashboard/DashboardView";
import { ProjectFeaturePanel } from "../features/ProjectFeaturePanel";
import { JournalPanel } from "../journal/JournalPanel";
import { MilestoneListBoardView } from "../milestones/MilestoneListBoardView";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { TagPicker } from "../tags/TagPicker";
import { TaskForm, type TaskFormInput } from "../tasks/TaskForm";
import { TaskLinkDialog } from "../tasks/TaskLinkDialog";
import { OwnerTaskBoard } from "../tasks/OwnerTaskBoard";
import { TicketForm, type TicketFormInput } from "../tickets/TicketForm";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";
import { TicketLinkDialog } from "../tickets/TicketLinkDialog";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { DatePicker } from "../ui/DatePicker";
import { EmptyState } from "../ui/EmptyState";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { SaveStatus } from "../ui/SaveStatus";
import { FormSidebar } from "../ui/FormSidebar";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { PendingCommentList } from "../ui/PendingCommentList";
import { PendingFileList } from "../ui/PendingFileList";
import { PendingNoteList } from "../ui/PendingNoteList";
import { PendingRelationList } from "../ui/PendingRelationList";
import { PrioritySelect } from "../ui/PrioritySelect";
import { CatalogSelect } from "../ui/CatalogSelect";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { DetailBoardShell } from "../ui/DetailBoardShell";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";
import { TaskListSkeleton } from "../ui/Skeleton";
import { StatusToggle } from "../ui/StatusToggle";
import { TabBar, type Tab } from "../ui/TabBar";
import { useToast } from "../ui/ToastProvider";
import { UserSelectField } from "../users/UserSelectField";
import { useHasPermission } from "../../hooks/usePermissions";
import { withStandaloneView } from "../../utils/standalone";
import { ProjectWikiPanel } from "./ProjectWikiPanel";

interface ProjectFormProps {
  open: boolean;
  project?: Project | null;
  onSubmit: (input: ProjectInput, tagIds: number[]) => Promise<Project | void>;
  onAutoSave?: (input: ProjectInput, tagIds: number[]) => Promise<void>;
  onClose: () => void;
  onDelete?: (project: Project) => Promise<boolean>;
  savingLabel?: string;
  initialTab?: ProjectFormTab;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onOpenInTab?: () => void;
  onPostCreate?: (
    projectId: number,
    pending: {
      tasks: DraftTask[];
      tickets: DraftTicket[];
      featureIds: number[];
      comments: DraftComment[];
      notes: DraftNote[];
      files: DraftFile[];
    },
  ) => Promise<void>;
}

export type ProjectFormTab =
  | "overview"
  | "details"
  | "milestones"
  | "features"
  | "tasks"
  | "tickets"
  | "comments"
  | "notes"
  | "attachments"
  | "backlog"
  | "journal";

const baseTabs: Array<Tab<ProjectFormTab>> = [
  { value: "overview", label: "Übersicht" },
  { value: "details", label: "Details" },
  { value: "milestones", label: "Meilensteine" },
  { value: "tasks", label: "Aufgaben" },
  { value: "tickets", label: "Tickets" },
  { value: "features", label: "Features" },
  { value: "notes", label: "Notizen" },
  { value: "comments", label: "Kommentare" },
  { value: "attachments", label: "Dateien" },
  { value: "backlog", label: "Backlog" },
  { value: "journal", label: "Journal" },
];

export function parseProjectFormTab(
  value: string | null | undefined,
): ProjectFormTab | undefined {
  return baseTabs.some((tab) => tab.value === value)
    ? (value as ProjectFormTab)
    : undefined;
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

function priorityValue(
  entries: Parameters<typeof resolveCatalogEntryKey>[0],
  value: string,
  preferredKey = "medium",
) {
  return (
    resolveCatalogEntryKey(entries, "priority", value, preferredKey) ??
    preferredKey
  );
}

export function ProjectForm({
  open,
  project,
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
}: ProjectFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const projectId = project?.id;
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const auth = useAuth();
  const statusCascade = useStatusCascadeWorkflow();
  const allFeatures = useFeatures();
  const milestones = useMilestones(null, projectId);
  const featureLinks = useProjectFeatureLinks(projectId);
  const taskOwner = projectId
    ? { type: "project" as const, id: projectId }
    : undefined;
  const tasks = useTasks(taskOwner);
  const tickets = useTickets(
    projectId ? { type: "project", id: projectId } : null,
  );
  const backlog = useBacklog(projectId);
  const catalogs = useCatalogs();
  const notes = useNotes(projectId ? { type: "project", id: projectId } : null);
  const projectWikiRelation = useProjectWikiRelation(project);
  const attachments = useAttachments(
    projectId ? { type: "project", id: projectId } : null,
  );
  const comments = useEntityComments("project", projectId);
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
  const [responsibleUserId, setResponsibleUserId] = useState<number | null>(null);
  const [milestoneViewMode, setMilestoneViewMode] =
    useState<ViewMode>("kanban");
  const [featureViewMode, setFeatureViewMode] = useState<ViewMode>("kanban");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const canReadJournal = useHasPermission("journal", "read");
  const canCreateTasks = useHasPermission("tasks", "write");
  const canCreateTickets = useHasPermission("tickets", "write");
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
  const [createTaskForMilestone, setCreateTaskForMilestone] = useState<Milestone | null>(null);
  const [createTicketForMilestone, setCreateTicketForMilestone] = useState<Milestone | null>(null);
  const prevOpenRef = useRef(false);

  const formStateRef = useRef({ name, description, status, color, startDate, dueDate, responsibleUserId, selectedTags });
  formStateRef.current = { name, description, status, color, startDate, dueDate, responsibleUserId, selectedTags };

  const autoSave = useAutoSave({
    enabled: !!project && !!onAutoSave,
    save: async () => {
      if (!onAutoSave) return;
      const s = formStateRef.current;
      await onAutoSave(
        {
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
  const af = project ? autoSave.flush : undefined;
  const createTaskOwner = createTaskForMilestone ? { type: "milestone" as const, id: createTaskForMilestone.id } : null;
  const createTicketOwner = createTicketForMilestone ? { type: "milestone" as const, id: createTicketForMilestone.id } : null;
  const milestoneTaskActions = useTasks(createTaskOwner);
  const milestoneTicketActions = useTickets(createTicketOwner);
  const featureLinkExcludeIds = project
    ? featureLinks.features.map((feature) => feature.id)
    : pendingFeatures.map((feature) => feature.id);

  const handleTabChange = (nextTab: ProjectFormTab) => {
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
      setCreateTaskForMilestone(null);
      setCreateTicketForMilestone(null);
      prevOpenRef.current = false;
      return;
    }
    if (!prevOpenRef.current) {
      setActiveTab(initialTab ?? "details");
    }
    prevOpenRef.current = true;
  }, [initialTab, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setStatus(project?.status ?? "active");
    setColor(project?.color ?? "var(--color-steel-700)");
    setSelectedTags(project?.tags ?? []);
    setStartDate(project?.startDate ?? "");
    setDueDate(project?.dueDate ?? "");
    setResponsibleUserId(project ? project.responsibleUserId : (auth.user?.id ?? null));
  }, [auth.user?.id, open, project]);

  useEffect(() => {
    if (open && catalogs.entries.length > 0) {
      setStatus((currentStatus) =>
        workStatusValue(catalogs.entries, currentStatus, "active"),
      );
    }
  }, [catalogs.entries, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await onSubmit(
        {
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
      if (!project && created && onPostCreate) {
        await onPostCreate(created.id, {
          tasks: pendingTasks,
          tickets: pendingTickets,
          featureIds: pendingFeatures.map((feature) => feature.id),
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

  const updateMilestoneStatus = async (milestone: Milestone, nextStatus: Milestone["status"]) => {
    const updated = await milestones.updateMilestone(milestone.id, { status: nextStatus, expectedVersion: milestone.version });
    await statusCascade.startMilestoneCascade(milestone, updated);
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

  const deleteBacklogItem = async (item: BacklogItem) => {
    const approved = await confirm({
      title: "Backlog-Item löschen?",
      body: `Das Backlog-Item "${item.title}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return;
    }
    try {
      await backlog.removeItem(item.id);
      showToast({ tone: "success", title: "Backlog-Item gelöscht" });
    } catch (backlogError) {
      showToast({
        tone: "error",
        title: "Backlog-Item konnte nicht gelöscht werden",
        message: errorMessage(backlogError),
      });
    }
  };

  const deleteMilestone = async (milestone: Milestone) => {
    const approved = await confirm({
      title: "Meilenstein löschen?",
      body: `Der Meilenstein "${milestone.name}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return;
    }
    try {
      await milestones.removeMilestone(milestone.id);
      showToast({ tone: "success", title: "Meilenstein gelöscht" });
    } catch (milestoneError) {
      showToast({
        tone: "error",
        title: "Meilenstein konnte nicht gelöscht werden",
        message: errorMessage(milestoneError),
      });
    }
  };

  const changeMilestoneTags = async (milestoneId: number, tagIds: number[]) => {
    try {
      await milestones.updateMilestoneTags(milestoneId, tagIds);
    } catch (milestoneError) {
      showToast({
        tone: "error",
        title: "Meilenstein-Tags konnten nicht geändert werden",
        message: errorMessage(milestoneError),
      });
      throw milestoneError;
    }
  };

  const createMilestoneTask = async (input: TaskFormInput) => {
    const {
      tagIds,
      pendingSubtasks,
      pendingTickets,
      pendingComments,
      pendingNotes,
      pendingFiles,
      ...taskInput
    } = input;
    let created: Awaited<ReturnType<typeof milestoneTaskActions.createTask>> | null = null;
    try {
      created = await milestoneTaskActions.createTask(taskInput);
      if (!created) {
        throw new Error("Aufgabe konnte nicht angelegt werden");
      }
      if (tagIds.length > 0) {
        await setTaskTags(created.id, tagIds);
        await invalidateTags(queryClient);
      }
      for (const subtask of pendingSubtasks) {
        await createSubtask(created.id, subtask);
      }
      const ticketOwner = { type: "task" as const, id: created.id };
      for (const ticket of pendingTickets) {
        if (ticket.kind === "existing") {
          await linkOwnerTicket(ticketOwner, ticket.ticket.id);
        } else {
          await createOwnerTicket(ticketOwner, ticket.draft);
        }
      }
      for (const comment of pendingComments) {
        await createEntityComment("task", created.id, { body: comment.text });
      }
      for (const note of pendingNotes) {
        await createTaskNote(created.id, note);
      }
      for (const file of pendingFiles) {
        await uploadTaskAttachment(created.id, file.file);
      }
      showToast({ tone: "success", title: "Aufgabe angelegt" });
      return created;
    } catch (taskError) {
      showToast({
        tone: "error",
        title: created
          ? "Aufgabe wurde angelegt, aber nicht alle Zuordnungen konnten gespeichert werden"
          : "Aufgabe konnte nicht angelegt werden",
        message: errorMessage(taskError),
      });
      throw taskError;
    }
  };

  const createMilestoneTicket = async (input: TicketFormInput) => {
    const { tagIds, pendingSubTickets, pendingRelations, pendingComments, pendingNotes, pendingFiles } = input;
    const ticketInput = {
      title: input.title,
      type: input.type,
      description: input.description,
      status: input.status,
      priority: input.priority,
      reporterUserId: input.reporterUserId,
      responsibleUserId: input.responsibleUserId,
      environment: input.environment,
      affectedVersion: input.affectedVersion,
      dueDate: input.dueDate,
    };
    let created: Awaited<ReturnType<typeof milestoneTicketActions.createTicket>> | null = null;
    try {
      created = await milestoneTicketActions.createTicket(ticketInput);
      if (!created) {
        throw new Error("Ticket konnte nicht angelegt werden");
      }
      if (tagIds.length > 0) {
        await setTicketTags(created.id, tagIds);
      }
      for (const subTicket of pendingSubTickets) {
        await createSubTicket(created.id, subTicket);
      }
      for (const relation of pendingRelations) {
        await addTicketRelation(created.id, {
          targetTicketId: relation.ticket.id,
          relationType: relation.relationType,
        });
      }
      for (const comment of pendingComments) {
        await createEntityComment("ticket", created.id, { body: comment.text });
      }
      for (const note of pendingNotes) {
        await createTicketNote(created.id, note);
      }
      for (const file of pendingFiles) {
        await uploadTicketAttachment(created.id, file.file);
      }
      showToast({ tone: "success", title: "Ticket angelegt" });
      return created;
    } catch (ticketError) {
      showToast({
        tone: "error",
        title: created
          ? "Ticket wurde angelegt, aber nicht alle Zuordnungen konnten gespeichert werden"
          : "Ticket konnte nicht angelegt werden",
        message: await errorMessageAsync(ticketError),
      });
      throw ticketError;
    }
  };

  const updateProjectFeatureStatus = async (
    feature: Feature,
    status: Feature["status"],
  ) => {
    try {
      await allFeatures.updateFeature(feature.id, {
        status,
        expectedVersion: feature.version,
      });
    } catch (featureError) {
      showToast({
        tone: "error",
        title: "Featurestatus konnte nicht geändert werden",
        message: errorMessage(featureError),
      });
      throw featureError;
    }
  };

  const linkFeature = async (targetFeature: Feature) => {
    if (!projectId) {
      setPendingFeatures((items) =>
        items.some((feature) => feature.id === targetFeature.id)
          ? items
          : [...items, targetFeature],
      );
      return true;
    }

    const currentFeatureIds = featureLinks.features.map((feature) => feature.id);
    if (currentFeatureIds.includes(targetFeature.id)) {
      return true;
    }

    try {
      await featureLinks.setFeaturesForProject([
        ...currentFeatureIds,
        targetFeature.id,
      ]);
      showToast({ tone: "success", title: "Feature verknüpft" });
      return true;
    } catch (featureError) {
      showToast({
        tone: "error",
        title: "Feature konnte nicht verknüpft werden",
        message: errorMessage(featureError),
      });
      return false;
    }
  };

  const setProjectWikiPage = async (wikiPageId: number | null) => {
    try {
      await projectWikiRelation.setProjectWikiPageId(wikiPageId);
      showToast({
        tone: "success",
        title:
          wikiPageId === null
            ? "Wiki-Verknüpfung entfernt"
            : "Wiki-Seite verknüpft",
      });
    } catch (wikiError) {
      showToast({
        tone: "error",
        title:
          wikiPageId === null
            ? "Wiki-Verknüpfung konnte nicht entfernt werden"
            : "Wiki-Seite konnte nicht verknüpft werden",
        message: errorMessage(wikiError),
      });
      throw wikiError;
    }
  };

  const visibleTabs = project
    ? baseTabs.filter((tab) => tab.value !== "journal" || canReadJournal)
    : baseTabs.filter(
        (tab) => tab.value !== "overview" && tab.value !== "journal",
      );
  const tabItems = visibleTabs.map((tab) => {
    if (tab.value === "details") {
      return tab;
    }
    if (tab.value === "milestones") {
      return {
        ...tab,
        count: project
          ? countOpenStatusItems(
              milestones.milestones,
              catalogs.entries,
              "workStatus",
            )
          : 0,
      };
    }
    if (tab.value === "features") {
      return {
        ...tab,
        count: project
          ? countOpenStatusItems(
              featureLinks.features,
              catalogs.entries,
              "featureStatus",
            )
          : countOpenStatusItems(
              pendingFeatures,
              catalogs.entries,
              "featureStatus",
            ),
      };
    }
    if (tab.value === "tasks") {
      const pending = pendingTasks.map((item) =>
        item.kind === "existing" ? item.task : item.draft,
      );
      return {
        ...tab,
        count: project
          ? countOpenStatusItems(tasks.tasks, catalogs.entries, "workStatus")
          : countOpenStatusItems(pending, catalogs.entries, "workStatus"),
      };
    }
    if (tab.value === "tickets") {
      const pending = pendingTickets.map((item) =>
        item.kind === "existing" ? item.ticket : item.draft,
      );
      return {
        ...tab,
        count: project
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
        count: project ? comments.comments.length : pendingComments.length,
      };
    }
    if (tab.value === "notes") {
      return {
        ...tab,
        count: project ? notes.notes.length : pendingNotes.length,
      };
    }
    if (tab.value === "attachments") {
      return {
        ...tab,
        count: project ? attachments.attachments.length : pendingFiles.length,
      };
    }
    if (tab.value === "backlog") {
      return {
        ...tab,
        count: project
          ? countOpenStatusItems(backlog.items, catalogs.entries, "workStatus")
          : 0,
      };
    }
    return { ...tab, count: 0 };
  });

  // Reload the active collection tab from the server (e.g. after an external MCP change).
  // Only for a persisted project; in create mode the lists are local drafts.
  const collectionReload: Partial<Record<ProjectFormTab, () => Promise<void>>> = project
    ? {
        tasks: tasks.reload,
        tickets: tickets.reload,
        notes: notes.reload,
        comments: comments.reload,
        attachments: attachments.reload,
      }
    : {};
  const refreshActiveTab = collectionReload[activeTab];

  return (
    <>
      <FormModal
        open={open}
        title={project ? "Projekt bearbeiten" : "Projekt anlegen"}
        entityTitle={project?.name}
        objectReference={project ? objectReference("project", project.id) : undefined}
        icon={<FolderKanban size={21} />}
        breadcrumb={["Projekte"]}
        onSubmit={submit}
        saving={saving}
        submitLabel={saving ? (savingLabel ?? "Speichern…") : "Projekt anlegen"}
        hideFooter={!!project}
        onDelete={project && onDelete ? () => { void deleteCurrentProject(); } : undefined}
        saveStatus={project ? <SaveStatus status={autoSave.status} errorMessage={autoSave.errorMessage} /> : undefined}
        onClose={onClose}
        variant={variant}
        onOpenInTab={onOpenInTab}
        onRefresh={refreshActiveTab}
        contentLayout={activeTab === "details" ? "flush" : "default"}
        contentClassName={
          activeTab === "overview" ? "w-full max-w-7xl self-center" : ""
        }
        tabBar={
          <TabBar tabs={tabItems} active={activeTab} onChange={handleTabChange} />
        }
      >
        {activeTab === "overview" && project ? (
          <ProjectDashboard projectId={project.id} />
        ) : null}

        {activeTab === "details" ? (
          <div className="flex min-h-0 w-full flex-1">
            <div className="min-w-0 flex-1 overflow-auto p-2.5">
              <div className="flex min-h-full flex-col gap-4 w-full">
                <Section className="flex flex-1 flex-col">
                  <div className="flex flex-1 flex-col gap-4">
                    <FormField label="Projektname" required className="min-w-0">
                      <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        onBlur={af}
                        required
                      />
                    </FormField>
                    <FormField label="Beschreibung" fill>
                      <RichTextInlineField
                        value={description}
                        onChange={(v) => { setDescription(v); formStateRef.current = { ...formStateRef.current, description: v }; af?.(); }}
                        placeholder="Worum geht es in diesem Projekt?"
                        fill
                        minRows={5}
                        testIdPrefix="project-description"
                        onImageUpload={uploadContentImage}
                      />
                    </FormField>
                  </div>
                </Section>
              </div>
            </div>
            <FormSidebar storageKey="project-form-sidebar">
              <CatalogSelect label="Status" icon={<ListChecks size={14} />} variant="panel" kind="workStatus" value={status} onChange={(v) => { setStatus(v); formStateRef.current = { ...formStateRef.current, status: v }; af?.(); }} />
              <UserSelectField
                label="Verantwortlich"
                icon={<Users size={14} />}
                variant="panel"
                value={responsibleUserId}
                selectedUser={project?.responsibleUser ?? null}
                onChange={(v) => { setResponsibleUserId(v); formStateRef.current = { ...formStateRef.current, responsibleUserId: v }; af?.(); }}
              />
              <DatePicker label="Start" variant="panel" value={startDate} onChange={(event) => { const v = event.target.value; setStartDate(v); formStateRef.current = { ...formStateRef.current, startDate: v }; af?.(); }} />
              <DatePicker label="Fällig" variant="panel" value={dueDate} onChange={(event) => { const v = event.target.value; setDueDate(v); formStateRef.current = { ...formStateRef.current, dueDate: v }; af?.(); }} />
              <TagPicker selected={selectedTags} onChange={(v) => { setSelectedTags(v); formStateRef.current = { ...formStateRef.current, selectedTags: v }; af?.(); }} variant="panel" />
              {project ? (
                <ProjectWikiPanel
                  wikiPageId={projectWikiRelation.wikiPageId}
                  saving={projectWikiRelation.saving}
                  onChange={setProjectWikiPage}
                />
              ) : null}
            </FormSidebar>
          </div>
        ) : null}

        {activeTab === "milestones" ? (
          <DetailBoardShell>
            {project ? (
              <MilestoneListBoardView
                milestones={milestones.milestones}
                loading={milestones.loading}
                viewMode={milestoneViewMode}
                onViewModeChange={setMilestoneViewMode}
                onCreate={() =>
                  navigate(
                    `/milestones/new?projectId=${project.id}&returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
                  )
                }
                onEdit={(milestone) =>
                  navigate(
                    `/milestones/${milestone.id}?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
                  )
                }
                onOpenInTab={(milestone) => window.open(withStandaloneView(`/milestones/${milestone.id}`), "_blank")}
                onDelete={(milestone) => void deleteMilestone(milestone)}
                onStatusChange={updateMilestoneStatus}
                onDueDateChange={(milestone, dueDate) => milestones.updateMilestone(milestone.id, { dueDate, expectedVersion: milestone.version })}
                onTagsChange={changeMilestoneTags}
                onCreateTask={canCreateTasks ? (milestone) => setCreateTaskForMilestone(milestone) : undefined}
                onCreateTicket={canCreateTickets ? (milestone) => setCreateTicketForMilestone(milestone) : undefined}
              />
            ) : (
              <EmptyState
                icon={<Flag size={22} />}
                title="Meilensteine sind nach dem Speichern verfügbar."
                tone="teal"
                variant="tinted"
              />
            )}
          </DetailBoardShell>
        ) : null}

        {activeTab === "features" ? (
          <DetailBoardShell>
            {project ? (
              featureLinks.loading ? (
                <TaskListSkeleton />
              ) : (
                <ProjectFeaturePanel
                  features={featureLinks.features}
                  viewMode={featureViewMode}
                  onViewModeChange={setFeatureViewMode}
                  onCreate={() =>
                    navigate(
                      `/features/new?projectId=${project.id}&returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
                    )
                  }
                  onOpen={(feature) =>
                    navigate(
                      `/features/${feature.id}?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
                    )
                  }
                  onStatusChange={updateProjectFeatureStatus}
                />
              )
            ) : (
              <PendingRelationList
                existingItems={pendingFeatures.map((feature) => ({
                  id: feature.id,
                  title: feature.title,
                }))}
                draftItems={[]}
                emptyIcon={<BookOpen size={22} />}
                emptyTitle="Keine Features vorgemerkt"
                showCreateNew={false}
                onLinkExisting={() => setFeatureLinkOpen(true)}
                onRemoveExisting={(index) =>
                  setPendingFeatures((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                onRemoveDraft={() => undefined}
              />
            )}
          </DetailBoardShell>
        ) : null}

        {activeTab === "tasks" ? (
          <DetailBoardShell>
            {project ? (
              <OwnerTaskBoard owner={{ type: "project", id: project.id }} />
            ) : (
              <PendingRelationList
                existingItems={pendingTasks.flatMap((item) =>
                  item.kind === "existing"
                    ? [
                        {
                          id: item.task.id,
                          title: item.task.title,
                          statusLabel: catalogLabel(
                            catalogs.entries,
                            "workStatus",
                            item.task.status,
                          ),
                          statusColor: catalogColor(
                            catalogs.entries,
                            "workStatus",
                            item.task.status,
                          ),
                        },
                      ]
                    : [],
                )}
                draftItems={pendingTasks.flatMap((item) =>
                  item.kind === "new"
                    ? [{ title: item.draft.title, badge: "Wird erstellt" }]
                    : [],
                )}
                emptyIcon={<ListTodo size={22} />}
                emptyTitle="Keine Aufgaben vorgemerkt"
                showLinkExisting={false}
                onLinkExisting={() => setTaskLinkOpen(true)}
                onCreateNew={() => setTaskDraftOpen(true)}
                onRemoveExisting={(index) =>
                  setPendingTasks((items) =>
                    removeDraftByKindIndex(items, "existing", index),
                  )
                }
                onRemoveDraft={(index) =>
                  setPendingTasks((items) =>
                    removeDraftByKindIndex(items, "new", index),
                  )
                }
              />
            )}
          </DetailBoardShell>
        ) : null}

        {activeTab === "tickets" ? (
          <DetailBoardShell>
            {project ? (
              <OwnerTicketBoard owner={{ type: "project", id: project.id }} />
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
                emptyIcon={<ListTodo size={22} />}
                emptyTitle="Keine Tickets vorgemerkt"
                showLinkExisting={false}
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
          </DetailBoardShell>
        ) : null}

        {activeTab === "comments" ? (
          <DetailBoardShell>
            {project ? (
              <CommentThread
                comments={comments.comments}
                entityLabel="Projekt"
                onCreate={comments.createComment}
                onUpdate={comments.updateComment}
                onDelete={comments.removeComment}
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
          </DetailBoardShell>
        ) : null}

        {activeTab === "notes" ? (
          <DetailBoardShell>
            {project ? (
              <>
                <NoteList
                  notes={notes.notes}
                  owner={{ type: "project", id: project.id }}
                  onCreate={createNote}
                  onEdit={setEditingNote}
                  onMove={(note, target) => notes.moveNote(note.id, { source: { type: "project", id: project.id }, target })}
                  onDelete={(note) => void notes.removeNote(note.id)}
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
          </DetailBoardShell>
        ) : null}

        {activeTab === "attachments" ? (
          <Section>
            {project ? (
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
                onAdd={(files) =>
                  setPendingFiles((items) => [...items, ...files])
                }
                onRemove={(index) =>
                  setPendingFiles((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
            )}
          </Section>
        ) : null}

        {activeTab === "backlog" ? (
          <DetailBoardShell>
            {project ? (
              backlog.loading || allFeatures.loading ? (
                <TaskListSkeleton />
              ) : (
                <BacklogListBoardView
                  items={backlog.items}
                  features={allFeatures.features}
                  statusFilter={backlog.statusFilter}
                  onStatusFilterChange={backlog.setStatusFilter}
                  onCreate={() =>
                    navigate(
                      `/backlog/new?projectId=${project.id}&returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
                    )
                  }
                  onEdit={(item) =>
                    navigate(
                      `/backlog/${item.id}?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
                    )
                  }
                  onDelete={(item) => void deleteBacklogItem(item)}
                  onStatusChange={(item, status) => backlog.updateItem(item.id, { status, expectedVersion: item.version })}
                />
              )
            ) : (
              <EmptyState
                icon={<Inbox size={22} />}
                title="Backlog ist nach dem Speichern verfügbar."
                tone="tangerine"
                variant="tinted"
              />
            )}
          </DetailBoardShell>
        ) : null}

        {activeTab === "journal" && project ? (
          <Section fill>
            <JournalPanel objectType="project" objectId={project.id} />
          </Section>
        ) : null}
      </FormModal>

      <FeatureLinkDialog
        open={featureLinkOpen}
        features={allFeatures.features}
        excludeIds={featureLinkExcludeIds}
        onLink={linkFeature}
        onClose={() => setFeatureLinkOpen(false)}
      />
      <TaskLinkDialog
        open={taskLinkOpen}
        owner={null}
        currentTasks={pendingTasks.flatMap((item) =>
          item.kind === "existing" ? [item.task] : [],
        )}
        onLink={async (task) => {
          setPendingTasks((items) => [...items, { kind: "existing", task }]);
          setTaskLinkOpen(false);
        }}
        onClose={() => setTaskLinkOpen(false)}
      />
      <TicketLinkDialog
        open={ticketLinkOpen}
        owner={null}
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
        open={taskDraftOpen}
        onCreate={(draft) =>
          setPendingTasks((items) => [...items, { kind: "new", draft }])
        }
        onClose={() => setTaskDraftOpen(false)}
      />
      <TicketDraftDialog
        open={ticketDraftOpen}
        onCreate={(draft) =>
          setPendingTickets((items) => [...items, { kind: "new", draft }])
        }
        onClose={() => setTicketDraftOpen(false)}
      />
      <TaskForm
        open={createTaskForMilestone !== null}
        owner={createTaskOwner ?? undefined}
        closeOnSubmit
        onSubmit={createMilestoneTask}
        onClose={() => setCreateTaskForMilestone(null)}
      />
      <TicketForm
        open={createTicketForMilestone !== null}
        owner={createTicketOwner ?? undefined}
        closeOnSubmit
        onSubmit={createMilestoneTicket}
        onClose={() => setCreateTicketForMilestone(null)}
      />
      {statusCascade.dialog}
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

function FeatureLinkDialog({
  open,
  features,
  excludeIds,
  onLink,
  onClose,
}: {
  open: boolean;
  features: Feature[];
  excludeIds: number[];
  onLink: (feature: Feature) => Promise<boolean>;
  onClose: () => void;
}) {
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | "">("");
  const availableFeatures = features.filter(
    (feature) => !excludeIds.includes(feature.id),
  );
  const firstFeatureId = availableFeatures[0]?.id ?? "";

  useEffect(() => {
    if (open) {
      setSelectedFeatureId(firstFeatureId);
    }
  }, [firstFeatureId, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const feature = availableFeatures.find(
      (item) => item.id === selectedFeatureId,
    );
    if (!feature) {
      return;
    }
    const linked = await onLink(feature);
    if (linked) {
      onClose();
    }
  };

  return (
    <Modal open={open} title="Feature verknüpfen" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <Select
          label="Feature"
          value={selectedFeatureId}
          onChange={(event) =>
            setSelectedFeatureId(
              event.target.value ? Number(event.target.value) : "",
            )
          }
        >
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

function TaskDraftDialog({
  open,
  onCreate,
  onClose,
}: {
  open: boolean;
  onCreate: (draft: Extract<DraftTask, { kind: "new" }>["draft"]) => void;
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
    onCreate({
      title: trimmedTitle,
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
    });
    setTitle("");
    setStatus(workStatusValue(catalogs.entries, "active", "active"));
    setPriority(priorityValue(catalogs.entries, "medium", "medium"));
    onClose();
  };

  return (
    <Modal open={open} title="Aufgabe vormerken" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <FormField label="Titel" required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            required
          />
        </FormField>
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

function TicketDraftDialog({
  open,
  onCreate,
  onClose,
}: {
  open: boolean;
  onCreate: (draft: Extract<DraftTicket, { kind: "new" }>["draft"]) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const catalogs = useCatalogs();
  const [status, setStatus] = useState<TicketStatus>("open");
  const [priority, setPriority] = useState<Priority>("medium");
  const trimmedTitle = title.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    onCreate({
      title: trimmedTitle,
      type: "bug",
      status: resolveCatalogEntryKey(
        catalogs.entries,
        "workStatus",
        status,
        "open",
      ),
      priority: resolveCatalogEntryKey(
        catalogs.entries,
        "priority",
        priority,
        "medium",
      ),
    });
    setTitle("");
    setStatus(workStatusValue(catalogs.entries, "open", "open"));
    setPriority(priorityValue(catalogs.entries, "medium", "medium"));
    onClose();
  };

  return (
    <Modal open={open} title="Ticket vormerken" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <FormField label="Titel" required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            required
          />
        </FormField>
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
