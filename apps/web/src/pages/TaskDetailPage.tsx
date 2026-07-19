import type {
  Task,
  TaskBoardItem,
  TaskStatus,
} from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { uploadTaskAttachment } from "../api/attachments";
import { createEntityComment } from "../api/comments";
import { createTaskNote } from "../api/notes";
import { createSubtask, type TaskOwner } from "../api/tasks";
import { setTaskTags } from "../api/tags";
import { createOwnerTicket, linkOwnerTicket } from "../api/tickets";
import { TaskForm, type TaskFormInput } from "../components/tasks/TaskForm";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useTaskDetail } from "../hooks/useTaskDetail";
import { useTasks } from "../hooks/useTasks";
import { invalidateTags } from "../queries/invalidation";
import { withStandaloneView } from "../utils/standalone";

function parseTaskOwner(searchParams: URLSearchParams): TaskOwner | undefined {
  const ownerType = searchParams.get("ownerType");
  const ownerIdParam = searchParams.get("ownerId");
  const ownerId = ownerIdParam ? Number(ownerIdParam) : NaN;
  if (
    (ownerType === "project" ||
      ownerType === "milestone" ||
      ownerType === "feature" ||
      ownerType === "useCase") &&
    Number.isFinite(ownerId)
  ) {
    return { type: ownerType, id: ownerId };
  }
  return undefined;
}

function parseTaskStatus(value: string | null): TaskStatus {
  return value && value.trim().length > 0 ? value : "active";
}

export function TaskDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const isCreateMode = params.id === undefined;
  const taskId = isCreateMode ? null : Number(params.id);
  const owner = parseTaskOwner(searchParams);
  const taskController = useTasks(owner);
  const detail = useTaskDetail(
    !isCreateMode && Number.isFinite(taskId) ? taskId : null,
  );
  useDocumentTitle(isCreateMode ? "[Auf.] Neu" : detail.task ? `[Auf.] ${detail.task.title}` : "[Auf.]");
  const [savingLabel, setSavingLabel] = useState<string | undefined>();
  const returnTo =
    searchParams.get("returnTo") ??
    (searchParams.get("standalone") === "1"
      ? withStandaloneView("/tasks")
      : owner
      ? `/${owner.type === "useCase" ? "use-cases" : `${owner.type}s`}/${owner.id}`
      : "/projects");

  const closePage = () => navigate(returnTo);
  const openInTab =
    !isCreateMode && taskId !== null && Number.isFinite(taskId)
      ? () => {
          window.open(withStandaloneView(`/tasks/${taskId}`), "_blank");
          navigate(returnTo);
        }
      : undefined;

  const autoSaveTask = useCallback(async (input: TaskFormInput): Promise<void> => {
    if (!detail.task) return;
    const t = detail.task;
    const { tagIds, ...taskInput } = input;

    const fieldsChanged =
      taskInput.title !== t.title ||
      (taskInput.description ?? "") !== (t.description ?? "") ||
      taskInput.status !== t.status ||
      taskInput.priority !== t.priority ||
      taskInput.responsibleUserId !== t.responsibleUserId ||
      taskInput.dueDate !== t.dueDate;

    const currentTagIds = (t.tags ?? []).map((tag) => tag.id).sort((a, b) => a - b);
    const nextTagIds = [...tagIds].sort((a, b) => a - b);
    const tagsChanged =
      nextTagIds.length !== currentTagIds.length ||
      nextTagIds.some((id, index) => id !== currentTagIds[index]);

    if (!fieldsChanged && !tagsChanged) return;

    await Promise.all([
      fieldsChanged
        ? taskController.updateTask(t.id, { ...taskInput, expectedVersion: t.version })
        : Promise.resolve(undefined),
      tagsChanged ? setTaskTags(t.id, tagIds) : Promise.resolve(undefined),
    ]);
    if (tagsChanged) void invalidateTags(queryClient);
  }, [detail.task, taskController, queryClient]);

  const handleDelete = useCallback(async () => {
    if (!detail.task) return;
    const approved = await confirm({
      title: "Aufgabe löschen?",
      body: `Die Aufgabe „${detail.task.title}" wird unwiderruflich entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) return;
    try {
      await taskController.removeTask(detail.task.id);
      closePage();
    } catch (err) {
      showToast({ tone: "error", title: "Aufgabe konnte nicht gelöscht werden", message: errorMessage(err) });
    }
  }, [detail.task, taskController, confirm, showToast]);

  const submitTask = async (input: TaskFormInput): Promise<Task | void> => {
    const {
      tagIds,
      pendingSubtasks,
      pendingTickets,
      pendingComments,
      pendingNotes,
      pendingFiles,
      ...taskInput
    } = input;

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
        setSavingLabel(
          `Speichern… (Datei ${index + 1} von ${pendingFiles.length})`,
        );
        await uploadTaskAttachment(created.id, file.file, file.librarySelection);
      }

      showToast({ tone: "success", title: "Aufgabe erstellt" });
      return created;
    } catch (taskError) {
      showToast({
        tone: "error",
        title: created
          ? "Aufgabe wurde erstellt, aber nicht alle Zuordnungen konnten gespeichert werden"
          : "Aufgabe konnte nicht erstellt werden",
        message: errorMessage(taskError),
      });
      throw taskError;
    } finally {
      setSavingLabel(undefined);
    }
  };

  if (isCreateMode && !owner) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel-600">
        Aufgaben benötigen einen Parent-Kontext.
      </div>
    );
  }

  if (!isCreateMode && !Number.isFinite(taskId)) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel-600">
        Aufgabe nicht gefunden
      </div>
    );
  }

  if (!isCreateMode && detail.loading) {
    return <DetailPageSkeleton />;
  }

  if (!isCreateMode && !detail.task) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel-600">
        Aufgabe nicht gefunden
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <TaskForm
        open
        task={detail.task}
        owner={owner}
        initialStatus={parseTaskStatus(searchParams.get("status"))}
        variant="page"
        savingLabel={savingLabel}
        onSubmit={submitTask}
        onAutoSave={!isCreateMode ? autoSaveTask : undefined}
        onDelete={!isCreateMode && detail.task ? handleDelete : undefined}
        onClose={closePage}
        onChanged={detail.reload}
        onOpenInTab={openInTab}
        onOpenTask={(nextTask) => navigate(`/tasks/${nextTask.id}?returnTo=${encodeURIComponent(returnTo)}`)}
      />
    </div>
  );
}
