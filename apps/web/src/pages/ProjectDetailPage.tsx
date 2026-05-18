import type { Attachment, BacklogItem, Feature, FeatureInput, Note, ProjectInput } from "@taskmanager/shared-types";
import { ChevronRight } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { AttachmentList } from "../components/attachments/AttachmentList";
import { AttachmentUploader } from "../components/attachments/AttachmentUploader";
import { BacklogItemForm } from "../components/backlog/BacklogItemForm";
import { BacklogListBoardView } from "../components/backlog/BacklogListBoardView";
import { FeatureForm } from "../components/features/FeatureForm";
import { ProjectFeaturePanel } from "../components/features/ProjectFeaturePanel";
import { WikiImportPanel } from "../components/imports/WikiImportPanel";
import { NoteEditor } from "../components/notes/NoteEditor";
import { NoteList } from "../components/notes/NoteList";
import { ProjectInlineForm } from "../components/projects/ProjectInlineForm";
import { OwnerTaskBoard } from "../components/tasks/OwnerTaskBoard";
import { ProjectTicketPanel } from "../components/tickets/ProjectTicketPanel";
import { CommentThread } from "../components/ui/CommentThread";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { DetailPageSkeleton, TaskListSkeleton } from "../components/ui/Skeleton";
import { TabBar, type Tab } from "../components/ui/TabBar";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useAttachments } from "../hooks/useAttachments";
import { useBacklog } from "../hooks/useBacklog";
import { useEntityComments } from "../hooks/useEntityComments";
import { useFeatures } from "../hooks/useFeatures";
import { useNotes } from "../hooks/useNotes";
import { useProjectFeatureLinks } from "../hooks/useDocLinks";
import { useProjects } from "../hooks/useProjects";
import { useTasks } from "../hooks/useTasks";
import { useTickets } from "../hooks/useTickets";
import { useWikiImport } from "../hooks/useWikiImport";
import type { ViewMode } from "../types";
import { formatHumanDate } from "../utils/date";
import { deriveProjectTaskStats } from "../utils/projectTaskStats";
import { richTextToPlainText } from "../utils/richText";

type ProjectTab = "details" | "features" | "tasks" | "tickets" | "comments" | "attachments" | "notes" | "backlog" | "import";

const tabs: Array<{ value: ProjectTab; label: string }> = [
  { value: "details", label: "Stammdaten" },
  { value: "features", label: "Features" },
  { value: "tasks", label: "Aufgaben" },
  { value: "tickets", label: "Tickets" },
  { value: "comments", label: "Kommentare" },
  { value: "attachments", label: "Dateien" },
  { value: "notes", label: "Notizen" },
  { value: "backlog", label: "Backlog" },
  { value: "import", label: "Import" }
];

