import type { TaskBoardItem, TaskStatus } from "@taskmanager/shared-types";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { TaskOwner } from "../../api/tasks";
import { errorMessage } from "../../hooks/errors";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useTasks } from "../../hooks/useTasks";
import { useViewMode } from "../../hooks/useViewMode";
import { resolveCatalogEntryKey } from "../../utils/catalogs";
import { OwnerRelationBoard } from "../ui/OwnerRelationBoard";
import { useToast } from "../ui/ToastProvider";
import { TaskLinkDialog } from "./TaskLinkDialog";
import { TaskListBoardView } from "./TaskListBoardView";

interface OwnerTaskBoardProps {
  owner: TaskOwner;
}

export function OwnerTaskBoard({ owner }: OwnerTaskBoardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const taskController = useTasks(owner);
  const catalogs = useCatalogs();
  const { viewMode, setViewMode } = useViewMode();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const returnTo = `${location.pathname}${location.search}`;
  const defaultStatus = resolveCatalogEntryKey(catalogs.entries, "workStatus", "active", "active") ?? "active";

  const openTaskForm = (status: TaskStatus = defaultStatus) => {
    const resolvedStatus = resolveCatalogEntryKey(catalogs.entries, "workStatus", status, "active") ?? defaultStatus;
    navigate(`/tasks/new?ownerType=${owner.type}&ownerId=${owner.id}&status=${resolvedStatus}&returnTo=${encodeURIComponent(returnTo)}`);
  };

  const updateTaskStatus = async (task: TaskBoardItem, status: TaskStatus) => {
    try {
      await taskController.updateTaskStatus(task.id, status, task.version);
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabenstatus konnte nicht geändert werden", message: errorMessage(taskError) });
      throw taskError;
    }
  };

  const updateTaskDueDate = async (task: TaskBoardItem, dueDate: string | null) => {
    try {
      await taskController.updateTask(task.id, { dueDate, expectedVersion: task.version });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabendatum konnte nicht geändert werden", message: errorMessage(taskError) });
      throw taskError;
    }
  };

  return (
    <>
      <OwnerRelationBoard<TaskBoardItem>
        items={taskController.tasks}
        loading={taskController.loading}
        onCreateItem={(status) => openTaskForm(status ?? defaultStatus)}
        onLinkItem={() => setLinkDialogOpen(true)}
        onUnlinkItem={(task) => taskController.unlinkTask(task.id)}
        onOpenItem={(task) => navigate(`/tasks/${task.id}?returnTo=${encodeURIComponent(returnTo)}`)}
        confirmUnlinkTitle={() => "Zuordnung entfernen?"}
        confirmUnlinkBody={(task) => `Die Aufgabe "${task.title}" wird nur aus diesem Bereich entfernt.`}
        renderListBoardView={(props) => (
          <TaskListBoardView
            tasks={props.items}
            loading={props.loading}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onAdd={props.onAdd}
            onAddStatus={(status) => props.onAddStatus?.(status)}
            onOpen={(task) => props.onOpen(task as TaskBoardItem)}
            onDelete={(task) => props.onDelete(task as TaskBoardItem)}
            onStatusChange={(task, status) => updateTaskStatus(task as TaskBoardItem, status)}
            onDueDateChange={(task, dueDate) => updateTaskDueDate(task as TaskBoardItem, dueDate)}
            linkAction={props.linkAction}
          />
        )}
      />

      <TaskLinkDialog
        open={linkDialogOpen}
        owner={owner}
        currentTasks={taskController.tasks}
        onLink={async (task) => {
          try {
            await taskController.linkTask(task.id);
            showToast({ tone: "success", title: "Aufgabe verknüpft" });
          } catch (taskError) {
            showToast({ tone: "error", title: "Aufgabe konnte nicht verknüpft werden", message: errorMessage(taskError) });
            throw taskError;
          }
        }}
        onClose={() => setLinkDialogOpen(false)}
      />
    </>
  );
}
