import type { Task } from "@taskmanager/shared-types";
import { useQuery } from "@tanstack/react-query";
import { LinkIcon, ListTodo } from "lucide-react";
import { useMemo, useState } from "react";
import { getTasks } from "../../api/tasks";
import { queryKeys } from "../../queries/queryKeys";
import { priorityBadgeTones, priorityLabels, taskStatusLabels, taskStatusTones } from "../../utils/domainLabels";
import { richTextToPlainText } from "../../utils/richText";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Modal } from "../ui/Modal";
import { Pill } from "../ui/Pill";
import { SearchInput } from "../ui/SearchInput";
import { TaskListSkeleton } from "../ui/Skeleton";

interface TaskLinkDialogProps {
  open: boolean;
  currentTasks: Task[];
  excludeIds?: number[];
  onLink: (task: Task) => Promise<void>;
  onClose: () => void;
}

export function TaskLinkDialog({ open, currentTasks, excludeIds = [], onLink, onClose }: TaskLinkDialogProps) {
  const [searchValue, setSearchValue] = useState("");
  const [linkingTaskId, setLinkingTaskId] = useState<number | null>(null);
  const allTasksQuery = useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: getTasks,
    enabled: open
  });
  const currentTaskIds = useMemo(() => new Set([...currentTasks.map((task) => task.id), ...excludeIds]), [currentTasks, excludeIds]);
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
