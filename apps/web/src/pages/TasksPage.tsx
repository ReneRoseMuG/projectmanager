import type { Task, TaskBoardItem, TaskStatus } from "@taskmanager/shared-types";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { TaskListBoardView } from "../components/tasks/TaskListBoardView";
import { PageHero } from "../components/ui/PageHero";
import { ProjectMilestoneFilterBar } from "../components/ui/ProjectMilestoneFilterBar";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useCatalogs } from "../hooks/useCatalogs";
import { useGlobalTasks, useTasks } from "../hooks/useTasks";
import { useMilestones } from "../hooks/useMilestones";
import { useProjects } from "../hooks/useProjects";
import { useStandaloneView } from "../hooks/useStandaloneView";
import { useViewMode } from "../hooks/useViewMode";
import { resolveCatalogEntryKey } from "../utils/catalogs";
import { withStandaloneView } from "../utils/standalone";
import type { TaskOwner } from "../api/tasks";

function parseId(value: string | null): number | null {
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function setOptionalId(params: URLSearchParams, key: string, value: number | null): void {
  if (value) {
    params.set(key, String(value));
    return;
  }
  params.delete(key);
}

export function TasksPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const standalone = useStandaloneView();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const projects = useProjects();
  const milestones = useMilestones();
  const projectId = parseId(searchParams.get("projectId"));
  const milestoneId = parseId(searchParams.get("milestoneId"));
  const owner: TaskOwner | null = milestoneId
    ? { type: "milestone", id: milestoneId }
    : projectId
      ? { type: "project", id: projectId }
      : null;
  const globalTasks = useGlobalTasks(owner === null);
  const ownerTasks = useTasks(owner);
  const catalogs = useCatalogs();
  const { viewMode, setViewMode } = useViewMode("kanban", "taskBoard.viewMode");
  const tasks = owner ? ownerTasks.tasks : globalTasks.tasks;
  const loading = projects.loading || milestones.loading || (owner ? ownerTasks.loading : globalTasks.loading);
  const error = projects.error ?? milestones.error ?? (owner ? ownerTasks.error : globalTasks.error);
  const currentReturnTo = `${location.pathname}${location.search}`;
  const targetForMode = (to: string) => (standalone ? withStandaloneView(to) : to);
  const defaultStatus = resolveCatalogEntryKey(catalogs.entries, "workStatus", "active", "active") ?? "active";

  const updateProjectFilter = (nextProjectId: number | null) => {
    const nextParams = new URLSearchParams(searchParams);
    setOptionalId(nextParams, "projectId", nextProjectId);
    nextParams.delete("milestoneId");
    setSearchParams(nextParams);
  };

  const updateMilestoneFilter = (nextMilestoneId: number | null) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("projectId");
    setOptionalId(nextParams, "milestoneId", nextMilestoneId);
    setSearchParams(nextParams);
  };

  const openTask = (task: Task) => {
    const params = new URLSearchParams({ returnTo: currentReturnTo });
    navigate(targetForMode(`/tasks/${task.id}?${params.toString()}`));
  };

  const openCreate = (status: TaskStatus = defaultStatus) => {
    if (!owner) {
      return;
    }
    const params = new URLSearchParams({
      ownerType: owner.type,
      ownerId: String(owner.id),
      status,
      returnTo: currentReturnTo,
    });
    navigate(targetForMode(`/tasks/new?${params.toString()}`));
  };

  const deleteTask = async (task: TaskBoardItem) => {
    const approved = await confirm({
      title: "Aufgabe löschen?",
      body: task.title,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return;
    }
    try {
      if (owner) {
        await ownerTasks.removeTask(task.id);
      } else {
        await globalTasks.removeTask(task.id);
      }
      showToast({ tone: "success", title: "Aufgabe gelöscht" });
    } catch (taskError) {
      showToast({
        tone: "error",
        title: "Aufgabe konnte nicht gelöscht werden",
        message: errorMessage(taskError),
      });
    }
  };

  const updateTaskStatus = async (task: TaskBoardItem, status: TaskStatus) => {
    try {
      if (owner) {
        await ownerTasks.updateTaskStatus(task.id, status, task.version);
      } else {
        await globalTasks.updateTask(task.id, { status, expectedVersion: task.version });
      }
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabenstatus konnte nicht geändert werden", message: errorMessage(taskError) });
      throw taskError;
    }
  };

  const updateTaskDueDate = async (task: TaskBoardItem, dueDate: string | null) => {
    try {
      const input = { dueDate, expectedVersion: task.version };
      if (owner) {
        await ownerTasks.updateTask(task.id, input);
      } else {
        await globalTasks.updateTask(task.id, input);
      }
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabendatum konnte nicht geändert werden", message: errorMessage(taskError) });
      throw taskError;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="list"
        title="Aufgaben"
        subtitle={`${tasks.length} Einträge`}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        {error ? (
          <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">
            {error}
          </div>
        ) : null}

        <TaskListBoardView
          tasks={tasks}
          loading={loading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAdd={() => openCreate()}
          onAddStatus={openCreate}
          onOpen={openTask}
          onDelete={(task) => void deleteTask(task as TaskBoardItem)}
          onStatusChange={(task, status) => updateTaskStatus(task as TaskBoardItem, status)}
          onDueDateChange={(task, dueDate) => updateTaskDueDate(task as TaskBoardItem, dueDate)}
          showCreateActions={owner !== null}
          filters={
            <ProjectMilestoneFilterBar
              projects={projects.projects}
              milestones={milestones.milestones}
              projectId={milestoneId ? null : projectId}
              milestoneId={milestoneId}
              onProjectChange={updateProjectFilter}
              onMilestoneChange={updateMilestoneFilter}
            />
          }
        />
      </div>
    </div>
  );
}
