import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type {
  CatalogEntry,
  StatusCatalogKind,
} from "@taskmanager/shared-types";
import { CirclePlus, Plus } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCatalogs } from "../../hooks/useCatalogs";
import type { ViewMode } from "../../types";
import { catalogEntriesByKind, catalogFillStyle, catalogSoftStyle } from "../../utils/catalogs";
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
  color?: string;
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
  itemIdKey?: keyof T;
  onItemStatusChange?: (item: T, newStatus: string) => void | Promise<unknown>;
  renderCard: (item: T) => ReactNode;
  renderRow: (item: T) => ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  toolbarFilters?: ReactNode;
  filters?: ReactNode;
  emptyState?: ReactNode;
  showGroupedEmptyState?: boolean;
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
    color: entry.color,
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
  if (column.color) {
    return "";
  }

  if (column.value === "__without_status") {
    return "border-dashed border-steel-300 bg-white/70";
  }

  if (column.isClosed) {
    return "border-steel-200 bg-steel-50/80";
  }

  return "border-line bg-shell/70";
}

function statusGroupStyle(column: StatusColumn) {
  return column.color ? catalogSoftStyle(column.color) : undefined;
}

function statusHeaderStyle(column: StatusColumn) {
  return column.color ? { borderBottomColor: `color-mix(in srgb, ${column.color} 42%, white)` } : undefined;
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

function statusAddButtonStyle(column: StatusColumn) {
  if (!column.color) {
    return undefined;
  }

  return {
    ...catalogFillStyle(column.color),
    borderColor: "#ffffff",
  };
}

function itemIdentifier<T>(
  item: T,
  itemIdKey: keyof T,
): UniqueIdentifier {
  const value = item[itemIdKey];
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }

  return String(value);
}

function isKnownStatusGroup<T>(
  statusColumns: StatusColumn[] | undefined,
  group: StatusGroup<T>,
): boolean {
  return isKnownColumn(statusColumns, group.column.value);
}

interface StatusSectionProps {
  column: StatusColumn;
  itemCount: number;
  knownColumn: boolean;
  layout: ListBoardMode;
  children: ReactNode;
  renderColumnAddButton: (column: StatusColumn) => ReactNode;
}

function statusSectionClass(
  column: StatusColumn,
  layout: ListBoardMode,
  isOver = false,
): string {
  const layoutClass =
    layout === "board"
      ? "grid h-fit min-h-full min-w-0 content-start gap-0 rounded-lg border p-0"
      : "grid min-w-0 gap-0 rounded-lg border p-0";
  const overClass = isOver ? " ring-2 ring-fern/40 brightness-[1.02]" : "";
  return `${layoutClass} ${statusGroupClass(column)}${overClass}`;
}

function PlainStatusSection({
  column,
  itemCount,
  knownColumn,
  layout,
  children,
  renderColumnAddButton,
}: StatusSectionProps) {
  return (
    <section
      className={statusSectionClass(column, layout)}
      style={statusGroupStyle(column)}
      data-status-column={column.value}
      data-status-known={knownColumn ? "true" : "false"}
    >
      <StatusSectionHeader
        column={column}
        itemCount={itemCount}
        renderColumnAddButton={renderColumnAddButton}
      />
      {children}
    </section>
  );
}

function DroppableStatusSection({
  column,
  itemCount,
  knownColumn,
  layout,
  children,
  renderColumnAddButton,
}: StatusSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.value,
    disabled: !knownColumn,
  });

  return (
    <section
      ref={setNodeRef}
      className={statusSectionClass(column, layout, isOver)}
      style={statusGroupStyle(column)}
      data-dnd-droppable={knownColumn ? "true" : "false"}
      data-status-column={column.value}
      data-status-known={knownColumn ? "true" : "false"}
    >
      <StatusSectionHeader
        column={column}
        itemCount={itemCount}
        renderColumnAddButton={renderColumnAddButton}
      />
      {children}
    </section>
  );
}

function StatusSectionHeader({
  column,
  itemCount,
  renderColumnAddButton,
}: {
  column: StatusColumn;
  itemCount: number;
  renderColumnAddButton: (column: StatusColumn) => ReactNode;
}) {
  return (
    <header
      className="flex min-w-0 items-center justify-between gap-2 rounded-t-lg border-b border-line/60 bg-white px-3 py-2"
      style={statusHeaderStyle(column)}
    >
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="min-w-0 truncate text-sm font-semibold text-ink">
          {column.label}
        </h2>
        <span className="rounded bg-steel-100 px-2 py-0.5 text-xs font-semibold text-steel-600">
          {itemCount}
        </span>
      </div>
      {renderColumnAddButton(column)}
    </header>
  );
}

