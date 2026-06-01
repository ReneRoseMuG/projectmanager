import type { UseCase } from "@taskmanager/shared-types";
import { Layers3 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ViewMode } from "../../types";
import { EmptyState } from "../ui/EmptyState";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { UseCaseCard } from "./UseCaseCard";

interface UseCaseListBoardViewProps {
  useCases: UseCase[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onCreate: () => void;
  onOpen: (useCase: UseCase) => void;
  onStatusChange?: (useCase: UseCase, status: UseCase["status"]) => void | Promise<unknown>;
}

function sortUseCases(useCases: UseCase[]) {
  return [...useCases].sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));
}

function toListBoardMode(viewMode: ViewMode): ListBoardMode {
  return viewMode === "kanban" ? "board" : "list";
}

function toViewMode(mode: ListBoardMode): ViewMode {
  return mode === "board" ? "kanban" : "list";
}

function matchesSearch(useCase: UseCase, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  return useCase.title.toLocaleLowerCase("de-DE").includes(normalized);
}

/** Use-case adapter for the generic ListBoardView without status grouping. */
export function UseCaseListBoardView({ useCases, viewMode, onViewModeChange, onCreate, onOpen, onStatusChange }: UseCaseListBoardViewProps) {
  const [searchValue, setSearchValue] = useState("");
  const visibleUseCases = useMemo(() => sortUseCases(useCases).filter((useCase) => matchesSearch(useCase, searchValue)), [searchValue, useCases]);

  return (
    <ListBoardView
      items={visibleUseCases}
      mode={toListBoardMode(viewMode)}
      onModeChange={(mode) => onViewModeChange(toViewMode(mode))}
      onAdd={onCreate}
      onAddToColumn={onCreate}
      addLabel="Neuer Use Case"
      statusKey="status"
      statusCatalogKind="featureStatus"
      onItemStatusChange={onStatusChange ? (useCase, status) => onStatusChange(useCase, status as UseCase["status"]) : undefined}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      emptyState={<EmptyState icon={<Layers3 size={22} />} title="Keine Use Cases" body="Lege Use Cases an, um fachliche Abläufe zu beschreiben." tone="violet" variant="tinted" />}
      renderCard={(useCase) => <UseCaseCard useCase={useCase} onOpen={onOpen} onStatusChange={onStatusChange} />}
      renderRow={(useCase) => <UseCaseCard useCase={useCase} variant="row" onOpen={onOpen} onStatusChange={onStatusChange} />}
    />
  );
}
