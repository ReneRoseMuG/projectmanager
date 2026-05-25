import type { Feature } from "@taskmanager/shared-types";
import { BookOpen, Edit3, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
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
  onRemove?: (feature: Feature) => void;
  removeLabel?: string;
  onStatusChange?: (
    feature: Feature,
    status: Feature["status"],
  ) => void | Promise<unknown>;
  secondaryAction?: ReactNode;
  emptyBody?: ReactNode;
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
  onRemove,
  removeLabel = "Entfernen",
  onStatusChange,
  secondaryAction,
  emptyBody = "Für dieses Projekt sind keine Features vorhanden.",
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
      secondaryAction={secondaryAction}
      statusKey="status"
      statusCatalogKind="featureStatus"
      onItemStatusChange={onStatusChange}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      emptyState={
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Keine Features"
          body={emptyBody}
          tone="violet"
          variant="tinted"
        />
      }
      renderCard={(feature) => (
        <FeatureBoardCard feature={feature} onOpen={onOpen} onRemove={onRemove} removeLabel={removeLabel} />
      )}
      renderRow={(feature) => <FeatureRow feature={feature} onOpen={onOpen} onRemove={onRemove} removeLabel={removeLabel} />}
    />
  );
}

function FeatureBoardCard({
  feature,
  onOpen,
  onRemove,
  removeLabel,
}: {
  feature: Feature;
  onOpen: (feature: Feature) => void;
  onRemove?: (feature: Feature) => void;
  removeLabel: string;
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
      extraMenuItems={
        onRemove
          ? [
              {
                label: removeLabel,
                icon: <Trash2 size={16} />,
                onClick: () => onRemove(feature),
                danger: true,
              },
            ]
          : []
      }
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
  onRemove,
  removeLabel,
}: {
  feature: Feature;
  onOpen: (feature: Feature) => void;
  onRemove?: (feature: Feature) => void;
  removeLabel: string;
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
        <ActionMenu
          objectReference={objectReference("feature", feature.id)}
          items={[
            { label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: () => onOpen(feature) },
            ...(onRemove
              ? [
                  {
                    label: removeLabel,
                    icon: <Trash2 size={16} />,
                    onClick: () => onRemove(feature),
                    danger: true,
                  },
                ]
              : []),
          ]}
        />
      }
      actionsIncludeObjectReference
      onOpen={() => onOpen(feature)}
      pillsClassName="w-52"
    />
  );
}
