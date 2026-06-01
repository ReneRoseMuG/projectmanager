import type { Feature } from "@taskmanager/shared-types";
import { BookOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../ui/EmptyState";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { FeatureCard } from "./FeatureCard";

interface FeatureListBoardViewProps {
  features: Feature[];
  onCreate: () => void;
  onOpen: (feature: Feature) => void;
  onOpenInTab?: (feature: Feature) => void;
  onDelete: (feature: Feature) => void;
  onStatusChange?: (feature: Feature, status: Feature["status"]) => void | Promise<unknown>;
  toolbarFilters?: React.ReactNode;
  filters?: React.ReactNode;
  showToolbarAdd?: boolean;
}

function matchesSearch(feature: Feature, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }
  return feature.title.toLocaleLowerCase("de-DE").includes(normalized);
}

/** Feature-specific ListBoardView adapter with status board columns. */
export function FeatureListBoardView({
  features,
  onCreate,
  onOpen,
  onOpenInTab,
  onDelete,
  onStatusChange,
  toolbarFilters,
  filters,
  showToolbarAdd = true,
}: FeatureListBoardViewProps) {
  const [mode, setMode] = useState<ListBoardMode>("board");
  const [searchValue, setSearchValue] = useState("");
  const visibleFeatures = useMemo(
    () => features.filter((feature) => matchesSearch(feature, searchValue)),
    [features, searchValue],
  );

  return (
    <ListBoardView
      items={visibleFeatures}
      mode={mode}
      onModeChange={setMode}
      onAdd={onCreate}
      onAddToColumn={onCreate}
      addLabel="Neues Feature"
      showToolbarAdd={showToolbarAdd}
      statusKey="status"
      statusCatalogKind="featureStatus"
      onItemStatusChange={onStatusChange ? (feature, status) => onStatusChange(feature, status as Feature["status"]) : undefined}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      toolbarFilters={toolbarFilters}
      filters={filters}
      emptyState={
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Keine Features"
          body="Lege ein Feature an, um Use Cases und Aufgaben fachlich zu gruppieren."
          tone="violet"
          variant="tinted"
        />
      }
      renderCard={(feature) => (
        <FeatureCard feature={feature} onOpen={onOpen} onOpenInTab={onOpenInTab} onDelete={onDelete} onStatusChange={onStatusChange} />
      )}
      renderRow={(feature) => (
        <FeatureCard feature={feature} variant="row" onOpen={onOpen} onOpenInTab={onOpenInTab} onDelete={onDelete} onStatusChange={onStatusChange} />
      )}
    />
  );
}
