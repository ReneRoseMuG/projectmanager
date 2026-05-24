import type { Feature } from "@taskmanager/shared-types";
import { BookOpen, Edit3 } from "lucide-react";
import { useMemo, useState } from "react";
import { useCatalogs } from "../../hooks/useCatalogs";
import type { ViewMode } from "../../types";
import { objectReference } from "../../lib/references";
import { catalogColor } from "../../utils/catalogs";
import { richTextToPlainText } from "../../utils/richText";
import { Badge } from "../ui/Badge";
import { ActionMenu } from "../ui/ActionMenu";
import { EmptyState } from "../ui/EmptyState";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { StatusPill } from "../ui/StatusPill";

interface ProjectFeaturePanelProps {
  features: Feature[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onCreate: () => void;
  onOpen: (feature: Feature) => void;
  onStatusChange?: (
    feature: Feature,
    status: Feature["status"],
  ) => void | Promise<unknown>;
}

function sortFeatures(features: Feature[]) {
  return [...features].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
  );
}

function toListBoardMode(viewMode: ViewMode): ListBoardMode {
  return viewMode === "kanban" ? "board" : "list";
}

function toViewMode(mode: ListBoardMode): ViewMode {
  return mode === "board" ? "kanban" : "list";
}

function matchesSearch(feature: Feature, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  return feature.title.toLocaleLowerCase("de-DE").includes(normalized);
}

function getUseCaseCount(feature: Feature): number {
  return Number.isFinite(feature.useCaseCount) ? feature.useCaseCount : 0;
}

/** Project feature surface built on the shared list/board toolbar. */
export function ProjectFeaturePanel({
  features,
  viewMode,
  onViewModeChange,
  onCreate,
  onOpen,
  onStatusChange,
}: ProjectFeaturePanelProps) {
  const [searchValue, setSearchValue] = useState("");
  const sortedFeatures = useMemo(() => sortFeatures(features), [features]);
  const visibleFeatures = useMemo(
    () => sortedFeatures.filter((feature) => matchesSearch(feature, searchValue)),
    [searchValue, sortedFeatures],
  );

  return (
    <ListBoardView
      items={visibleFeatures}
      mode={toListBoardMode(viewMode)}
      onModeChange={(mode) => onViewModeChange(toViewMode(mode))}
      onAdd={onCreate}
      addLabel="Neues Feature"
      statusKey="status"
      statusCatalogKind="featureStatus"
      onItemStatusChange={onStatusChange}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      emptyState={
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Keine Features"
          body="Für dieses Projekt sind keine Features vorhanden."
          tone="violet"
          variant="tinted"
        />
      }
      renderCard={(feature) => (
        <FeatureBoardCard feature={feature} onOpen={onOpen} />
      )}
      renderRow={(feature) => <FeatureRow feature={feature} onOpen={onOpen} />}
    />
  );
}

function FeatureBoardCard({
  feature,
  onOpen,
}: {
  feature: Feature;
  onOpen: (feature: Feature) => void;
}) {
  const catalogs = useCatalogs();
  const description = richTextToPlainText(feature.description);
  const statusColor = catalogColor(catalogs.entries, "featureStatus", feature.status);

  return (
    <ItemCard
      accentColor={statusColor}
      objectReference={objectReference("feature", feature.id)}
      onOpen={() => onOpen(feature)}
      onEdit={() => onOpen(feature)}
      header={
        <div className="grid gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink">
            {feature.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill kind="featureStatus" value={feature.status} />
            <Badge tone="steel">{getUseCaseCount(feature)} Use Cases</Badge>
          </div>
        </div>
      }
      body={
        description ? (
          <p className="line-clamp-3 text-xs text-steel-600">{description}</p>
        ) : null
      }
    />
  );
}

function FeatureRow({
  feature,
  onOpen,
}: {
  feature: Feature;
  onOpen: (feature: Feature) => void;
}) {
  const catalogs = useCatalogs();
  const description = richTextToPlainText(feature.description);
  const statusColor = catalogColor(catalogs.entries, "featureStatus", feature.status);

  return (
    <ItemRow
      accentColor={statusColor}
      objectReference={objectReference("feature", feature.id)}
      title={feature.title}
      description={description}
      pills={
        <>
          <StatusPill kind="featureStatus" value={feature.status} />
          <Badge tone="steel">{getUseCaseCount(feature)} Use Cases</Badge>
        </>
      }
      actions={
        <ActionMenu objectReference={objectReference("feature", feature.id)} items={[{ label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: () => onOpen(feature) }]} />
      }
      actionsIncludeObjectReference
      onOpen={() => onOpen(feature)}
      pillsClassName="w-52"
    />
  );
}
