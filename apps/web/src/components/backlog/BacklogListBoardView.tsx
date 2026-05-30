import type { BacklogItem, BacklogStatus, Feature } from "@taskmanager/shared-types";
import { Edit3, Inbox, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogColor, catalogEntriesByKind, isCatalogStatusClosed } from "../../utils/catalogs";
import { richTextToPlainText } from "../../utils/richText";
import { ActionMenu } from "../ui/ActionMenu";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { FilterChips } from "../ui/FilterChips";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { StatusPill } from "../ui/StatusPill";

interface BacklogListBoardViewProps {
  items: BacklogItem[];
  features: Feature[];
  statusFilter: BacklogStatus | "all";
  onStatusFilterChange: (status: BacklogStatus | "all") => void;
  onCreate: () => void;
  onEdit: (item: BacklogItem) => void;
  onDelete: (item: BacklogItem) => void;
  onStatusChange?: (item: BacklogItem, status: BacklogItem["status"]) => void | Promise<unknown>;
}

function matchesSearch(item: BacklogItem, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  return item.title.toLocaleLowerCase("de-DE").includes(normalized);
}

export function BacklogListBoardView({ items, features, statusFilter, onStatusFilterChange, onCreate, onEdit, onDelete, onStatusChange }: BacklogListBoardViewProps) {
  const [mode, setMode] = useState<ListBoardMode>("list");
  const [searchValue, setSearchValue] = useState("");
  const catalogs = useCatalogs();
  const featureNames = useMemo(() => new Map(features.map((feature) => [feature.id, feature.title])), [features]);
  const filteredItems = useMemo(() => items.filter((item) => statusFilter === "all" || item.status === statusFilter), [items, statusFilter]);
  const visibleItems = useMemo(
    () => filteredItems.filter((item) => matchesSearch(item, searchValue)),
    [filteredItems, searchValue]
  );
  const statusColumns = useMemo(
    () => catalogEntriesByKind(catalogs.entries, "workStatus").map((option) => ({ value: option.key, label: option.label, sortOrder: option.sortOrder, isClosed: option.isClosed, color: option.color })),
    [catalogs.entries]
  );
  const filterOptions = useMemo(
    () =>
      statusColumns.map((option) => ({
        value: option.value,
        label: option.label,
        color: option.color,
        count: items.filter((item) => item.status === option.value).length
      })),
    [items, statusColumns]
  );

  return (
    <ListBoardView
      items={visibleItems}
      mode={mode}
      onModeChange={setMode}
      onAdd={onCreate}
      onAddToColumn={onCreate}
      addLabel="Neues Backlog-Item"
      statusKey="status"
      statusCatalogKind="workStatus"
      statusColumns={statusColumns}
      onItemStatusChange={onStatusChange ? (item, status) => onStatusChange(item, status as BacklogItem["status"]) : undefined}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      toolbarFilters={<FilterChips value={statusFilter} onChange={onStatusFilterChange} options={filterOptions} allCount={items.length} />}
      emptyState={<EmptyState icon={<Inbox size={22} />} title="Keine Backlog-Items" body="Sammle Ideen und spätere Aufgaben hier, bevor sie umgesetzt werden." tone="tangerine" variant="tinted" />}
      renderCard={(item) => <BacklogItemCard item={item} featureName={item.featureId ? featureNames.get(item.featureId) : undefined} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />}
      renderRow={(item) => <BacklogItemRow item={item} featureName={item.featureId ? featureNames.get(item.featureId) : undefined} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />}
    />
  );
}

function BacklogItemCard({ item, featureName, onEdit, onDelete, onStatusChange }: { item: BacklogItem; featureName?: string; onEdit: (item: BacklogItem) => void; onDelete: (item: BacklogItem) => void; onStatusChange?: (item: BacklogItem, status: BacklogItem["status"]) => void | Promise<unknown> }) {
  const description = richTextToPlainText(item.description);
  const catalogs = useCatalogs();
  const closed = isCatalogStatusClosed(catalogs.entries, "workStatus", item.status);
  const statusColor = catalogColor(catalogs.entries, "workStatus", item.status);

  return (
    <ItemCard
      accentColor={statusColor}
      header={
        <div className="grid gap-2">
          <h3 className={`line-clamp-2 text-sm font-semibold ${closed ? "text-steel-500 line-through" : "text-ink"}`}>{item.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill kind="workStatus" value={item.status} onChange={onStatusChange ? (status) => onStatusChange(item, status) : undefined} />
          </div>
        </div>
      }
      body={description ? <p className="line-clamp-3 text-xs text-steel-600">{description}</p> : null}
      footer={featureName ? <Badge tone="teal">Feature: {featureName}</Badge> : <Badge tone="mute">Ohne Feature</Badge>}
      onOpen={() => onEdit(item)}
      onEdit={() => onEdit(item)}
      onDelete={() => onDelete(item)}
      className={closed ? "opacity-65" : ""}
    />
  );
}

function BacklogItemRow({ item, featureName, onEdit, onDelete, onStatusChange }: { item: BacklogItem; featureName?: string; onEdit: (item: BacklogItem) => void; onDelete: (item: BacklogItem) => void; onStatusChange?: (item: BacklogItem, status: BacklogItem["status"]) => void | Promise<unknown> }) {
  const description = richTextToPlainText(item.description);
  const catalogs = useCatalogs();
  const closed = isCatalogStatusClosed(catalogs.entries, "workStatus", item.status);
  const statusColor = catalogColor(catalogs.entries, "workStatus", item.status);

  return (
    <ItemRow
      accentColor={statusColor}
      statusIndicator={<StatusPill kind="workStatus" value={item.status} onChange={onStatusChange ? (status) => onStatusChange(item, status) : undefined} />}
      title={item.title}
      description={description}
      pills={null}
      meta={featureName ? <Badge tone="teal">{featureName}</Badge> : <Badge tone="mute">Ohne Feature</Badge>}
      actions={
        <ActionMenu
          items={[
            { label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: () => onEdit(item) },
            { label: "Löschen", icon: <Trash2 size={16} />, onClick: () => onDelete(item), danger: true }
          ]}
        />
      }
      onOpen={() => onEdit(item)}
      className={closed ? "opacity-65" : ""}
    />
  );
}
