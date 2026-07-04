import type { Feature } from "@taskmanager/shared-types";
import { BookOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { objectReference } from "../../lib/references";
import { catalogEntriesByKind } from "../../utils/catalogs";
import { ClosedItemRow } from "../ui/ClosedItemRow";
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
  // Optional kontrollierte Suche: sind beide gesetzt, wird das Suchfeld von außen gesteuert
  // (serverseitige `q`-Suche der Feature-Liste) und die interne Titel-Filterung entfällt.
  // Ohne diese Props bleibt das bisherige clientseitige Verhalten unverändert.
  searchValue?: string;
  onSearchChange?: (value: string) => void;
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
  searchValue: controlledSearchValue,
  onSearchChange: controlledOnSearchChange,
}: FeatureListBoardViewProps) {
  const catalogs = useCatalogs();
  const statusColumns = useMemo(
    () => catalogEntriesByKind(catalogs.entries, "featureStatus"),
    [catalogs.entries],
  );
  const [mode, setMode] = useState<ListBoardMode>("board");
  const [internalSearchValue, setInternalSearchValue] = useState("");
  // Kontrollierte Suche (serverseitig) hat Vorrang: dann keine interne Titel-Filterung,
  // weil die Liste bereits gefiltert vom Server kommt. Sonst wie bisher clientseitig.
  const searchControlled = controlledOnSearchChange !== undefined;
  const searchValue = searchControlled ? controlledSearchValue ?? "" : internalSearchValue;
  const setSearchValue = searchControlled ? controlledOnSearchChange : setInternalSearchValue;
  const visibleFeatures = useMemo(
    () => (searchControlled ? features : features.filter((feature) => matchesSearch(feature, searchValue))),
    [features, searchValue, searchControlled],
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
      renderClosedRow={(feature) => (
        <ClosedItemRow
          title={feature.title}
          objectReference={objectReference("feature", feature.id)}
          accentColor={statusColumns.find((c) => c.key === feature.status)?.color}
          onOpenInTab={onOpenInTab ? () => onOpenInTab(feature) : undefined}
        />
      )}
    />
  );
}
