import type { Task } from "@taskmanager/shared-types";
import { useQuery } from "@tanstack/react-query";
import { LinkIcon, ListTodo } from "lucide-react";
import { useMemo, useState } from "react";
import { getTaskLinkCandidates, type TaskOwner } from "../../api/tasks";
import { queryKeys } from "../../queries/queryKeys";
import { richTextToPlainText } from "../../utils/richText";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Modal } from "../ui/Modal";
import { PriorityBadge } from "../ui/PriorityBadge";
import { SearchInput } from "../ui/SearchInput";
import { TaskListSkeleton } from "../ui/Skeleton";
import { StatusPill } from "../ui/StatusPill";

interface TaskLinkDialogProps {
  open: boolean;
  owner?: TaskOwner | null;
  contextOwner?: TaskOwner | null;
  currentTasks: Task[];
  excludeIds?: number[];
  onLink: (task: Task) => Promise<void>;
  onClose: () => void;
}

export function TaskLinkDialog({ open, owner, contextOwner, currentTasks, excludeIds = [], onLink, onClose }: TaskLinkDialogProps) {
  const [searchValue, setSearchValue] = useState("");
  const [linkingTaskId, setLinkingTaskId] = useState<number | null>(null);
  const validOwner = owner && Number.isFinite(owner.id) ? owner : undefined;
  const validContextOwner = contextOwner && Number.isFinite(contextOwner.id) ? contextOwner : undefined;
  const allTasksQuery = useQuery({
    queryKey: validOwner ? queryKeys.tasks.linkCandidates(validOwner.type, validOwner.id) : [...queryKeys.tasks.root, "link-context", validContextOwner?.type, validContextOwner?.id],
    queryFn: () => getTaskLinkCandidates(validOwner ?? null, validContextOwner),
    enabled: open && (validOwner !== undefined || validContextOwner !== undefined)
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
                      <StatusPill kind="workStatus" value={task.status} />
                      <PriorityBadge value={task.priority} />
                    </div>
                    {description ? <p className="mt-1 line-clamp-2 text-xs text-steel-500">{description}</p> : null}
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