export function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { project, loading: projectLoading, updateProject } = useProjects(projectId);
  const taskOwner = Number.isFinite(projectId) ? { type: "project" as const, id: projectId } : undefined;
  const tasks = useTasks(taskOwner);
  const projectTickets = useTickets(taskOwner ?? null);
  const allFeatures = useFeatures();
  const projectFeatureLinks = useProjectFeatureLinks(Number.isFinite(projectId) ? projectId : undefined);
  const backlog = useBacklog(Number.isFinite(projectId) ? projectId : undefined);
  const notes = useNotes(Number.isFinite(projectId) ? { type: "project", id: projectId } : null);
  const attachments = useAttachments(Number.isFinite(projectId) ? { type: "project", id: projectId } : null);
  const projectComments = useEntityComments("project", Number.isFinite(projectId) ? projectId : undefined);
  const wikiImport = useWikiImport(Number.isFinite(projectId) ? projectId : undefined);
  const [activeTab, setActiveTab] = useState<ProjectTab>("details");
  const [featureViewMode, setFeatureViewMode] = useState<ViewMode>("kanban");
  const [backlogFormOpen, setBacklogFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingBacklogItem, setEditingBacklogItem] = useState<BacklogItem | null>(null);
  const [featureFormOpen, setFeatureFormOpen] = useState(false);
  const [wikiImportSourcePath, setWikiImportSourcePath] = useState("");

  const openFeature = (feature: Feature) => navigate(`/features/${feature.id}`);

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

  const deleteAttachment = async (attachment: Attachment) => {
    const approved = await confirm({
      title: "Datei löschen?",
      body: attachment.originalName,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await attachments.removeAttachment(attachment.id);
      showToast({ tone: "success", title: "Datei gelöscht" });
    } catch (attachmentError) {
      showToast({ tone: "error", title: "Datei konnte nicht gelöscht werden", message: errorMessage(attachmentError) });
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

  const reloadFeatureRelations = async () => {
    await allFeatures.reload();
    await projectFeatureLinks.reload();
  };

  const submitProjectDetails = async (input: ProjectInput, tagIds: number[]) => {
    if (!project) {
      return;
    }

    try {
      await updateProject(project.id, input, tagIds);
      showToast({ tone: "success", title: "Projekt gespeichert" });
    } catch (projectError) {
      showToast({ tone: "error", title: "Projekt konnte nicht gespeichert werden", message: errorMessage(projectError) });
      throw projectError;
    }
  };

  const openCreateFeatureForm = () => {
    setFeatureFormOpen(true);
  };

  const submitFeatureForm = async (input: FeatureInput) => {
    try {
      const created = await allFeatures.createFeature(input);
      const linkedFeatureIds = projectFeatureLinks.features.map((feature) => feature.id);
      await projectFeatureLinks.setFeaturesForProject([...new Set([...linkedFeatureIds, created.id])]);
      await reloadFeatureRelations();
      showToast({ tone: "success", title: "Feature erstellt und verknüpft" });
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature konnte nicht gespeichert werden", message: errorMessage(featureError) });
      throw featureError;
    }
  };

  const submitBacklogItem = async (input: Parameters<typeof backlog.createItem>[0]) => {
    try {
      if (editingBacklogItem) {
        await backlog.updateItem(editingBacklogItem.id, input);
        showToast({ tone: "success", title: "Backlog-Item gespeichert" });
      } else {
        await backlog.createItem(input);
        showToast({ tone: "success", title: "Backlog-Item erstellt" });
      }
    } catch (backlogError) {
      showToast({ tone: "error", title: "Backlog-Item konnte nicht gespeichert werden", message: errorMessage(backlogError) });
      throw backlogError;
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
        await projectFeatureLinks.reload();
        await tasks.reload();
        showToast({ tone: "success", title: "Wiki importiert" });
      }
    } catch (importError) {
      showToast({ tone: "error", title: "Wiki-Import fehlgeschlagen", message: errorMessage(importError) });
    }
  };

  if (projectLoading) {
    return <DetailPageSkeleton />;
  }

  if (!project) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Projekt nicht gefunden</div>;
  }

  const taskDataAvailable = !tasks.loading && !tasks.error;
  const projectDescription = richTextToPlainText(project.description);
  const { totalTasks, doneTasks, openTasks, progress } = deriveProjectTaskStats(project, tasks.tasks, taskDataAvailable);
  const tabCounts: Record<ProjectTab, number> = {
    details: 0,
    features: projectFeatureLinks.features.length,
    tasks: openTasks,
    tickets: projectTickets.tickets.length,
    comments: projectComments.comments.length,
    attachments: attachments.attachments.length,
    notes: notes.notes.length,
    backlog: backlog.items.length,
    import: wikiImport.preview?.items.length ?? 0
  };
  const projectTabs: Array<Tab<ProjectTab>> = tabs.map((tab) => ({
    ...tab,
    count: tab.value === "details" ? undefined : tabCounts[tab.value]
  }));
  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-steel-700 via-steel-600 to-violet p-6 text-white shadow-steel">
        <div className="pointer-events-none absolute -right-20 -top-48 h-[480px] w-[480px] rounded-full bg-white/10 blur-sm" />
        <div className="relative grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <nav className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                <Link className="hover:text-white" to="/projects">
                  Projekte
                </Link>
                <ChevronRight size={16} />
                <span className="text-white">{project.name}</span>
              </nav>
              <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-normal text-white">{project.name}</h1>
              {projectDescription ? <p className="mt-1 max-w-[720px] text-[15px] leading-6 text-white/85">{projectDescription}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 border-t border-white/18 pt-5 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-widest text-white/60">Fortschritt</span>
              <span className="mt-1 block text-2xl font-bold text-white">{progress} %</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-widest text-white/60">Aufgaben</span>
              <span className="mt-1 block text-2xl font-bold text-white">
                {doneTasks} / {totalTasks}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-widest text-white/60">Offen</span>
              <span className="mt-1 block text-2xl font-bold text-white">{openTasks}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-widest text-white/60">Backlog</span>
              <span className="mt-1 block text-2xl font-bold text-white">{backlog.items.length}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-widest text-white/60">Aktualisiert</span>
              <span className="mt-1 block text-2xl font-bold text-white">{formatHumanDate(project.updatedAt)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-3 rounded-lg border border-line bg-white shadow-sm">
        <TabBar tabs={projectTabs} active={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === "details" ? <ProjectInlineForm project={project} onSubmit={submitProjectDetails} /> : null}

      {activeTab === "comments" ? (
        projectComments.loading ? (
          <TaskListSkeleton />
        ) : (
          <div className="grid gap-4">
            {projectComments.error ? <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{projectComments.error}</div> : null}
            <CommentThread
              comments={projectComments.comments}
              entityLabel="Projekt"
              onCreate={async (input) => {
                try {
                  await projectComments.createComment(input);
                  showToast({ tone: "success", title: "Kommentar erstellt" });
                } catch (commentError) {
                  showToast({ tone: "error", title: "Kommentar konnte nicht erstellt werden", message: errorMessage(commentError) });
                  throw commentError;
                }
              }}
              onDelete={async (id) => {
                try {
                  await projectComments.removeComment(id);
                  showToast({ tone: "success", title: "Kommentar gelöscht" });
                } catch (commentError) {
                  showToast({ tone: "error", title: "Kommentar konnte nicht gelöscht werden", message: errorMessage(commentError) });
                  throw commentError;
                }
              }}
            />
          </div>
        )
      ) : null}

      {activeTab === "tasks" && taskOwner ? <OwnerTaskBoard owner={taskOwner} /> : null}

      {activeTab === "tickets" ? <ProjectTicketPanel projectId={projectId} /> : null}

      {activeTab === "features" ? (
        projectFeatureLinks.loading ? (
          <TaskListSkeleton />
        ) : (
          <>
            {projectFeatureLinks.error ? <div className="text-sm text-crimson">{projectFeatureLinks.error}</div> : null}
            <ProjectFeaturePanel
              features={projectFeatureLinks.features}
              viewMode={featureViewMode}
              onViewModeChange={setFeatureViewMode}
              onCreate={openCreateFeatureForm}
              onOpen={openFeature}
            />
          </>
        )
      ) : null}

      {activeTab === "backlog" ? (
        backlog.loading || allFeatures.loading ? (
          <TaskListSkeleton />
        ) : (
          <BacklogListBoardView
            items={backlog.items}
            features={allFeatures.features}
            statusFilter={backlog.statusFilter}
            onStatusFilterChange={backlog.setStatusFilter}
            onCreate={() => {
              setEditingBacklogItem(null);
              setBacklogFormOpen(true);
            }}
            onEdit={(item) => {
              setEditingBacklogItem(item);
              setBacklogFormOpen(true);
            }}
            onDelete={(item) => void deleteBacklogItem(item)}
          />
        )
      ) : null}

      {activeTab === "import" ? (
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

      {activeTab === "notes" ? (
        notes.loading ? (
          <TaskListSkeleton />
        ) : (
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
                  void notes.removeNote(note.id)
                    .then(() => showToast({ tone: "success", title: "Notiz gelöscht" }))
                    .catch((noteError: unknown) => showToast({ tone: "error", title: "Notiz konnte nicht gelöscht werden", message: errorMessage(noteError) }));
                }
              });
            }}
          />
          <NoteEditor note={editingNote} open={Boolean(editingNote)} onSave={notes.updateNote} onClose={() => setEditingNote(null)} />
        </>
        )
      ) : null}

      {activeTab === "attachments" ? (
        attachments.loading ? (
          <TaskListSkeleton />
        ) : (
          <div className="grid gap-4">
            <AttachmentUploader onUpload={uploadAttachment} />
            <AttachmentList attachments={attachments.attachments} onDelete={(attachment) => void deleteAttachment(attachment)} />
          </div>
        )
      ) : null}

      <FeatureForm
        open={featureFormOpen}
        onSubmit={submitFeatureForm}
        onProjectLinksChanged={reloadFeatureRelations}
        onClose={() => {
          setFeatureFormOpen(false);
        }}
      />
      <BacklogItemForm
        open={backlogFormOpen}
        item={editingBacklogItem}
        features={allFeatures.features}
        onSubmit={submitBacklogItem}
        onClose={() => {
          setBacklogFormOpen(false);
          setEditingBacklogItem(null);
        }}
      />
    </div>
  );
}