interface ItemWrapperBaseProps {
  itemId: UniqueIdentifier;
  className: string;
  equalItemProps: {
    "data-equal-item": string;
    style: { minHeight: number } | undefined;
  };
  children: ReactNode;
}

const statusCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0
    ? pointerCollisions
    : rectIntersection(args);
};

function PlainItemWrapper({
  itemId,
  className,
  equalItemProps,
  children,
}: ItemWrapperBaseProps) {
  return (
    <div
      className={className}
      data-dnd-item-id={String(itemId)}
      {...equalItemProps}
    >
      {children}
    </div>
  );
}

function DraggableItemWrapper({
  itemId,
  className,
  equalItemProps,
  children,
}: ItemWrapperBaseProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: itemId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className}${isDragging ? " opacity-50" : ""}`}
      data-dnd-draggable="true"
      data-dnd-item-id={String(itemId)}
      {...equalItemProps}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
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
  itemIdKey = "id" as keyof T,
  onItemStatusChange,
  renderCard,
  renderRow,
  searchValue = "",
  onSearchChange,
  toolbarFilters,
  filters,
  emptyState,
  showGroupedEmptyState = true,
  loading = false,
}: ListBoardViewProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [equalItemHeight, setEqualItemHeight] = useState<number | undefined>();
  const [activeItem, setActiveItem] = useState<T | null>(null);
  const orderedStatusColumns = sortedStatusColumns(statusColumns);
  const hasStatusGrouping =
    statusKey !== undefined &&
    orderedStatusColumns !== undefined &&
    orderedStatusColumns.length > 0;
  const listStatusGroups = groupItemsByStatus(
    items,
    statusKey,
    orderedStatusColumns,
    true,
  );
  const boardStatusGroups = groupItemsByStatus(
    items,
    statusKey,
    orderedStatusColumns,
    true,
  );
  const boardByStatus = mode === "board" && hasStatusGrouping;
  const statusGrouped = hasStatusGrouping && (mode === "board" || mode === "list");
  const dndEnabled = Boolean(
    onItemStatusChange && statusGrouped && !loading,
  );
  const equalItemStyle = equalItemHeight ? { minHeight: equalItemHeight } : undefined;
  const equalItemProps = {
    "data-equal-item": "true",
    style: equalItemStyle,
  };
  const activeStatusGroups = mode === "board" ? boardStatusGroups : listStatusGroups;
  const itemByDndId = useMemo(() => {
    const itemMap = new Map<UniqueIdentifier, T>();

    if (!statusGrouped) {
      return itemMap;
    }

    activeStatusGroups.forEach((group) => {
      group.items.forEach((item) => {
        itemMap.set(itemIdentifier(item, itemIdKey), item);
      });
    });

    return itemMap;
  }, [activeStatusGroups, itemIdKey, statusGrouped]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const renderColumnAddButton = (column: StatusColumn) =>
    onAddToColumn && isKnownColumn(orderedStatusColumns, column.value) ? (
      <Button
        aria-label={`${column.label} hinzufügen`}
        title={`${column.label} hinzufügen`}
        variant="ghost"
        className="h-9 w-9 border border-white bg-steel-700 px-0 text-white shadow-sm hover:brightness-95"
        style={statusAddButtonStyle(column)}
        icon={<Plus size={30} strokeWidth={3.4} />}
        onClick={() => onAddToColumn(column.value)}
      />
    ) : null;
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveItem(itemByDndId.get(event.active.id) ?? null);
  }, [itemByDndId]);
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const item = itemByDndId.get(event.active.id) ?? activeItem;
    setActiveItem(null);

    if (!item || !event.over || !statusKey || !onItemStatusChange) {
      return;
    }

    const newStatus = String(event.over.id);
    if (!isKnownColumn(orderedStatusColumns, newStatus)) {
      return;
    }

    if (statusValue(item, statusKey) === newStatus) {
      return;
    }

    void Promise.resolve(onItemStatusChange(item, newStatus)).catch(() => undefined);
  }, [activeItem, itemByDndId, onItemStatusChange, orderedStatusColumns, statusKey]);
  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
  }, []);
  const renderStatusGroupedContent = (
    layout: ListBoardMode,
    groups: StatusGroup<T>[],
  ) => {
    const rootClass =
      layout === "board"
        ? "grid w-full min-w-0 grid-flow-col auto-cols-[minmax(17rem,1fr)] gap-4 overflow-x-auto pb-2"
        : "grid h-full min-h-[30rem] w-full flex-1 content-start gap-4";
    const itemClass =
      layout === "board" ? "min-w-0 max-w-full" : "";
    const groupedContent = (
      <div
        className={rootClass}
        style={layout === "board" ? { minHeight: "max(30rem, 100%)" } : undefined}
        data-dnd-enabled={dndEnabled ? "true" : undefined}
      >
        {groups.map((group) => {
          const knownColumn = isKnownStatusGroup(orderedStatusColumns, group);
          const Section =
            dndEnabled && knownColumn
              ? DroppableStatusSection
              : PlainStatusSection;

          return (
            <Section
              key={group.column.value}
              column={group.column}
              itemCount={group.items.length}
              knownColumn={knownColumn}
              layout={layout}
              renderColumnAddButton={renderColumnAddButton}
            >
              <div className="grid gap-3 p-3">
                {group.items.map((item, index) => {
                  const itemId = itemIdentifier(item, itemIdKey);
                  const Wrapper = dndEnabled ? DraggableItemWrapper : PlainItemWrapper;

                  return (
                    <Wrapper
                      key={`${String(itemId)}-${index}`}
                      itemId={itemId}
                      className={itemClass}
                      equalItemProps={equalItemProps}
                    >
                      {layout === "board" ? renderCard(item) : renderRow(item)}
                    </Wrapper>
                  );
                })}
              </div>
            </Section>
          );
        })}
      </div>
    );

    if (!dndEnabled) {
      return groupedContent;
    }

    return (
      <DndContext
        collisionDetection={statusCollisionDetection}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {groupedContent}
        <DragOverlay>
          {activeItem ? (
            <div className={layout === "board" ? "min-w-[17rem] max-w-[22rem]" : "w-full max-w-[48rem]"}>
              {layout === "board" ? renderCard(activeItem) : renderRow(activeItem)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || loading) {
      setEqualItemHeight(undefined);
      return;
    }

    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-equal-item='true']"));
    if (nodes.length === 0) {
      setEqualItemHeight(undefined);
      return;
    }

    nodes.forEach((node) => {
      node.style.minHeight = "";
    });
    const maxHeight = Math.ceil(nodes.reduce((current, node) => Math.max(current, node.getBoundingClientRect().height), 0));
    setEqualItemHeight(maxHeight > 0 ? maxHeight : undefined);
  }, [boardByStatus, hasStatusGrouping, items, loading, mode]);

  return (
    <div
      ref={rootRef}
      className="flex h-full min-h-[30rem] w-full min-w-0 flex-1 flex-col gap-4"
      data-testid="list-board-view"
    >
      <div className="grid w-full gap-3">
        <div className={`grid w-full grid-cols-1 items-center gap-3 ${toolbarFilters ? "md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]" : "md:grid-cols-[minmax(0,1fr)_auto]"}`}>
          <div className="flex min-w-0 justify-start">
            {onSearchChange ? (
              <SearchInput value={searchValue} onChange={onSearchChange} />
            ) : null}
          </div>
          {toolbarFilters ? (
            <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
              {toolbarFilters}
            </div>
          ) : null}
          <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 md:justify-end">
            {secondaryAction}
            <ViewToggle
              value={toViewMode(mode)}
              onChange={(value) => onModeChange(toListBoardMode(value))}
            />
            {showToolbarAdd ? (
              <Button
                aria-label={addLabel}
                title={addLabel}
                variant="ghost"
                icon={<Plus size={26} strokeWidth={3} />}
                className="h-9 w-9 border border-fern bg-transparent text-fern hover:bg-fern/10"
                onClick={onAdd}
              />
            ) : null}
          </div>
        </div>
        {filters ? (
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
            {filters}
          </div>
        ) : null}
      </div>

      <div className="flex h-full min-h-0 w-full flex-1 flex-col">
        {loading ? <TaskListSkeleton /> : null}
        {!loading && items.length === 0 && (!hasStatusGrouping || showGroupedEmptyState) ? (
          <div className="grid h-full min-h-[30rem] w-full flex-1">{emptyState}</div>
        ) : null}
        {!loading &&
        items.length > 0 &&
        mode === "list" &&
        !hasStatusGrouping ? (
          <div className="grid h-full min-h-[30rem] w-full flex-1 content-start gap-3">
            {items.map((item, index) => (
              <div key={index} {...equalItemProps}>{renderRow(item)}</div>
            ))}
          </div>
        ) : null}
        {!loading &&
        !(items.length === 0 && showGroupedEmptyState) &&
        mode === "list" &&
        hasStatusGrouping ? (
          renderStatusGroupedContent("list", listStatusGroups)
        ) : null}
        {!loading && items.length > 0 && mode === "board" && !boardByStatus ? (
          <CardGrid>
            {items.map((item, index) => (
              <div key={index} className="min-w-0 max-w-full" {...equalItemProps}>
                {renderCard(item)}
              </div>
            ))}
          </CardGrid>
        ) : null}
        {!loading && !(items.length === 0 && showGroupedEmptyState) && boardByStatus ? (
          renderStatusGroupedContent("board", boardStatusGroups)
        ) : null}
      </div>
    </div>
  );
}
