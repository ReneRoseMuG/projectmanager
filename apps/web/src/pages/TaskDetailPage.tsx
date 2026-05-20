import type { Task, TaskBoardItem, TaskStatus } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { uploadTaskAttachment } from "../api/attachments";
import { createEntityComment } from "../api/comments";
import { createTaskNote } from "../api/notes";
import { createSubtask, type TaskOwner } from "../api/tasks";
import { setTaskTags } from "../api/tags";
import { createOwnerTicket, linkOwnerTicket } from "../api/tickets";
import { TaskForm, type TaskFormInput } from "../components/tasks/TaskForm";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useTaskDetail } from "../hooks/useTaskDetail";
import { useTasks } from "../hooks/useTasks";
import { invalidateTags } from "../queries/invalidation";

function parseTaskOwner(searchParams: URLSearchParams): TaskOwner | undefined {
  const ownerType = searchParams.get("ownerType");
  const ownerIdParam = searchParams.get("ownerId");
  const ownerId = ownerIdParam ? Number(ownerIdParam) : NaN;
  if ((ownerType === "project" || ownerType === "milestone" || ownerType === "feature" || ownerType === "useCase") && Number.isFinite(ownerId)) {
    return { type: ownerType, id: ownerId };
  }
  return undefined;
}

function parseTaskStatus(value: string | null): TaskStatus {
  if (value === "in_progress" || value === "done") {
    return value;
  }
  return "todo";
}

export function TaskDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isCreateMode = params.id === undefined;
  const taskId = isCreateMode ? null : Number(params.id);
  const owner = parseTaskOwner(searchParams);
  const taskController = useTasks(owner);
  const detail = useTaskDetail(!isCreateMode && Number.isFinite(taskId) ? taskId : null);
  const [savingLabel, setSavingLabel] = useState<string | undefined>();
  const returnTo = searchParams.get("returnTo") ?? (owner ? `/${owner.type === "useCase" ? "use-cases" : `${owner.type}s`}/${owner.id}` : "/projects");

  const closePage = () => navigate(returnTo);

  const submitTask = async (input: TaskFormInput): Promise<Task | void> => {
    const { tagIds, pendingSubtasks, pendingTickets, pendingComments, pendingNotes, pendingFiles, ...taskInput } = input;

    if (!isCreateMode && detail.task) {
      try {
        const updated = await taskController.updateTask(detail.task.id, { ...taskInput, expectedVersion: detail.task.version });
        await setTaskTags(detail.task.id, tagIds);
        await invalidateTags(queryClient);
        await detail.reload();
        showToast({ tone: "success", title: "Aufgabe gespeichert" });
        return updated ?? detail.task;
      } catch (taskError) {
        showToast({ tone: "error", title: "Aufgabe konnte nicht gespeichert werden", message: errorMessage(taskError) });
        throw taskError;
      }
    }

    if (!owner) {
      throw new Error("Aufgaben benötigen einen Parent-Kontext.");
    }

    let created: TaskBoardItem | null = null;
    try {
      created = await taskController.createTask(taskInput);
      if (!created) {
        throw new Error("Aufgabe konnte nicht erstellt werden");
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

      for (let index = 0; index < pendingFiles.length; index += 1) {
        const file = pendingFiles[index];
        if (!file) {
          continue;
        }
        setSavingLabel(`Speichern… (Datei ${index + 1} von ${pendingFiles.length})`);
        await uploadTaskAttachment(created.id, file.file);
      }

      showToast({ tone: "success", title: "Aufgabe erstellt" });
      navigate(`/tasks/${created.id}?returnTo=${encodeURIComponent(returnTo)}`);
      return created;
    } catch (taskError) {
      showToast({ tone: "error", title: created ? "Aufgabe wurde erstellt, aber nicht alle Zuordnungen konnten gespeichert werden" : "Aufgabe konnte nicht erstellt werden", message: errorMessage(taskError) });
      throw taskError;
    } finally {
      setSavingLabel(undefined);
    }
  };

  if (isCreateMode && !owner) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Aufgaben benötigen einen Parent-Kontext.</div>;
  }

  if (!isCreateMode && !Number.isFinite(taskId)) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Aufgabe nicht gefunden</div>;
  }

  if (!isCreateMode && detail.loading) {
    return <DetailPageSkeleton />;
  }

  if (!isCreateMode && !detail.task) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Aufgabe nicht gefunden</div>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <TaskForm
        open
        task={detail.task}
        initialStatus={parseTaskStatus(searchParams.get("status"))}
        variant="page"
        savingLabel={savingLabel}
        onSubmit={submitTask}
        onClose={closePage}
        onChanged={detail.reload}
      />
    </div>
  );
}
