import type { Milestone } from "@taskmanager/shared-types";
import { Flag } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { ViewMode } from "../../types";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogEntriesByKind } from "../../utils/catalogs";
import { EmptyState } from "../ui/EmptyState";
import { FilterChips } from "../ui/FilterChips";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { MilestoneCard } from "./MilestoneCard";

interface MilestoneListBoardViewProps {
  milestones: Milestone[];
  loading?: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onCreate: () => void;
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestone: Milestone) => void;
  onStatusChange?: (milestone: Milestone, status: Milestone["status"]) => void | Promise<unknown>;
  onDueDateChange?: (milestone: Milestone, dueDate: string | null) => void | Promise<unknown>;
  filters?: ReactNode;
}

function toListBoardMode(viewMode: ViewMode): ListBoardMode {
  return viewMode === "kanban" ? "board" : "list";
}

function toViewMode(mode: ListBoardMode): ViewMode {
  return mode === "board" ? "kanban" : "list";
}

function matchesSearch(milestone: Milestone, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  return milestone.name.toLocaleLowerCase("de-DE").includes(normalized);
}

export function MilestoneListBoardView({ milestones, loading = false, viewMode, onViewModeChange, onCreate, onEdit, onDelete, onStatusChange, onDueDateChange, filters }: MilestoneListBoardViewProps) {
  const catalogs = useCatalogs();
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>("kanban");
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<Milestone["status"] | "all">("all");
  const currentViewMode = viewMode ?? internalViewMode;
  const statusColumns = useMemo(
    () => catalogEntriesByKind(catalogs.entries, "workStatus").map((entry) => ({ value: entry.key, label: entry.label, sortOrder: entry.sortOrder, isClosed: entry.isClosed, color: entry.color })),
    [catalogs.entries],
  );
  const filteredMilestones = useMemo(
    () => milestones.filter((milestone) => statusFilter === "all" || milestone.status === statusFilter),
    [milestones, statusFilter],
  );
  const visibleMilestones = useMemo(() => filteredMilestones.filter((milestone) => matchesSearch(milestone, searchValue)), [filteredMilestones, searchValue]);
  const filterOptions = statusColumns.map((column) => ({
    value: column.value as Milestone["status"],
    label: column.label,
    color: column.color,
    count: milestones.filter((milestone) => milestone.status === column.value).length,
  }));

  const changeMode = (mode: ListBoardMode) => {
    const nextViewMode = toViewMode(mode);
    if (viewMode === undefined) {
      setInternalViewMode(nextViewMode);
    }
    onViewModeChange?.(nextViewMode);
  };

  return (
    <ListBoardView
      items={visibleMilestones}
      mode={toListBoardMode(currentViewMode)}
      onModeChange={changeMode}
      onAdd={onCreate}
      onAddToColumn={onCreate}
      addLabel="Neuer Meilenstein"
      statusKey="status"
      statusCatalogKind="workStatus"
      statusColumns={statusColumns}
      onItemStatusChange={onStatusChange ? (milestone, status) => onStatusChange(milestone, status as Milestone["status"]) : undefined}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      toolbarFilters={<FilterChips value={statusFilter} onChange={setStatusFilter} options={filterOptions} allCount={milestones.length} />}
      filters={filters}
      loading={loading}
      emptyState={<EmptyState icon={<Flag size={22} />} title="Keine Meilensteine" body="Lege Meilensteine an, um Projektziele und abhängige Arbeit zu bündeln." tone="teal" variant="tinted" />}
      renderCard={(milestone) => <MilestoneCard milestone={milestone} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} />}
      renderRow={(milestone) => <MilestoneCard milestone={milestone} variant="row" onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} />}
    />
  );
}
