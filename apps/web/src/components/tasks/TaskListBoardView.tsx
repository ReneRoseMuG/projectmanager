import type { Task } from "@taskmanager/shared-types";
import { ListTodo } from "lucide-react";
import { useMemo, useState } from "react";
import type { ViewMode } from "../../types";
import { EmptyState } from "../ui/EmptyState";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { TaskCard } from "./TaskCard";

interface TaskListBoardViewProps {
  tasks: Task[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onAdd: () => void;
  onAddStatus?: (status: Task["status"]) => void;
  onOpen: (task: Task) => void;
  onDelete: (task: Task) => void;
  loading?: boolean;
}

const statusColumns = [
  { value: "todo", label: "Offen" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "done", label: "Erledigt" }
];

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

  const values = [task.title, task.description, task.assignee, task.status, task.priority, ...task.tags.map((tag) => tag.name)];
  return values.some((value) => (value ?? "").toLocaleLowerCase("de-DE").includes(normalized));
}

/** Task-specific ListBoardView adapter with status Kanban columns. */
export function TaskListBoardView({ tasks, viewMode, onViewModeChange, onAdd, onAddStatus, onOpen, onDelete, loading = false }: TaskListBoardViewProps) {
  const [searchValue, setSearchValue] = useState("");
  const visibleTasks = useMemo(() => tasks.filter((task) => matchesSearch(task, searchValue)), [searchValue, tasks]);

  return (
    <ListBoardView
      items={visibleTasks}
      mode={toListBoardMode(viewMode)}
      onModeChange={(mode) => onViewModeChange(toViewMode(mode))}
      onAdd={onAdd}
      onAddToColumn={(columnStatus) => (onAddStatus ? onAddStatus(columnStatus as Task["status"]) : onAdd())}
      addLabel="Neue Aufgabe"
      statusKey="status"
      statusColumns={statusColumns}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      loading={loading}
      emptyState={<EmptyState icon={<ListTodo size={22} />} title="Keine Aufgaben" body="Für diesen Kontext sind noch keine Aufgaben vorhanden." tone="fern" variant="tinted" />}
      renderCard={(task) => <TaskCard task={task} onOpen={onOpen} onDelete={onDelete} />}
      renderRow={(task) => <TaskCard task={task} variant="row" onOpen={onOpen} onDelete={onDelete} />}
    />
  );
}
