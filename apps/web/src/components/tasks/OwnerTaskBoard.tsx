import type { Task, TaskStatus } from "@taskmanager/shared-types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinkIcon, ListTodo } from "lucide-react";
import { useMemo, useState } from "react";
import { getTasks, type TaskOwner } from "../../api/tasks";
import { setTaskTags } from "../../api/tags";
import { errorMessage } from "../../hooks/errors";
import { useTasks } from "../../hooks/useTasks";
import { useViewMode } from "../../hooks/useViewMode";
import { invalidateTags } from "../../queries/invalidation";
import { queryKeys } from "../../queries/queryKeys";
import { priorityBadgeTones, priorityLabels, taskStatusLabels, taskStatusTones } from "../../utils/domainLabels";
import { richTextToPlainText } from "../../utils/richText";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { EmptyState } from "../ui/EmptyState";
import { Modal } from "../ui/Modal";
import { Pill } from "../ui/Pill";
import { SearchInput } from "../ui/SearchInput";
import { TaskListSkeleton } from "../ui/Skeleton";
import { useToast } from "../ui/ToastProvider";
import { TaskDetail } from "./TaskDetail";
import { TaskForm } from "./TaskForm";
import { TaskListBoardView } from "./TaskListBoardView";

interface OwnerTaskBoardProps {
  owner: TaskOwner;
}

export function OwnerTaskBoard({ owner }: OwnerTaskBoardProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const taskController = useTasks(owner);
  const { viewMode, setViewMode } = useViewMode();
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("todo");
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const openTaskForm = (status: TaskStatus = "todo") => {
    setNewTaskStatus(status);
    setTaskFormOpen(true);
  };

  const unlinkTask = async (task: Task) => {
    const approved = await confirm({
      title: "Zuordnung entfernen?",
      body: `Die Aufgabe "${task.title}" wird nur aus diesem Bereich entfernt.`,
      severity: "danger",
      confirmLabel: "Entfernen"
    });
    if (!approved) {
      return;
    }

    try {
      await taskController.unlinkTask(task.id);
      showToast({ tone: "success", title: "Aufgaben-Zuordnung entfernt" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgaben-Zuordnung konnte nicht entfernt werden", message: errorMessage(taskError) });
    }
  };

  return (
    <>
      <TaskListBoardView
        tasks={taskController.tasks}
        loading={taskController.loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={() => openTaskForm()}
        onAddStatus={openTaskForm}
        onOpen={(task) => setDetailTaskId(task.id)}
        onDelete={(task) => void unlinkTask(task)}
        linkAction={
          <Button variant="secondary" icon={<LinkIcon size={17} />} onClick={() => setLinkDialogOpen(true)}>
            Verknüpfen
          </Button>
        }
      />

      <TaskForm
        open={taskFormOpen}
        title="Neue Aufgabe"
        initialStatus={newTaskStatus}
        onSubmit={async (input) => {
          try {
            const { tagIds, ...taskInput } = input;
            const created = await taskController.createTask(taskInput);
            if (created && tagIds.length > 0) {
              await setTaskTags(created.id, tagIds);
              await invalidateTags(queryClient);
            }
            await taskController.reload();
            showToast({ tone: "success", title: "Aufgabe erstellt" });
          } catch (taskError) {
            showToast({ tone: "error", title: "Aufgabe konnte nicht erstellt werden", message: errorMessage(taskError) });
            throw taskError;
          }
        }}
        onClose={() => setTaskFormOpen(false)}
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

      <TaskDetail
        open={Boolean(detailTaskId)}
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
        onChanged={async () => {
          await taskController.reload();
        }}
      />
    </>
  );
}

function TaskLinkDialog({
  open,
  currentTasks,
  onLink,
  onClose
}: {
  open: boolean;
  currentTasks: Task[];
  onLink: (task: Task) => Promise<void>;
  onClose: () => void;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [linkingTaskId, setLinkingTaskId] = useState<number | null>(null);
  const allTasksQuery = useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: getTasks,
    enabled: open
  });
  const currentTaskIds = useMemo(() => new Set(currentTasks.map((task) => task.id)), [currentTasks]);
  const availableTasks = useMemo(() => {
    const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
    return (allTasksQuery.data ?? [])
      .filter((task) => !currentTaskIds.has(task.id))
      .filter((task) => {
        if (!normalized) {
          return true;
        }
        const values = [task.title, richTextToPlainText(task.description), task.status, task.priority, ...task.tags.map((tag) => tag.name)];
        return values.some((value) => (value ?? "").toLocaleLowerCase("de-DE").includes(normalized));
      });
  }, [allTasksQuery.data, currentTaskIds, searchValue]);

  const linkTask = async (task: Task) => {
    setLinkingTaskId(task.id);
    try {
      await onLink(task);
    } finally {
      setLinkingTaskId(null);
    }
  };

  return (
    <Modal open={open} title="Aufgabe verknüpfen" size="lg" onClose={onClose}>
      <div className="grid gap-4">
        <SearchInput value={searchValue} onChange={setSearchValue} placeholder="Aufgaben suchen" />
        {allTasksQuery.isLoading ? <TaskListSkeleton /> : null}
        {!allTasksQuery.isLoading && availableTasks.length === 0 ? (
          <EmptyState icon={<ListTodo size={22} />} title="Keine Aufgaben verfügbar" body="Es gibt keine unverknüpfte Aufgabe für diese Suche." tone="fern" variant="tinted" />
        ) : null}
        {!allTasksQuery.isLoading && availableTasks.length > 0 ? (
          <div className="grid max-h-[52vh] gap-2 overflow-auto pr-1">
            {availableTasks.map((task) => {
              const description = richTextToPlainText(task.description);
              return (
                <div key={task.id} className="grid gap-3 rounded-md border border-line bg-white p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{task.title}</span>
                      <Pill tone={taskStatusTones[task.status]}>{taskStatusLabels[task.status]}</Pill>
                      <Badge tone={priorityBadgeTones[task.priority]}>{priorityLabels[task.priority]}</Badge>
                    </div>
                    {description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{description}</p> : null}
                  </div>
                  <Button variant="secondary" icon={<LinkIcon size={17} />} loading={linkingTaskId === task.id} onClick={() => void linkTask(task)}>
                    Verknüpfen
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
