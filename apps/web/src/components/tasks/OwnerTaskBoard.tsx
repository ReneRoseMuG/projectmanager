import type { Task, TaskBoardItem, TaskStatus } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createEntityComment } from "../../api/comments";
import { createTaskNote } from "../../api/notes";
import { createSubtask, type TaskOwner } from "../../api/tasks";
import { setTaskTags } from "../../api/tags";
import { createOwnerTicket, linkOwnerTicket } from "../../api/tickets";
import { uploadTaskAttachment } from "../../api/attachments";
import { errorMessage } from "../../hooks/errors";
import { useTasks } from "../../hooks/useTasks";
import { useViewMode } from "../../hooks/useViewMode";
import { invalidateTags } from "../../queries/invalidation";
import { OwnerRelationBoard } from "../ui/OwnerRelationBoard";
import { useToast } from "../ui/ToastProvider";
import { TaskLinkDialog } from "./TaskLinkDialog";
import { TaskListBoardView } from "./TaskListBoardView";
import { TaskModal, type TaskModalInput } from "./TaskModal";

interface OwnerTaskBoardProps {
  owner: TaskOwner;
}

export function OwnerTaskBoard({ owner }: OwnerTaskBoardProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const taskController = useTasks(owner);
  const { viewMode, setViewMode } = useViewMode();
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("todo");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [savingLabel, setSavingLabel] = useState<string | undefined>();

  const openTaskForm = (status: TaskStatus = "todo") => {
    setEditingTask(null);
    setNewTaskStatus(status);
    setTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setTaskModalOpen(false);
    setEditingTask(null);
    setSavingLabel(undefined);
  };

  const submitTaskModal = async (input: TaskModalInput): Promise<Task | void> => {
    const { tagIds, pendingSubtasks, pendingTickets, pendingComments, pendingNotes, pendingFiles, ...taskInput } = input;

    if (editingTask) {
      try {
        const updated = await taskController.updateTask(editingTask.id, taskInput);
        await setTaskTags(editingTask.id, tagIds);
        await invalidateTags(queryClient);
        await taskController.reload();
        showToast({ tone: "success", title: "Aufgabe gespeichert" });
        return updated ?? editingTask;
      } catch (taskError) {
        showToast({ tone: "error", title: "Aufgabe konnte nicht gespeichert werden", message: errorMessage(taskError) });
        throw taskError;
      }
    }

    let created: TaskBoardItem | null = null;
    try {
      created = await taskController.createTask(taskInput);
      if (!created) {
        throw new Error("Aufgabe konnte nicht erstellt werden");
      }
      setEditingTask(created);

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

      for (let index = 0; index < pendingFiles.length; index += 1) {
        const file = pendingFiles[index];
        if (!file) {
          continue;
        }
        setSavingLabel(`Speichern… (Datei ${index + 1} von ${pendingFiles.length})`);
        await uploadTaskAttachment(created.id, file.file);
      }

      await taskController.reload();
      showToast({ tone: "success", title: "Aufgabe erstellt" });
      return created;
    } catch (taskError) {
      if (created) {
        setEditingTask(created);
        await taskController.reload();
        showToast({ tone: "error", title: "Aufgabe wurde erstellt, aber nicht alle Zuordnungen konnten gespeichert werden", message: errorMessage(taskError) });
      } else {
        showToast({ tone: "error", title: "Aufgabe konnte nicht erstellt werden", message: errorMessage(taskError) });
      }
      throw taskError;
    } finally {
      setSavingLabel(undefined);
    }
  };

  return (
    <>
      <OwnerRelationBoard<TaskBoardItem>
        items={taskController.tasks}
        loading={taskController.loading}
        onCreateItem={(status) => openTaskForm(toTaskStatus(status))}
        onLinkItem={() => setLinkDialogOpen(true)}
        onUnlinkItem={(task) => taskController.unlinkTask(task.id)}
        onOpenItem={(task) => {
          setEditingTask(task);
          setTaskModalOpen(true);
        }}
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
            linkAction={props.linkAction}
          />
        )}
      />

      <TaskModal
        open={taskModalOpen}
        task={editingTask}
        initialStatus={newTaskStatus}
        savingLabel={savingLabel}
        onSubmit={submitTaskModal}
        onClose={closeTaskModal}
        onChanged={taskController.reload}
      />

      <TaskLinkDialog
        open={linkDialogOpen}
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

function toTaskStatus(status?: string): TaskStatus {
  if (status === "in_progress" || status === "done") {
    return status;
  }
  return "todo";
}
