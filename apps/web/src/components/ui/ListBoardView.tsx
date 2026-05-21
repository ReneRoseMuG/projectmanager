import type {
  CatalogEntry,
  StatusCatalogKind,
} from "@taskmanager/shared-types";
import { Plus } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useCatalogs } from "../../hooks/useCatalogs";
import type { ViewMode } from "../../types";
import { catalogEntriesByKind } from "../../utils/catalogs";
import { Button } from "./Button";
import { CardGrid } from "./CardGrid";
import { SearchInput } from "./SearchInput";
import { TaskListSkeleton } from "./Skeleton";
import { ViewToggle } from "./ViewToggle";

export type ListBoardMode = "list" | "board";

interface StatusColumn {
  value: string;
  label: string;
  sortOrder?: number;
  isClosed?: boolean;
}

interface StatusGroup<T> {
  column: StatusColumn;
  items: T[];
}

interface ListBoardViewProps<T> {
  items: T[];
  mode: ListBoardMode;
  onModeChange: (mode: ListBoardMode) => void;
  onAdd: () => void;
  onAddToColumn?: (status: string) => void;
  addLabel?: string;
  showToolbarAdd?: boolean;
  secondaryAction?: ReactNode;
  statusKey?: keyof T;
  statusCatalogKind?: StatusCatalogKind;
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

function catalogColumns(
  entries: CatalogEntry[],
  kind: StatusCatalogKind,
): StatusColumn[] {
  return catalogEntriesByKind(entries, kind).map((entry) => ({
    value: entry.key,
    label: entry.label,
    sortOrder: entry.sortOrder,
    isClosed: entry.isClosed,
  }));
}

function statusValue<T>(item: T, statusKey: keyof T): string | null {
  const value = item[statusKey];
  if (value === null || value === undefined) {
    return null;
  }

  const status = String(value).trim();
  return status.length > 0 ? status : null;
}

function unknownStatusColumn(status: string | null): StatusColumn {
  return {
    value: status ?? "__without_status",
    label: status ?? "Ohne Status",
    sortOrder: Number.MAX_SAFE_INTEGER,
  };
}

function groupItemsByStatus<T>(
  items: T[],
  statusKey: keyof T | undefined,
  statusColumns: StatusColumn[] | undefined,
  includeEmptyKnownGroups: boolean,
): StatusGroup<T>[] {
  if (
    statusKey === undefined ||
    statusColumns === undefined ||
    statusColumns.length === 0
  ) {
    return [];
  }

  const knownGroups = statusColumns.map((column) => ({
    column,
    items: [] as T[],
  }));
  const knownGroupsByValue = new Map(
    knownGroups.map((group) => [group.column.value, group]),
  );
  const unknownGroups = new Map<string, StatusGroup<T>>();

  items.forEach((item) => {
    const status = statusValue(item, statusKey);
    const knownGroup = status ? knownGroupsByValue.get(status) : undefined;

    if (knownGroup) {
      knownGroup.items.push(item);
      return;
    }

    const unknownKey = status ?? "__without_status";
    const unknownGroup =
      unknownGroups.get(unknownKey) ??
      (() => {
        const nextGroup = {
          column: unknownStatusColumn(status),
          items: [] as T[],
        };
        unknownGroups.set(unknownKey, nextGroup);
        return nextGroup;
      })();

    unknownGroup.items.push(item);
  });

  const orderedKnownGroups = includeEmptyKnownGroups
    ? knownGroups
    : knownGroups.filter((group) => group.items.length > 0);
  return [...orderedKnownGroups, ...unknownGroups.values()];
}

function statusGroupClass(column: StatusColumn): string {
  if (column.value === "__without_status") {
    return "border-dashed border-steel-300 bg-white/70";
  }

  if (column.isClosed) {
    return "border-steel-200 bg-steel-50/80";
  }

  return "border-line bg-shell/70";
}

function isKnownColumn(
  statusColumns: StatusColumn[] | undefined,
  value: string,
): boolean {
  return statusColumns?.some((column) => column.value === value) ?? false;
}

function sortedStatusColumns(
  statusColumns: StatusColumn[] | undefined,
): StatusColumn[] | undefined {
  if (statusColumns === undefined) {
    return undefined;
  }

  return statusColumns
    .map((column, index) => ({ column, index }))
    .sort((left, right) => {
      if (
        left.column.sortOrder !== undefined &&
        right.column.sortOrder !== undefined &&
        left.column.sortOrder !== right.column.sortOrder
      ) {
        return left.column.sortOrder - right.column.sortOrder;
      }

      if (
        left.column.sortOrder !== undefined &&
        right.column.sortOrder === undefined
      ) {
        return -1;
      }

      if (
        left.column.sortOrder === undefined &&
        right.column.sortOrder !== undefined
      ) {
        return 1;
      }

      return left.index - right.index;
    })
    .map(({ column }) => column);
}

/** Shared list/board surface with search, filters, view toggle and add button. */
export function ListBoardView<T>(props: ListBoardViewProps<T>) {
  if (props.statusCatalogKind && props.statusColumns === undefined) {
    return (
      <CatalogAwareListBoardView
        {...props}
        statusCatalogKind={props.statusCatalogKind}
      />
    );
  }

  return <ListBoardViewContent {...props} />;
}

function CatalogAwareListBoardView<T>(
  props: ListBoardViewProps<T> & { statusCatalogKind: StatusCatalogKind },
) {
  const catalogs = useCatalogs();
  const statusColumns = useMemo(
    () => catalogColumns(catalogs.entries, props.statusCatalogKind),
    [catalogs.entries, props.statusCatalogKind],
  );

  return <ListBoardViewContent {...props} statusColumns={statusColumns} />;
}

function ListBoardViewContent<T>({
  items,
  mode,
  onModeChange,
  onAdd,
  onAddToColumn,
  addLabel = "Neu",
  showToolbarAdd = true,
  secondaryAction,
  statusKey,
  statusColumns,
  renderCard,
  renderRow,
  searchValue = "",
  onSearchChange,
  filters,
  emptyState,
  loading = false,
}: ListBoardViewProps<T>) {
  const orderedStatusColumns = sortedStatusColumns(statusColumns);
  const hasStatusGrouping =
    statusKey !== undefined &&
    orderedStatusColumns !== undefined &&
    orderedStatusColumns.length > 0;
  const listStatusGroups = groupItemsByStatus(
    items,
    statusKey,
    orderedStatusColumns,
    false,
  );
  const boardStatusGroups = groupItemsByStatus(
    items,
    statusKey,
    orderedStatusColumns,
    true,
  );
  const boardByStatus = mode === "board" && hasStatusGrouping;

  return (
    <div
      className="flex h-full min-h-[30rem] w-full min-w-0 flex-1 flex-col gap-4"
      data-testid="list-board-view"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onSearchChange ? (
          <SearchInput value={searchValue} onChange={onSearchChange} />
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {filters}
          {secondaryAction}
          <ViewToggle
            value={toViewMode(mode)}
            onChange={(value) => onModeChange(toListBoardMode(value))}
          />
          {showToolbarAdd ? (
            <Button
              aria-label={addLabel}
              title={addLabel}
              variant="primary"
              icon={<Plus size={17} />}
              className="h-9 w-9"
              onClick={onAdd}
            />
          ) : null}
        </div>
      </div>

      <div className="flex h-full min-h-0 w-full flex-1 flex-col">
        {loading ? <TaskListSkeleton /> : null}
        {!loading && items.length === 0 ? (
          <div className="grid h-full min-h-[30rem] w-full flex-1">{emptyState}</div>
        ) : null}
        {!loading &&
        items.length > 0 &&
        mode === "list" &&
        !hasStatusGrouping ? (
          <div className="grid h-full min-h-[30rem] w-full flex-1 content-start gap-3">
            {items.map((item, index) => (
              <div key={index}>{renderRow(item)}</div>
            ))}
          </div>
        ) : null}
        {!loading &&
        items.length > 0 &&
        mode === "list" &&
        hasStatusGrouping ? (
          <div className="grid h-full min-h-[30rem] w-full flex-1 content-start gap-4">
            {listStatusGroups.map((group) => (
              <section
                key={group.column.value}
                className={`grid min-w-0 gap-0 rounded-lg border p-0 ${statusGroupClass(group.column)}`}
              >
                <header className="flex min-w-0 items-center justify-between gap-2 rounded-t-lg border-b border-line/60 bg-white px-3 py-2">
                  <h2 className="min-w-0 truncate text-sm font-semibold text-ink">
                    {group.column.label}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    {group.items.length}
                  </span>
                </header>
                <div className="grid gap-3 p-3">
                  {group.items.map((item, index) => (
                    <div key={index}>{renderRow(item)}</div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
        {!loading && items.length > 0 && mode === "board" && !boardByStatus ? (
          <CardGrid>
            {items.map((item, index) => (
              <div key={index} className="min-w-0 max-w-full">
                {renderCard(item)}
              </div>
            ))}
          </CardGrid>
        ) : null}
        {!loading && items.length > 0 && boardByStatus ? (
          <div className="grid h-full min-h-[30rem] w-full min-w-0 flex-1 grid-flow-col auto-cols-[minmax(17rem,1fr)] gap-4 overflow-x-auto pb-2">
            {boardStatusGroups.map((group) => (
              <section
                key={group.column.value}
                className={`grid h-full min-h-full min-w-0 content-start gap-0 rounded-lg border p-0 ${statusGroupClass(group.column)}`}
              >
                <header className="flex min-w-0 items-center justify-between gap-2 rounded-t-lg border-b border-line/60 bg-white px-3 py-2">
                  <h2 className="min-w-0 truncate text-sm font-semibold text-ink">
                    {group.column.label}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                      {group.items.length}
                    </span>
                    {onAddToColumn &&
                    isKnownColumn(orderedStatusColumns, group.column.value) ? (
                      <Button
                        aria-label={`${group.column.label} hinzufügen`}
                        title={`${group.column.label} hinzufügen`}
                        variant="ghost"
                        className="h-10 w-10 border border-line bg-white text-steel-700 hover:bg-steel-50"
                        icon={<Plus size={18} />}
                        onClick={() => onAddToColumn(group.column.value)}
                      />
                    ) : null}
                  </div>
                </header>
                <div className="grid gap-3 p-3">
                  {group.items.map((item, index) => (
                    <div key={index} className="min-w-0 max-w-full">
                      {renderCard(item)}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
