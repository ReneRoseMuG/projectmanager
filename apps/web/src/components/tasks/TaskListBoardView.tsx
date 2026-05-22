import type { Task, TaskBoardItem } from "@taskmanager/shared-types";
import { ListTodo } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { ViewMode } from "../../types";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogEntriesByKind } from "../../utils/catalogs";
import { EmptyState } from "../ui/EmptyState";
import { FilterChips } from "../ui/FilterChips";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { TaskCard } from "./TaskCard";

interface TaskListBoardViewProps {
  tasks: TaskBoardItem[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onAdd: () => void;
  onAddStatus?: (status: Task["status"]) => void;
  onOpen: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange?: (task: Task, status: Task["status"]) => void | Promise<unknown>;
  onDueDateChange?: (task: Task, dueDate: string | null) => void | Promise<unknown>;
  linkAction?: ReactNode;
  loading?: boolean;
}

function toListBoardMode(viewMode: ViewMode): ListBoardMode {
  return viewMode === "kanban" ? "board" : "list";
}

function toViewMode(mode: ListBoardMode): ViewMode {
  return mode === "board" ? "kanban" : "list";
}

function matchesSearch(task: Task, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  return task.title.toLocaleLowerCase("de-DE").includes(normalized);
}

/** Task-specific ListBoardView adapter with status Kanban columns. */
export function TaskListBoardView({ tasks, viewMode, onViewModeChange, onAdd, onAddStatus, onOpen, onDelete, onStatusChange, onDueDateChange, linkAction, loading = false }: TaskListBoardViewProps) {
  const catalogs = useCatalogs();
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<Task["status"] | "all">("all");
  const statusColumns = useMemo(() => catalogEntriesByKind(catalogs.entries, "workStatus").map((entry) => ({ value: entry.key, label: entry.label, sortOrder: entry.sortOrder, isClosed: entry.isClosed, color: entry.color })), [catalogs.entries]);
  const filteredTasks = useMemo(() => tasks.filter((task) => statusFilter === "all" || task.status === statusFilter), [statusFilter, tasks]);
  const visibleTasks = useMemo(() => filteredTasks.filter((task) => matchesSearch(task, searchValue)), [filteredTasks, searchValue]);
  const filterOptions = statusColumns.map((column) => ({
    value: column.value as Task["status"],
    label: column.label,
    color: column.color,
    count: tasks.filter((task) => task.status === column.value).length
  }));

  return (
    <ListBoardView
      items={visibleTasks}
      mode={toListBoardMode(viewMode)}
      onModeChange={(mode) => onViewModeChange(toViewMode(mode))}
      onAdd={onAdd}
      onAddToColumn={(columnStatus) => (onAddStatus ? onAddStatus(columnStatus as Task["status"]) : onAdd())}
      addLabel="Neue Aufgabe"
      secondaryAction={linkAction}
      statusKey="status"
      statusCatalogKind="workStatus"
      statusColumns={statusColumns}
      onItemStatusChange={onStatusChange}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      filters={<FilterChips value={statusFilter} onChange={setStatusFilter} options={filterOptions} allCount={tasks.length} />}
      loading={loading}
      emptyState={<EmptyState icon={<ListTodo size={22} />} title="Keine Aufgaben" body="Für diesen Kontext sind noch keine Aufgaben vorhanden." tone="fern" variant="tinted" />}
      renderCard={(task) => <TaskCard task={task} onOpen={onOpen} onDelete={task.visibleParent?.origin === "inherited" ? undefined : onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} />}
      renderRow={(task) => <TaskCard task={task} variant="row" onOpen={onOpen} onDelete={task.visibleParent?.origin === "inherited" ? undefined : onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} />}
    />
  );
}
