import { Check, Save } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Divider } from "./Divider";
import { SearchInput } from "./SearchInput";

export interface RelationItem {
  id: number;
}

interface RelationGroup<T extends RelationItem> {
  value: unknown;
  items: T[];
}

interface RelationPanelProps<T extends RelationItem> {
  items: T[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  onSave: () => Promise<void>;
  saving?: boolean;
  renderItem: (item: T, checked: boolean) => ReactNode;
  searchKeys?: Array<keyof T>;
  groupBy?: keyof T;
  groupLabel?: (groupValue: unknown) => string;
  emptyAvailable?: ReactNode;
  emptySelected?: ReactNode;
  showSave?: boolean;
  title: string;
}

function searchableValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).toLocaleLowerCase("de-DE");
}

function sortLinkedFirst<T extends RelationItem>(items: T[], selected: Set<number>) {
  return [...items].sort((left, right) => {
    const leftSelected = selected.has(left.id);
    const rightSelected = selected.has(right.id);

    if (leftSelected === rightSelected) {
      return 0;
    }
    return leftSelected ? -1 : 1;
  });
}

function groupItems<T extends RelationItem>(items: T[], groupBy: keyof T): Array<RelationGroup<T>> {
  const groups: Array<RelationGroup<T>> = [];

  items.forEach((item) => {
    const groupValue = item[groupBy];
    const group = groups.find((candidate) => Object.is(candidate.value, groupValue));
    if (group) {
      group.items.push(item);
      return;
    }
    groups.push({ value: groupValue, items: [item] });
  });

  return groups;
}

/** Generic n:m relation manager with search, linked-first sorting and optional grouping. */
export function RelationPanel<T extends RelationItem>({
  items,
  selectedIds,
  onChange,
  onSave,
  saving = false,
  renderItem,
  searchKeys = [],
  groupBy,
  groupLabel,
  emptyAvailable,
  emptySelected,
  showSave = true,
  title
}: RelationPanelProps<T>) {
  const [searchValue, setSearchValue] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const normalizedSearch = searchValue.trim().toLocaleLowerCase("de-DE");

  const visibleItems = useMemo(() => {
    const filtered =
      normalizedSearch.length === 0 || searchKeys.length === 0
        ? items
        : items.filter((item) => searchKeys.some((key) => searchableValue(item[key]).includes(normalizedSearch)));

    return sortLinkedFirst(filtered, selected);
  }, [items, normalizedSearch, searchKeys, selected]);

  const groupedItems = groupBy ? groupItems(visibleItems, groupBy) : null;

  const toggle = (itemId: number) => {
    const nextIds = selected.has(itemId) ? selectedIds.filter((id) => id !== itemId) : [...selectedIds, itemId];
    onChange(nextIds);
  };

  const renderRelationItem = (item: T) => {
    const checked = selected.has(item.id);

    return (
      <label
        key={item.id}
        className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border-[1.5px] bg-white px-4 py-3.5 transition hover:border-steel-500 ${
          checked ? "border-steel-700 bg-steel-700/[0.04]" : "border-line"
        }`}
      >
        <input className="peer sr-only" type="checkbox" checked={checked} onChange={() => toggle(item.id)} />
        <span
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-steel-500 ${
            checked ? "border-steel-700 bg-steel-700 text-white" : "border-steel-400 bg-white"
          }`}
          aria-hidden="true"
        >
          {checked ? <Check size={15} strokeWidth={3} /> : null}
        </span>
        <span className="min-w-0">{renderItem(item, checked)}</span>
      </label>
    );
  };

  return (
    <section className="grid gap-4 rounded-xl border border-line bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink">{title}</h2>
          <Badge tone="steel">{selectedIds.length} verknüpft</Badge>
        </div>
        {showSave ? (
          <Button variant="primary" icon={<Save size={16} />} loading={saving} onClick={() => void onSave()}>
            Speichern
          </Button>
        ) : null}
      </header>

      <SearchInput value={searchValue} onChange={setSearchValue} />

      {items.length === 0 ? <div>{emptyAvailable}</div> : null}
      {items.length > 0 && selectedIds.length === 0 && emptySelected ? <div>{emptySelected}</div> : null}
      {items.length > 0 && visibleItems.length === 0 ? <p className="rounded-lg border border-dashed border-line bg-shell/60 p-4 text-sm text-slate-500">Keine passenden Einträge.</p> : null}

      {items.length > 0 && visibleItems.length > 0 && groupedItems ? (
        <div className="grid gap-3">
          {groupedItems.map((group) => (
            <div key={String(group.value)} className="grid gap-3">
              <Divider label={groupLabel ? groupLabel(group.value) : String(group.value ?? "Ohne Gruppe")} />
              {group.items.map(renderRelationItem)}
            </div>
          ))}
        </div>
      ) : null}

      {items.length > 0 && visibleItems.length > 0 && !groupedItems ? <div className="grid gap-2">{visibleItems.map(renderRelationItem)}</div> : null}
    </section>
  );
}
