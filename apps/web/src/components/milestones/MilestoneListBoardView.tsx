import type { Milestone } from "@taskmanager/shared-types";
import { Flag } from "lucide-react";
import { useMemo, useState } from "react";
import type { ViewMode } from "../../types";
import { EmptyState } from "../ui/EmptyState";
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

export function MilestoneListBoardView({ milestones, loading = false, viewMode, onViewModeChange, onCreate, onEdit, onDelete, onStatusChange, onDueDateChange }: MilestoneListBoardViewProps) {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>("kanban");
  const [searchValue, setSearchValue] = useState("");
  const currentViewMode = viewMode ?? internalViewMode;
  const visibleMilestones = useMemo(() => milestones.filter((milestone) => matchesSearch(milestone, searchValue)), [milestones, searchValue]);

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
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      loading={loading}
      emptyState={<EmptyState icon={<Flag size={22} />} title="Keine Meilensteine" body="Lege Meilensteine an, um Projektziele und abhängige Arbeit zu bündeln." tone="teal" variant="tinted" />}
      renderCard={(milestone) => <MilestoneCard milestone={milestone} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} />}
      renderRow={(milestone) => <MilestoneCard milestone={milestone} variant="row" onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} />}
    />
  );
}
