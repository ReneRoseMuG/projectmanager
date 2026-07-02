import type { Task } from "@taskmanager/shared-types";
import { ListTodo } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { ViewMode } from "../../types";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useHasPermission } from "../../hooks/usePermissions";
import { useTags } from "../../hooks/useTags";
import { catalogEntriesByKind } from "../../utils/catalogs";
import { EmptyState } from "../ui/EmptyState";
import { FilterChips } from "../ui/FilterChips";
import { ClosedItemRow } from "../ui/ClosedItemRow";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { objectReference } from "../../lib/references";
import { TaskCard } from "./TaskCard";

interface TaskListBoardViewProps {
  tasks: Task[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onAdd: () => void;
  onAddStatus?: (status: Task["status"]) => void;
  onOpen: (task: Task) => void;
  onOpenInTab?: (task: Task) => void;
  onMove?: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange?: (task: Task, status: Task["status"]) => void | Promise<unknown>;
  onDueDateChange?: (task: Task, dueDate: string | null) => void | Promise<unknown>;
  onTagsChange?: (taskId: number, tagIds: number[]) => void | Promise<void>;
  linkAction?: ReactNode;
  filters?: ReactNode;
  addLabel?: string;
  emptyState?: ReactNode;
  showCreateActions?: boolean;
  canDelete?: boolean;
  readOnly?: boolean;
  /** Zeigt das Löschen auch in read-only-Kontexten (z. B. Dashboard-Widgets), sobald onDelete greift. */
  allowDeleteInReadOnly?: boolean;
  loading?: boolean;
  boardId?: string;
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
export function TaskListBoardView({ tasks, viewMode, onViewModeChange, onAdd, onAddStatus, onOpen, onOpenInTab, onMove, onDelete, onStatusChange, onDueDateChange, onTagsChange, linkAction, filters, addLabel = "Neue Aufgabe", emptyState, showCreateActions = true, canDelete = true, readOnly = false, allowDeleteInReadOnly = false, loading = false, boardId }: TaskListBoardViewProps) {
  const catalogs = useCatalogs();
  const canReadTags = useHasPermission("tags", "read");
  const canWriteTasks = useHasPermission("tasks", "write");
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
  const tagEditingEnabled = !readOnly && canReadTags && canWriteTasks && Boolean(onTagsChange);
  const tagController = useTags(tagEditingEnabled);
  const editableTags = tagEditingEnabled ? tagController.tags : undefined;
  const handleTagsChange = tagEditingEnabled ? onTagsChange : undefined;

  // Das Status-Pill auf Karte/Zeile ist editierbar, sobald ein onStatusChange-Handler übergeben wird –
  // auch in read-only-Kontexten wie Dashboard-Widgets. Toolbar, Anlegen, Löschen, Fälligkeit, Tags und
  // Kanban-Drag (onItemStatusChange) bleiben weiterhin an readOnly gekoppelt.
  return (
    <ListBoardView
      boardId={boardId}
      items={visibleTasks}
      mode={toListBoardMode(viewMode)}
      onModeChange={(mode) => {
        if (!readOnly) {
          onViewModeChange(toViewMode(mode));
        }
      }}
      onAdd={onAdd}
      onAddToColumn={!readOnly && showCreateActions ? (columnStatus) => (onAddStatus ? onAddStatus(columnStatus as Task["status"]) : onAdd()) : undefined}
      addLabel={addLabel}
      showToolbar={!readOnly}
      showToolbarAdd={!readOnly && showCreateActions}
      secondaryAction={readOnly ? undefined : linkAction}
      statusKey="status"
      statusCatalogKind="workStatus"
      statusColumns={statusColumns}
      onItemStatusChange={readOnly ? undefined : onStatusChange}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      toolbarFilters={<FilterChips value={statusFilter} onChange={setStatusFilter} options={filterOptions} allCount={tasks.length} />}
      filters={readOnly ? undefined : filters}
      loading={loading}
      emptyState={emptyState ?? <EmptyState icon={<ListTodo size={22} />} title="Keine Aufgaben" body="Für diesen Kontext sind noch keine Aufgaben vorhanden." tone="fern" variant="tinted" />}
      renderCard={(task) => <TaskCard task={task} allTags={editableTags} onOpen={onOpen} onOpenInTab={onOpenInTab} onMove={readOnly || task.visibleParent?.origin === "inherited" ? undefined : onMove} onDelete={(readOnly && !allowDeleteInReadOnly) || !canDelete || task.visibleParent?.origin === "inherited" ? undefined : onDelete} onStatusChange={onStatusChange} onDueDateChange={readOnly ? undefined : onDueDateChange} onTagsChange={handleTagsChange} />}
      renderRow={(task) => <TaskCard task={task} allTags={editableTags} variant="row" onOpen={onOpen} onOpenInTab={onOpenInTab} onMove={readOnly || task.visibleParent?.origin === "inherited" ? undefined : onMove} onDelete={(readOnly && !allowDeleteInReadOnly) || !canDelete || task.visibleParent?.origin === "inherited" ? undefined : onDelete} onStatusChange={onStatusChange} onDueDateChange={readOnly ? undefined : onDueDateChange} onTagsChange={handleTagsChange} />}
      renderClosedRow={(task) => (
        <ClosedItemRow
          title={task.title}
          objectReference={objectReference("task", task.id)}
          accentColor={statusColumns.find((c) => c.value === task.status)?.color}
          childCount={task.subtaskCount}
          parent={task.visibleParent}
          onOpen={() => onOpen(task)}
          onOpenInTab={onOpenInTab ? () => onOpenInTab(task) : undefined}
        />
      )}
    />
  );
}
