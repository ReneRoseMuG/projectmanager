import type { Attachment, BacklogItem, Note, Task, TaskStatus } from "@taskmanager/shared-types";
import { ChevronRight, Plus } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { AttachmentList } from "../components/attachments/AttachmentList";
import { AttachmentUploader } from "../components/attachments/AttachmentUploader";
import { BacklogItemForm } from "../components/backlog/BacklogItemForm";
import { BacklogList } from "../components/backlog/BacklogList";
import { FeaturePicker } from "../components/features/FeaturePicker";
import { NoteEditor } from "../components/notes/NoteEditor";
import { NoteList } from "../components/notes/NoteList";
import { KanbanBoard } from "../components/tasks/KanbanBoard";
import { TaskDetail } from "../components/tasks/TaskDetail";
import { TaskForm } from "../components/tasks/TaskForm";
import { TaskList } from "../components/tasks/TaskList";
import { Button } from "../components/ui/Button";
import { DetailPageSkeleton, KanbanSkeleton, TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { ViewToggle } from "../components/ui/ViewToggle";
import { errorMessage } from "../hooks/errors";
import { useAttachments } from "../hooks/useAttachments";
import { useBacklog } from "../hooks/useBacklog";
import { useFeatures } from "../hooks/useFeatures";
import { useNotes } from "../hooks/useNotes";
import { useProjectFeatureLinks } from "../hooks/useDocLinks";
import { useProjects } from "../hooks/useProjects";
import { useTasks } from "../hooks/useTasks";
import { useViewMode } from "../hooks/useViewMode";

type ProjectTab = "tasks" | "features" | "backlog" | "notes" | "attachments";

const tabs: Array<{ value: ProjectTab; label: string }> = [
  { value: "tasks", label: "Aufgaben" },
  { value: "features", label: "Features" },
  { value: "backlog", label: "Backlog" },
  { value: "notes", label: "Notizen" },
  { value: "attachments", label: "Dateien" }
];

export function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const { showToast } = useToast();
  const { project, loading: projectLoading } = useProjects(projectId);
  const tasks = useTasks(projectId);
  const allFeatures = useFeatures();
  const projectFeatureLinks = useProjectFeatureLinks(Number.isFinite(projectId) ? projectId : undefined);
  const backlog = useBacklog(Number.isFinite(projectId) ? projectId : undefined);
  const notes = useNotes(Number.isFinite(projectId) ? { type: "project", id: projectId } : null);
  const attachments = useAttachments(Number.isFinite(projectId) ? { type: "project", id: projectId } : null);
  const { viewMode, setViewMode } = useViewMode();
  const [activeTab, setActiveTab] = useState<ProjectTab>("tasks");
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [backlogFormOpen, setBacklogFormOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingBacklogItem, setEditingBacklogItem] = useState<BacklogItem | null>(null);
  const [selectedProjectFeatureIds, setSelectedProjectFeatureIds] = useState<number[]>([]);

  const openTask = (task: Task) => setDetailTaskId(task.id);

  useEffect(() => {
    setSelectedProjectFeatureIds(projectFeatureLinks.features.map((feature) => feature.id));
  }, [projectFeatureLinks.features]);

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
    if (window.confirm("Datei löschen?")) {
      try {
        await attachments.removeAttachment(attachment.id);
        showToast({ tone: "success", title: "Datei gelöscht" });
      } catch (attachmentError) {
        showToast({ tone: "error", title: "Datei konnte nicht gelöscht werden", message: errorMessage(attachmentError) });
      }
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
    if (!window.confirm("Aufgabe löschen?")) {
      return;
    }
    try {
      await tasks.removeTask(task.id);
      showToast({ tone: "success", title: "Aufgabe gelöscht" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabe konnte nicht gelöscht werden", message: errorMessage(taskError) });
    }
  };

  const saveProjectFeatures = async () => {
    try {
      await projectFeatureLinks.setFeaturesForProject(selectedProjectFeatureIds);
      showToast({ tone: "success", title: "Features gespeichert" });
    } catch (featureError) {
      showToast({ tone: "error", title: "Features konnten nicht gespeichert werden", message: errorMessage(featureError) });
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
    if (!window.confirm("Backlog-Item löschen?")) {
      return;
    }
    try {
      await backlog.removeItem(item.id);
      showToast({ tone: "success", title: "Backlog-Item gelöscht" });
    } catch (backlogError) {
      showToast({ tone: "error", title: "Backlog-Item konnte nicht gelöscht werden", message: errorMessage(backlogError) });
    }
  };

  if (projectLoading) {
    return <DetailPageSkeleton />;
  }

  if (!project) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Projekt nicht gefunden</div>;
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="grid gap-4">
        <nav className="flex items-center gap-2 text-sm text-slate-600">
          <Link className="hover:text-teal" to="/projects">
            Projekte
          </Link>
          <ChevronRight size={16} />
          <span className="text-ink">{project.name}</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{project.name}</h1>
            <p className="text-sm text-slate-600">{project.description || "Keine Beschreibung"}</p>
          </div>
          {activeTab === "tasks" ? (
            <div className="flex items-center gap-2">
              <ViewToggle value={viewMode} onChange={setViewMode} />
              <Button variant="primary" icon={<Plus size={17} />} onClick={() => setTaskFormOpen(true)}>
                Neue Aufgabe
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`h-9 rounded-md px-3 text-sm font-medium ${activeTab === tab.value ? "bg-ink text-white" : "hover:bg-line/50"}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
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
        allFeatures.loading || projectFeatureLinks.loading ? (
          <TaskListSkeleton />
        ) : (
          <section className="grid gap-4 rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">Projekt-Features</h2>
                <p className="text-sm text-slate-600">{projectFeatureLinks.features.length} verknüpft</p>
              </div>
              <Button variant="primary" onClick={() => void saveProjectFeatures()}>
                Speichern
              </Button>
            </div>
            {projectFeatureLinks.error ? <div className="text-sm text-coral">{projectFeatureLinks.error}</div> : null}
            <FeaturePicker features={allFeatures.features} selectedIds={selectedProjectFeatureIds} onChange={setSelectedProjectFeatureIds} />
          </section>
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
              if (window.confirm("Notiz löschen?")) {
                void notes.removeNote(note.id)
                  .then(() => showToast({ tone: "success", title: "Notiz gelöscht" }))
                  .catch((noteError: unknown) => showToast({ tone: "error", title: "Notiz konnte nicht gelöscht werden", message: errorMessage(noteError) }));
              }
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
