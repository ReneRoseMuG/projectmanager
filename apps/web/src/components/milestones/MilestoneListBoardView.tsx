import type { Milestone } from "@taskmanager/shared-types";
import { Flag } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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
import { MilestoneCard } from "./MilestoneCard";

interface MilestoneListBoardViewProps {
  milestones: Milestone[];
  loading?: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onCreate: () => void;
  onEdit: (milestone: Milestone) => void;
  onOpenInTab?: (milestone: Milestone) => void;
  onDelete: (milestone: Milestone) => void;
  onStatusChange?: (milestone: Milestone, status: Milestone["status"]) => void | Promise<unknown>;
  onDueDateChange?: (milestone: Milestone, dueDate: string | null) => void | Promise<unknown>;
  onTagsChange?: (milestoneId: number, tagIds: number[]) => void | Promise<void>;
  onCreateTask?: (milestone: Milestone) => void;
  onCreateTicket?: (milestone: Milestone) => void;
  filters?: ReactNode;
  readOnly?: boolean;
  // Optional kontrollierte Suche: sind beide gesetzt, wird das Suchfeld von außen gesteuert
  // (z. B. serverseitige `q`-Suche in der globalen Meilensteinliste) und die interne
  // Namensfilterung entfällt. Ohne diese Props bleibt das clientseitige Verhalten unverändert.
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  // Optional kontrollierter Statusfilter: ist `onStatusFilterChange` gesetzt, filtert der
  // Server nach Status; die interne Statusfilterung und die interne FilterChips-Leiste
  // entfallen (die Seite reicht die Chips dann über `filters` herein).
  statusFilter?: Milestone["status"] | "all";
  onStatusFilterChange?: (status: Milestone["status"] | "all") => void;
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

export function MilestoneListBoardView({ milestones, loading = false, viewMode, onViewModeChange, onCreate, onEdit, onOpenInTab, onDelete, onStatusChange, onDueDateChange, onTagsChange, onCreateTask, onCreateTicket, filters, readOnly = false, searchValue: controlledSearchValue, onSearchChange: controlledOnSearchChange, statusFilter: controlledStatusFilter, onStatusFilterChange: controlledOnStatusFilterChange }: MilestoneListBoardViewProps) {
  const catalogs = useCatalogs();
  const canReadTags = useHasPermission("tags", "read");
  const canWriteMilestones = useHasPermission("milestones", "write");
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>("kanban");
  const [internalSearchValue, setInternalSearchValue] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] = useState<Milestone["status"] | "all">("all");
  // Kontrollierte Suche/Status (serverseitig) haben Vorrang: dann keine interne Filterung,
  // weil die Liste bereits gefiltert vom Server kommt. Sonst wie bisher clientseitig.
  const searchControlled = controlledOnSearchChange !== undefined;
  const searchValue = searchControlled ? controlledSearchValue ?? "" : internalSearchValue;
  const setSearchValue = searchControlled ? controlledOnSearchChange : setInternalSearchValue;
  const statusControlled = controlledOnStatusFilterChange !== undefined;
  const statusFilter = statusControlled ? controlledStatusFilter ?? "all" : internalStatusFilter;
  const setStatusFilter = statusControlled ? controlledOnStatusFilterChange : setInternalStatusFilter;
  const currentViewMode = viewMode ?? internalViewMode;
  const statusColumns = useMemo(
    () => catalogEntriesByKind(catalogs.entries, "workStatus").map((entry) => ({ value: entry.key, label: entry.label, sortOrder: entry.sortOrder, isClosed: entry.isClosed, color: entry.color })),
    [catalogs.entries],
  );
  // Server-Modus liefert die Liste bereits gefiltert/paginiert — interne Filterung entfällt.
  const filteredMilestones = useMemo(
    () => (statusControlled ? milestones : milestones.filter((milestone) => statusFilter === "all" || milestone.status === statusFilter)),
    [milestones, statusFilter, statusControlled],
  );
  const visibleMilestones = useMemo(
    () => (searchControlled ? filteredMilestones : filteredMilestones.filter((milestone) => matchesSearch(milestone, searchValue))),
    [filteredMilestones, searchValue, searchControlled],
  );
  const filterOptions = statusColumns.map((column) => ({
    value: column.value as Milestone["status"],
    label: column.label,
    color: column.color,
    count: milestones.filter((milestone) => milestone.status === column.value).length,
  }));
  const tagEditingEnabled = !readOnly && canReadTags && canWriteMilestones && Boolean(onTagsChange);
  const tagController = useTags("pm", tagEditingEnabled);
  const editableTags = tagEditingEnabled ? tagController.tags : undefined;
  const handleTagsChange = tagEditingEnabled ? onTagsChange : undefined;

  const changeMode = (mode: ListBoardMode) => {
    if (readOnly) {
      return;
    }
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
      onAddToColumn={readOnly ? undefined : onCreate}
      addLabel="Neuer Meilenstein"
      showToolbar={!readOnly}
      showToolbarAdd={!readOnly}
      statusKey="status"
      statusCatalogKind="workStatus"
      statusColumns={statusColumns}
      onItemStatusChange={!readOnly && onStatusChange ? (milestone, status) => onStatusChange(milestone, status as Milestone["status"]) : undefined}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      toolbarFilters={statusControlled ? undefined : <FilterChips value={statusFilter} onChange={setStatusFilter} options={filterOptions} allCount={milestones.length} />}
      filters={readOnly ? undefined : filters}
      loading={loading}
      emptyState={<EmptyState icon={<Flag size={22} />} title="Keine Meilensteine" body="Lege Meilensteine an, um Projektziele und abhängige Arbeit zu bündeln." tone="teal" variant="tinted" />}
      renderCard={(milestone) => (
        <MilestoneCard
          milestone={milestone}
          onEdit={onEdit}
          onOpenInTab={onOpenInTab}
          onDelete={readOnly ? undefined : onDelete}
          onStatusChange={readOnly ? undefined : onStatusChange}
          onDueDateChange={readOnly ? undefined : onDueDateChange}
          allTags={editableTags}
          onTagsChange={handleTagsChange}
          onCreateTask={!readOnly && onCreateTask ? () => onCreateTask(milestone) : undefined}
          onCreateTicket={!readOnly && onCreateTicket ? () => onCreateTicket(milestone) : undefined}
        />
      )}
      renderRow={(milestone) => (
        <MilestoneCard
          milestone={milestone}
          variant="row"
          onEdit={onEdit}
          onOpenInTab={onOpenInTab}
          onDelete={readOnly ? undefined : onDelete}
          onStatusChange={readOnly ? undefined : onStatusChange}
          onDueDateChange={readOnly ? undefined : onDueDateChange}
          allTags={editableTags}
          onTagsChange={handleTagsChange}
          onCreateTask={!readOnly && onCreateTask ? () => onCreateTask(milestone) : undefined}
          onCreateTicket={!readOnly && onCreateTicket ? () => onCreateTicket(milestone) : undefined}
        />
      )}
      renderClosedRow={(milestone) => (
        <ClosedItemRow
          title={milestone.name}
          objectReference={objectReference("milestone", milestone.id)}
          accentColor={statusColumns.find((c) => c.value === milestone.status)?.color}
          parent={milestone.visibleParent}
          onOpenInTab={onOpenInTab ? () => onOpenInTab(milestone) : undefined}
        />
      )}
    />
  );
}
