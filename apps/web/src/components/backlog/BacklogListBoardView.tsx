import type { BacklogItem, BacklogStatus, Feature } from "@taskmanager/shared-types";
import { Edit3, Inbox, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogEntriesByKind, isCatalogStatusClosed } from "../../utils/catalogs";
import { richTextToPlainText } from "../../utils/richText";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
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
}

function matchesSearch(item: BacklogItem, featureName: string, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  const values = [item.title, richTextToPlainText(item.description), item.status, featureName];
  return values.some((value) => value.toLocaleLowerCase("de-DE").includes(normalized));
}

export function BacklogListBoardView({ items, features, statusFilter, onStatusFilterChange, onCreate, onEdit, onDelete }: BacklogListBoardViewProps) {
  const [mode, setMode] = useState<ListBoardMode>("list");
  const [searchValue, setSearchValue] = useState("");
  const catalogs = useCatalogs();
  const featureNames = useMemo(() => new Map(features.map((feature) => [feature.id, feature.title])), [features]);
  const filteredItems = useMemo(() => items.filter((item) => statusFilter === "all" || item.status === statusFilter), [items, statusFilter]);
  const visibleItems = useMemo(
    () => filteredItems.filter((item) => matchesSearch(item, item.featureId ? (featureNames.get(item.featureId) ?? String(item.featureId)) : "", searchValue)),
    [featureNames, filteredItems, searchValue]
  );
  const statusColumns = useMemo(
    () => catalogEntriesByKind(catalogs.entries, "workStatus").map((option) => ({ value: option.key, label: option.label, sortOrder: option.sortOrder, isClosed: option.isClosed })),
    [catalogs.entries]
  );
  const filterOptions = useMemo(
    () =>
      statusColumns.map((option) => ({
        value: option.value,
        label: option.label,
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
      addLabel="Neues Backlog-Item"
      statusKey="status"
      statusCatalogKind="workStatus"
      statusColumns={statusColumns}
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
  const description = richTextToPlainText(item.description);
  const catalogs = useCatalogs();
  const closed = isCatalogStatusClosed(catalogs.entries, "workStatus", item.status);

  return (
    <ItemCard
      accentColor={closed ? "var(--color-steel-400)" : "var(--color-fern)"}
      header={
        <div className="grid gap-2">
          <h3 className={`line-clamp-2 text-sm font-semibold ${closed ? "text-slate-500 line-through" : "text-ink"}`}>{item.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill kind="workStatus" value={item.status} />
          </div>
        </div>
      }
      body={description ? <p className="line-clamp-3 text-xs text-slate-600">{description}</p> : null}
      footer={featureName ? <Badge tone="teal">Feature: {featureName}</Badge> : <Badge tone="mute">Ohne Feature</Badge>}
      onOpen={() => onEdit(item)}
      onEdit={() => onEdit(item)}
      onDelete={() => onDelete(item)}
      className={closed ? "opacity-65" : ""}
    />
  );
}

function BacklogItemRow({ item, featureName, onEdit, onDelete }: { item: BacklogItem; featureName?: string; onEdit: (item: BacklogItem) => void; onDelete: (item: BacklogItem) => void }) {
  const description = richTextToPlainText(item.description);
  const catalogs = useCatalogs();
  const closed = isCatalogStatusClosed(catalogs.entries, "workStatus", item.status);

  return (
    <ItemRow
      accentColor={closed ? "var(--color-steel-400)" : "var(--color-fern)"}
      statusIndicator={<StatusPill kind="workStatus" value={item.status} />}
      title={item.title}
      description={description}
      pills={null}
      meta={featureName ? <Badge tone="teal">{featureName}</Badge> : <Badge tone="mute">Ohne Feature</Badge>}
      actions={
        <>
          <Button aria-label="Bearbeiten" title="Bearbeiten" className="h-10 w-10" icon={<Edit3 size={18} />} variant="ghost" onClick={() => onEdit(item)} />
          <Button aria-label="Löschen" title="Löschen" className="h-10 w-10" icon={<Trash2 size={18} />} variant="ghost" onClick={() => onDelete(item)} />
        </>
      }
      onOpen={() => onEdit(item)}
      className={closed ? "opacity-65" : ""}
    />
  );
}
