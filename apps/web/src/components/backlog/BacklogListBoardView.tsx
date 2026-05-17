import type { BacklogItem, BacklogStatus, Feature } from "@taskmanager/shared-types";
import { Edit3, Inbox, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { backlogStatusLabels, backlogStatusTones, priorityBadgeTones, priorityLabels } from "../../utils/domainLabels";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { FilterChips } from "../ui/FilterChips";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { Pill } from "../ui/Pill";

interface BacklogListBoardViewProps {
  items: BacklogItem[];
  features: Feature[];
  statusFilter: BacklogStatus | "all";
  onStatusFilterChange: (status: BacklogStatus | "all") => void;
  onCreate: () => void;
  onEdit: (item: BacklogItem) => void;
  onDelete: (item: BacklogItem) => void;
}

const priorityAccent: Record<BacklogItem["priority"], string> = {
  urgent: "var(--color-crimson)",
  high: "var(--color-tangerine)",
  medium: "var(--color-mustard)",
  low: "var(--color-steel-400)"
};

const statusOptions: Array<{ value: BacklogStatus; label: string }> = [
  { value: "open", label: backlogStatusLabels.open },
  { value: "in_progress", label: backlogStatusLabels.in_progress },
  { value: "done", label: backlogStatusLabels.done },
  { value: "rejected", label: backlogStatusLabels.rejected }
];

function matchesSearch(item: BacklogItem, featureName: string, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  const values = [item.title, item.description ?? "", item.status, item.priority, featureName];
  return values.some((value) => value.toLocaleLowerCase("de-DE").includes(normalized));
}

export function BacklogListBoardView({ items, features, statusFilter, onStatusFilterChange, onCreate, onEdit, onDelete }: BacklogListBoardViewProps) {
  const [mode, setMode] = useState<ListBoardMode>("list");
  const [searchValue, setSearchValue] = useState("");
  const featureNames = useMemo(() => new Map(features.map((feature) => [feature.id, feature.title])), [features]);
  const filteredItems = useMemo(() => items.filter((item) => statusFilter === "all" || item.status === statusFilter), [items, statusFilter]);
  const visibleItems = useMemo(
    () => filteredItems.filter((item) => matchesSearch(item, item.featureId ? (featureNames.get(item.featureId) ?? String(item.featureId)) : "", searchValue)),
    [featureNames, filteredItems, searchValue]
  );
  const filterOptions = statusOptions.map((option) => ({
    ...option,
    count: items.filter((item) => item.status === option.value).length
  }));

  return (
    <ListBoardView
      items={visibleItems}
      mode={mode}
      onModeChange={setMode}
      onAdd={onCreate}
      addLabel="Neues Backlog-Item"
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      filters={<FilterChips value={statusFilter} onChange={onStatusFilterChange} options={filterOptions} allCount={items.length} />}
      emptyState={<EmptyState icon={<Inbox size={22} />} title="Keine Backlog-Items" body="Sammle Ideen und spätere Aufgaben hier, bevor sie umgesetzt werden." tone="tangerine" variant="tinted" />}
      renderCard={(item) => <BacklogItemCard item={item} featureName={item.featureId ? featureNames.get(item.featureId) : undefined} onEdit={onEdit} onDelete={onDelete} />}
      renderRow={(item) => <BacklogItemRow item={item} featureName={item.featureId ? featureNames.get(item.featureId) : undefined} onEdit={onEdit} onDelete={onDelete} />}
    />
  );
}

function BacklogItemCard({ item, featureName, onEdit, onDelete }: { item: BacklogItem; featureName?: string; onEdit: (item: BacklogItem) => void; onDelete: (item: BacklogItem) => void }) {
  return (
    <ItemCard
      accentColor={priorityAccent[item.priority]}
      header={
        <div className="grid gap-2">
          <h3 className={`line-clamp-2 text-sm font-semibold ${item.status === "rejected" ? "text-slate-500 line-through" : "text-ink"}`}>{item.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone={backlogStatusTones[item.status]}>{backlogStatusLabels[item.status]}</Pill>
            <Badge tone={priorityBadgeTones[item.priority]}>{priorityLabels[item.priority]}</Badge>
          </div>
        </div>
      }
      body={<p className="line-clamp-3 text-xs text-slate-600">{item.description || "Keine Beschreibung"}</p>}
      footer={featureName ? <Badge tone="teal">Feature: {featureName}</Badge> : <Badge tone="mute">Ohne Feature</Badge>}
      onEdit={() => onEdit(item)}
      onDelete={() => onDelete(item)}
      className={item.status === "rejected" ? "opacity-65" : ""}
    />
  );
}

function BacklogItemRow({ item, featureName, onEdit, onDelete }: { item: BacklogItem; featureName?: string; onEdit: (item: BacklogItem) => void; onDelete: (item: BacklogItem) => void }) {
  return (
    <ItemRow
      accentColor={priorityAccent[item.priority]}
      statusIndicator={<Pill tone={backlogStatusTones[item.status]}>{backlogStatusLabels[item.status]}</Pill>}
      title={item.title}
      description={item.description || "Keine Beschreibung"}
      pills={<Badge tone={priorityBadgeTones[item.priority]}>{priorityLabels[item.priority]}</Badge>}
      meta={featureName ? <Badge tone="teal">{featureName}</Badge> : <Badge tone="mute">Ohne Feature</Badge>}
      actions={
        <>
          <Button aria-label="Bearbeiten" title="Bearbeiten" className="h-8 w-8" icon={<Edit3 size={15} />} variant="ghost" onClick={() => onEdit(item)} />
          <Button aria-label="Löschen" title="Löschen" className="h-8 w-8" icon={<Trash2 size={15} />} variant="ghost" onClick={() => onDelete(item)} />
        </>
      }
      className={item.status === "rejected" ? "opacity-65" : ""}
    />
  );
}
