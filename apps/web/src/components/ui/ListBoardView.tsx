import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import type { ViewMode } from "../../types";
import { Button } from "./Button";
import { CardGrid } from "./CardGrid";
import { SearchInput } from "./SearchInput";
import { TaskListSkeleton } from "./Skeleton";
import { ViewToggle } from "./ViewToggle";

export type ListBoardMode = "list" | "board";

interface StatusColumn {
  value: string;
  label: string;
}

interface ListBoardViewProps<T> {
  items: T[];
  mode: ListBoardMode;
  onModeChange: (mode: ListBoardMode) => void;
  onAdd: () => void;
  onAddToColumn?: (status: string) => void;
  addLabel?: string;
  statusKey?: keyof T;
  statusColumns?: StatusColumn[];
  renderCard: (item: T) => ReactNode;
  renderRow: (item: T) => ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: ReactNode;
  emptyState?: ReactNode;
  loading?: boolean;
}

function toViewMode(mode: ListBoardMode): ViewMode {
  return mode === "board" ? "kanban" : "list";
}

function toListBoardMode(mode: ViewMode): ListBoardMode {
  return mode === "kanban" ? "board" : "list";
}

/** Shared list/board surface with search, filters, view toggle and add button. */
export function ListBoardView<T>({
  items,
  mode,
  onModeChange,
  onAdd,
  onAddToColumn,
  addLabel = "Neu",
  statusKey,
  statusColumns,
  renderCard,
  renderRow,
  searchValue = "",
  onSearchChange,
  filters,
  emptyState,
  loading = false
}: ListBoardViewProps<T>) {
  const boardByStatus = mode === "board" && statusKey && statusColumns;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onSearchChange ? <SearchInput value={searchValue} onChange={onSearchChange} /> : <span />}
        <div className="flex flex-wrap items-center gap-2">
          {filters}
          <ViewToggle value={toViewMode(mode)} onChange={(value) => onModeChange(toListBoardMode(value))} />
          <Button aria-label={addLabel} title={addLabel} variant="primary" icon={<Plus size={17} />} onClick={onAdd} />
        </div>
      </div>

      {loading ? <TaskListSkeleton /> : null}
      {!loading && items.length === 0 ? emptyState : null}
      {!loading && items.length > 0 && mode === "list" ? <div className="grid gap-3">{items.map((item, index) => <div key={index}>{renderRow(item)}</div>)}</div> : null}
      {!loading && items.length > 0 && mode === "board" && !boardByStatus ? <CardGrid>{items.map((item, index) => <div key={index}>{renderCard(item)}</div>)}</CardGrid> : null}
      {!loading && items.length > 0 && boardByStatus ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {statusColumns.map((column) => {
            const columnItems = items.filter((item) => String(item[statusKey]) === column.value);

            return (
              <section key={column.value} className="grid min-h-[240px] content-start gap-3 rounded-lg border border-line bg-shell/60 p-3">
                <header className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-ink">{column.label}</h2>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm">{columnItems.length}</span>
                    {onAddToColumn ? (
                      <Button
                        aria-label={`${column.label} hinzufügen`}
                        title={`${column.label} hinzufügen`}
                        variant="ghost"
                        size="sm"
                        className="border border-line bg-white text-steel-700 hover:bg-steel-50"
                        icon={<Plus size={14} />}
                        onClick={() => onAddToColumn(column.value)}
                      />
                    ) : null}
                  </div>
                </header>
                {columnItems.map((item, index) => (
                  <div key={index}>{renderCard(item)}</div>
                ))}
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
