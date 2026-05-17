import type { UseCase } from "@taskmanager/shared-types";
import { BookOpen } from "lucide-react";
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

  const values = [useCase.title, useCase.slug, useCase.description ?? "", useCase.status];
  return values.some((value) => value.toLocaleLowerCase("de-DE").includes(normalized));
}

/** Use-case adapter for the generic ListBoardView without status grouping. */
export function UseCaseListBoardView({ useCases, viewMode, onViewModeChange, onCreate, onOpen }: UseCaseListBoardViewProps) {
  const [searchValue, setSearchValue] = useState("");
  const visibleUseCases = useMemo(() => sortUseCases(useCases).filter((useCase) => matchesSearch(useCase, searchValue)), [searchValue, useCases]);

  return (
    <ListBoardView
      items={visibleUseCases}
      mode={toListBoardMode(viewMode)}
      onModeChange={(mode) => onViewModeChange(toViewMode(mode))}
      onAdd={onCreate}
      addLabel="Neuer Use Case"
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      emptyState={<EmptyState icon={<BookOpen size={22} />} title="Keine Use Cases" body="Lege Use Cases an, um fachliche Abläufe zu beschreiben." tone="violet" variant="tinted" />}
      renderCard={(useCase) => <UseCaseCard useCase={useCase} onOpen={onOpen} />}
      renderRow={(useCase) => <UseCaseCard useCase={useCase} variant="row" onOpen={onOpen} />}
    />
  );
}
