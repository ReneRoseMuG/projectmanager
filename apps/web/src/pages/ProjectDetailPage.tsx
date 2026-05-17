import type { Attachment, BacklogItem, Feature, FeatureInput, Note, Task, TaskStatus } from "@taskmanager/shared-types";
import { ChevronRight, Filter, MoreHorizontal, Plus } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { AttachmentList } from "../components/attachments/AttachmentList";
import { AttachmentUploader } from "../components/attachments/AttachmentUploader";
import { BacklogItemForm } from "../components/backlog/BacklogItemForm";
import { BacklogList } from "../components/backlog/BacklogList";
import { FeatureForm } from "../components/features/FeatureForm";
import { ProjectFeaturePanel } from "../components/features/ProjectFeaturePanel";
import { WikiImportPanel } from "../components/imports/WikiImportPanel";
import { NoteEditor } from "../components/notes/NoteEditor";
import { NoteList } from "../components/notes/NoteList";
import { KanbanBoard } from "../components/tasks/KanbanBoard";
import { TaskDetail } from "../components/tasks/TaskDetail";
import { TaskForm } from "../components/tasks/TaskForm";
import { TaskList } from "../components/tasks/TaskList";
import { Button } from "../components/ui/Button";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { DetailPageSkeleton, KanbanSkeleton, TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { ViewToggle } from "../components/ui/ViewToggle";
import { getFeature } from "../api/features";
import { errorMessage } from "../hooks/errors";
import { useAttachments } from "../hooks/useAttachments";
import { useBacklog } from "../hooks/useBacklog";
import { useFeatures } from "../hooks/useFeatures";
import { useNotes } from "../hooks/useNotes";
import { useProjectFeatureLinks } from "../hooks/useDocLinks";
import { useProjects } from "../hooks/useProjects";
import { useTasks } from "../hooks/useTasks";
import { useViewMode } from "../hooks/useViewMode";
import { useWikiImport } from "../hooks/useWikiImport";
import type { ViewMode } from "../types";
import { formatHumanDate } from "../utils/date";

type ProjectTab = "tasks" | "features" | "backlog" | "import" | "notes" | "attachments";

const tabs: Array<{ value: ProjectTab; label: string }> = [
  { value: "tasks", label: "Aufgaben" },
  { value: "features", label: "Features" },
  { value: "backlog", label: "Backlog" },
  { value: "notes", label: "Notizen" },
  { value: "attachments", label: "Dateien" },
  { value: "import", label: "Import" }
];

const activeTabActionLabels: Record<ProjectTab, string> = {
  tasks: "Neue Aufgabe",
  features: "Neues Feature",
  backlog: "Neues Item",
  notes: "Neue Notiz",
  attachments: "Dateien hochladen",
  import: "Import prüfen"
};

export function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { project, loading: projectLoading } = useProjects(projectId);
  const tasks = useTasks(projectId);
  const allFeatures = useFeatures();
  const projectFeatureLinks = useProjectFeatureLinks(Number.isFinite(projectId) ? projectId : undefined);
  const backlog = useBacklog(Number.isFinite(projectId) ? projectId : undefined);
  const notes = useNotes(Number.isFinite(projectId) ? { type: "project", id: projectId } : null);
  const attachments = useAttachments(Number.isFinite(projectId) ? { type: "project", id: projectId } : null);
  const wikiImport = useWikiImport(Number.isFinite(projectId) ? projectId : undefined);
  const { viewMode, setViewMode } = useViewMode();
  const [activeTab, setActiveTab] = useState<ProjectTab>("tasks");
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [backlogFormOpen, setBacklogFormOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingBacklogItem, setEditingBacklogItem] = useState<BacklogItem | null>(null);
  const [featureViewMode, setFeatureViewMode] = useState<ViewMode>("kanban");
  const [featureFormOpen, setFeatureFormOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [wikiImportSourcePath, setWikiImportSourcePath] = useState("");

  const openTask = (task: Task) => setDetailTaskId(task.id);

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

  const deleteTask = async (task: Task) => {
    const approved = await confirm({
      title: "Aufgabe löschen?",
      body: `Die Aufgabe "${task.title}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await tasks.removeTask(task.id);
      showToast({ tone: "success", title: "Aufgabe gelöscht" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabe konnte nicht gelöscht werden", message: errorMessage(taskError) });
    }
  };

  const reloadFeatureRelations = async () => {
    await allFeatures.reload();
    await projectFeatureLinks.reload();
  };

  const openCreateFeatureForm = () => {
    setEditingFeature(null);
    setFeatureFormOpen(true);
  };

  const openFeatureForm = async (feature: Feature) => {
    try {
      setEditingFeature(await getFeature(feature.id));
      setFeatureFormOpen(true);
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature konnte nicht geladen werden", message: errorMessage(featureError) });
    }
  };

  const submitFeatureForm = async (input: FeatureInput) => {
    try {
      if (editingFeature) {
        await allFeatures.updateFeature(editingFeature.id, input);
        await reloadFeatureRelations();
        showToast({ tone: "success", title: "Feature gespeichert" });
        return;
      }

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

  const loadedTaskCount = tasks.tasks.length;
  const totalTasks = loadedTaskCount > 0 ? loadedTaskCount : project.totalTaskCount;
  const doneTasks = loadedTaskCount > 0 ? tasks.tasks.filter((task) => task.status === "done").length : project.doneTaskCount;
  const openTasks = loadedTaskCount > 0 ? tasks.tasks.filter((task) => task.status !== "done").length : project.openTaskCount;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const tabCounts: Record<ProjectTab, number> = {
    tasks: openTasks,
    features: projectFeatureLinks.features.length,
    backlog: backlog.items.length,
    notes: notes.notes.length,
    attachments: attachments.attachments.length,
    import: wikiImport.preview?.items.length ?? 0
  };

  const runActiveTabAction = () => {
    if (activeTab === "tasks") {
      setTaskFormOpen(true);
      return;
    }
    if (activeTab === "features") {
      openCreateFeatureForm();
      return;
    }
    if (activeTab === "backlog") {
      setEditingBacklogItem(null);
      setBacklogFormOpen(true);
      return;
    }
    if (activeTab === "notes") {
      void createNote();
      return;
    }
    if (activeTab === "import") {
      void previewWikiImport();
      return;
    }
    setActiveTab("attachments");
  };

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
              <p className="mt-1 max-w-[720px] text-[15px] leading-6 text-white/85">{project.description || "Keine Beschreibung"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                aria-label="Mehr Optionen"
                title="Mehr Optionen"
                className="border border-white/20 bg-white/10 text-white hover:bg-white/20"
                icon={<MoreHorizontal size={16} />}
                variant="ghost"
              />
              <Button className="bg-white text-steel-700 hover:bg-steel-50" icon={<Plus size={16} />} variant="ghost" onClick={runActiveTabAction}>
                {activeTabActionLabels[activeTab]}
              </Button>
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

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1 shadow-sm" role="tablist">
          {tabs.map((tab) => {
            const selected = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                  selected ? "bg-steel-700 text-white shadow-sm" : "text-slate-600 hover:bg-shell hover:text-ink"
                }`}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${selected ? "bg-white/18 text-white" : "bg-steel-100 text-slate-500"}`}>{tabCounts[tab.value]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "tasks" ? (
            <>
              <ViewToggle value={viewMode} onChange={setViewMode} />
              <Button icon={<Filter size={15} />}>Filter</Button>
            </>
          ) : null}
          {activeTab !== "tasks" ? (
            <Button variant="primary" icon={<Plus size={16} />} onClick={runActiveTabAction}>
              {activeTabActionLabels[activeTab]}
            </Button>
          ) : null}
        </div>
      </div>

      {activeTab === "tasks" ? (
        tasks.loading ? (
          viewMode === "list" ? <TaskListSkeleton /> : <KanbanSkeleton />
        ) : viewMode === "list" ? (
          <TaskList
            tasks={tasks.tasks}
            onOpen={openTask}
            onDelete={(task) => void deleteTask(task)}
          />
        ) : (
          <KanbanBoard
            tasks={tasks.tasks}
            onOpen={openTask}
            onDelete={(task) => void deleteTask(task)}
            onMove={async (task, status: TaskStatus, position) => {
              try {
                await tasks.updateTaskPosition(task.id, { status, position });
                showToast({ tone: "success", title: "Aufgabe verschoben" });
              } catch (taskError) {
                showToast({ tone: "error", title: "Aufgabe konnte nicht verschoben werden", message: errorMessage(taskError) });
                throw taskError;
              }
            }}
          />
        )
      ) : null}

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
              onOpen={(feature) => void openFeatureForm(feature)}
            />
          </>
        )
      ) : null}

      {activeTab === "backlog" ? (
        backlog.loading || allFeatures.loading ? (
          <TaskListSkeleton />
        ) : (
          <BacklogList
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

      <TaskForm
        open={taskFormOpen}
        title="Neue Aufgabe"
        onSubmit={async (input) => {
          try {
            await tasks.createTask(input);
            showToast({ tone: "success", title: "Aufgabe erstellt" });
          } catch (taskError) {
            showToast({ tone: "error", title: "Aufgabe konnte nicht erstellt werden", message: errorMessage(taskError) });
            throw taskError;
          }
        }}
        onClose={() => setTaskFormOpen(false)}
      />
      <FeatureForm
        open={featureFormOpen}
        feature={editingFeature}
        onSubmit={submitFeatureForm}
        onProjectLinksChanged={reloadFeatureRelations}
        onClose={() => {
          setFeatureFormOpen(false);
          setEditingFeature(null);
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
      <TaskDetail
        open={Boolean(detailTaskId)}
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
        onChanged={async () => {
          await tasks.reload();
        }}
      />
    </div>
  );
}
