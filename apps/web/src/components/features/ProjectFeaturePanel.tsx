import type { Feature, FeatureStatus } from "@taskmanager/shared-types";
import { BookOpen, Edit3, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import type { ViewMode } from "../../types";
import { featureStatusLabels, featureStatusTones } from "../../utils/domainLabels";
import { richTextToPlainText } from "../../utils/richText";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { Pill } from "../ui/Pill";

interface ProjectFeaturePanelProps {
  features: Feature[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onCreate: () => void;
  onOpen: (feature: Feature) => void;
}

const statusColumns: Array<{ value: FeatureStatus; label: string }> = [
  { value: "draft", label: featureStatusLabels.draft },
  { value: "active", label: featureStatusLabels.active },
  { value: "done", label: featureStatusLabels.done },
  { value: "archived", label: featureStatusLabels.archived }
];

function sortFeatures(features: Feature[]) {
  return [...features].sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));
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

  const values = [feature.title, feature.slug, featureStatusLabels[feature.status], richTextToPlainText(feature.description), String(feature.useCaseCount)];
  return values.some((value) => value.toLocaleLowerCase("de-DE").includes(normalized));
}

/** Project feature surface built on the shared list/board toolbar. */
export function ProjectFeaturePanel({ features, viewMode, onViewModeChange, onCreate, onOpen }: ProjectFeaturePanelProps) {
  const [searchValue, setSearchValue] = useState("");
  const sortedFeatures = useMemo(() => sortFeatures(features), [features]);
  const visibleFeatures = useMemo(() => sortedFeatures.filter((feature) => matchesSearch(feature, searchValue)), [searchValue, sortedFeatures]);

  return (
    <ListBoardView
      items={visibleFeatures}
      mode={toListBoardMode(viewMode)}
      onModeChange={(mode) => onViewModeChange(toViewMode(mode))}
      onAdd={onCreate}
      addLabel="Neues Feature"
      statusKey="status"
      statusColumns={statusColumns}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      emptyState={<EmptyState icon={<BookOpen size={22} />} title="Keine Features" body="Für dieses Projekt sind keine Features vorhanden." tone="violet" variant="tinted" />}
      renderCard={(feature) => <FeatureBoardCard feature={feature} onOpen={onOpen} />}
      renderRow={(feature) => <FeatureRow feature={feature} onOpen={onOpen} />}
    />
  );
}

function FeatureBoardCard({ feature, onOpen }: { feature: Feature; onOpen: (feature: Feature) => void }) {
  const description = richTextToPlainText(feature.description);

  return (
    <ItemCard
      accentColor="var(--color-steel-600)"
      onOpen={() => onOpen(feature)}
      onEdit={() => onOpen(feature)}
      header={
        <div className="grid gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink">{feature.title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={featureStatusTones[feature.status]}>{featureStatusLabels[feature.status]}</Pill>
            <Badge tone="steel">{feature.useCaseCount} Use Cases</Badge>
          </div>
        </div>
      }
      body={description ? <p className="line-clamp-3 text-xs text-slate-600">{description}</p> : null}
      footer={
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-steel-700">
          <FileText size={14} />
          /features/{feature.slug}
        </span>
      }
    />
  );
}

function FeatureRow({ feature, onOpen }: { feature: Feature; onOpen: (feature: Feature) => void }) {
  const description = richTextToPlainText(feature.description);

  return (
    <ItemRow
      accentColor="var(--color-steel-600)"
      title={feature.title}
      description={description}
      pills={
        <>
          <Pill tone={featureStatusTones[feature.status]}>{featureStatusLabels[feature.status]}</Pill>
          <Badge tone="steel">{feature.useCaseCount} Use Cases</Badge>
        </>
      }
      meta={<span className="font-mono text-xs text-slate-500">/features/{feature.slug}</span>}
      actions={<Button aria-label="Bearbeiten" title="Bearbeiten" className="h-10 w-10" icon={<Edit3 size={18} />} variant="ghost" onClick={() => onOpen(feature)} />}
      onOpen={() => onOpen(feature)}
    />
  );
}
