import type { Ticket } from "@taskmanager/shared-types";
import { Bug } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { ViewMode } from "../../types";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useHasPermission } from "../../hooks/usePermissions";
import { useTags } from "../../hooks/useTags";
import { catalogEntriesByKind } from "../../utils/catalogs";
import { EmptyState } from "../ui/EmptyState";
import { FilterChips } from "../ui/FilterChips";
import { ClosedItemRow } from "../ui/ClosedItemRow";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { objectReference } from "../../lib/references";
import { TicketCard } from "./TicketCard";

interface TicketListBoardViewProps {
  tickets: Ticket[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onAdd: () => void;
  onAddStatus?: (status: Ticket["status"]) => void;
  onOpen: (ticket: Ticket) => void;
  onOpenInTab?: (ticket: Ticket) => void;
  onMove?: (ticket: Ticket) => void;
  onDelete: (ticket: Ticket) => void;
  onStatusChange?: (ticket: Ticket, status: Ticket["status"]) => void | Promise<unknown>;
  onDueDateChange?: (ticket: Ticket, dueDate: string | null) => void | Promise<unknown>;
  onTagsChange?: (ticketId: number, tagIds: number[]) => void | Promise<void>;
  linkAction?: ReactNode;
  filters?: ReactNode;
  loading?: boolean;
  showToolbarAdd?: boolean;
  readOnly?: boolean;
  // Optional kontrollierte Suche/Status: sind sie gesetzt, werden Suchfeld bzw. Status-Chips
  // von außen gesteuert (z. B. serverseitige `q`/`status`-Filterung in der Ticket-Hauptliste)
  // und die interne clientseitige Filterung entfällt. Ohne diese Props bleibt das bisherige
  // clientseitige Verhalten unverändert. Die Chip-Counts stammen weiter aus `tickets`.
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  statusFilter?: Ticket["status"] | "all";
  onStatusFilterChange?: (value: Ticket["status"] | "all") => void;
}

function toListBoardMode(viewMode: ViewMode): ListBoardMode {
  return viewMode === "kanban" ? "board" : "list";
}

function toViewMode(mode: ListBoardMode): ViewMode {
  return mode === "board" ? "kanban" : "list";
}

function matchesSearch(ticket: Ticket, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  return ticket.title.toLocaleLowerCase("de-DE").includes(normalized);
}

export function TicketListBoardView({
  tickets,
  viewMode,
  onViewModeChange,
  onAdd,
  onAddStatus,
  onOpen,
  onOpenInTab,
  onMove,
  onDelete,
  onStatusChange,
  onDueDateChange,
  onTagsChange,
  linkAction,
  filters,
  loading = false,
  showToolbarAdd = true,
  readOnly = false,
  searchValue: controlledSearchValue,
  onSearchChange: controlledOnSearchChange,
  statusFilter: controlledStatusFilter,
  onStatusFilterChange: controlledOnStatusFilterChange,
}: TicketListBoardViewProps) {
  const catalogs = useCatalogs();
  const canReadTags = useHasPermission("tags", "read");
  const canWriteTickets = useHasPermission("tickets", "write");
  const [internalSearchValue, setInternalSearchValue] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] = useState<Ticket["status"] | "all">("all");
  // Kontrollierte Suche/Status (serverseitig) haben Vorrang: dann keine interne Filterung,
  // weil die Liste bereits gefiltert vom Server kommt. Sonst wie bisher clientseitig.
  const searchControlled = controlledOnSearchChange !== undefined;
  const statusControlled = controlledOnStatusFilterChange !== undefined;
  const searchValue = searchControlled ? controlledSearchValue ?? "" : internalSearchValue;
  const setSearchValue = searchControlled ? controlledOnSearchChange : setInternalSearchValue;
  const statusFilter = statusControlled ? controlledStatusFilter ?? "all" : internalStatusFilter;
  const setStatusFilter = statusControlled ? controlledOnStatusFilterChange : setInternalStatusFilter;
  const statusColumns = useMemo(
    () => catalogEntriesByKind(catalogs.entries, "workStatus").map((entry) => ({ value: entry.key, label: entry.label, sortOrder: entry.sortOrder, isClosed: entry.isClosed, color: entry.color })),
    [catalogs.entries],
  );
  const filteredTickets = useMemo(
    () => (statusControlled ? tickets : tickets.filter((ticket) => statusFilter === "all" || ticket.status === statusFilter)),
    [statusControlled, statusFilter, tickets],
  );
  const visibleTickets = useMemo(
    () => (searchControlled ? filteredTickets : filteredTickets.filter((ticket) => matchesSearch(ticket, searchValue))),
    [searchControlled, filteredTickets, searchValue],
  );
  const filterOptions = statusColumns.map((column) => ({
    value: column.value as Ticket["status"],
    label: column.label,
    color: column.color,
    count: tickets.filter((ticket) => ticket.status === column.value).length,
  }));
  const tagEditingEnabled = !readOnly && canReadTags && canWriteTickets && Boolean(onTagsChange);
  const tagController = useTags("pm", tagEditingEnabled);
  const editableTags = tagEditingEnabled ? tagController.tags : undefined;
  const handleTagsChange = tagEditingEnabled ? onTagsChange : undefined;

  return (
    <ListBoardView
      items={visibleTickets}
      mode={toListBoardMode(viewMode)}
      onModeChange={(mode) => {
        if (!readOnly) {
          onViewModeChange(toViewMode(mode));
        }
      }}
      onAdd={onAdd}
      onAddToColumn={!readOnly ? (columnStatus) =>
        onAddStatus ? onAddStatus(columnStatus as Ticket["status"]) : onAdd()
      : undefined}
      addLabel="Neues Ticket"
      showToolbar={!readOnly}
      showToolbarAdd={!readOnly && showToolbarAdd}
      statusKey="status"
      statusCatalogKind="workStatus"
      statusColumns={statusColumns}
      onItemStatusChange={!readOnly && onStatusChange ? (ticket, status) => onStatusChange(ticket, status as Ticket["status"]) : undefined}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      toolbarFilters={<FilterChips value={statusFilter} onChange={setStatusFilter} options={filterOptions} allCount={tickets.length} />}
      filters={readOnly ? undefined : filters}
      secondaryAction={readOnly ? undefined : linkAction}
      loading={loading}
      emptyState={
        <EmptyState
          icon={<Bug size={22} />}
          title="Keine Tickets"
          body="Für diesen Kontext sind noch keine Tickets vorhanden."
          tone="violet"
          variant="default"
        />
      }
      renderCard={(ticket) => (
        <TicketCard ticket={ticket} allTags={editableTags} onOpen={onOpen} onOpenInTab={onOpenInTab} onMove={readOnly || ticket.visibleParent?.origin === "inherited" ? undefined : onMove} onDelete={readOnly || ticket.visibleParent?.origin === "inherited" ? undefined : onDelete} onStatusChange={readOnly ? undefined : onStatusChange} onDueDateChange={readOnly ? undefined : onDueDateChange} onTagsChange={handleTagsChange} />
      )}
      renderRow={(ticket) => (
        <TicketCard
          ticket={ticket}
          allTags={editableTags}
          variant="row"
          onOpen={onOpen}
          onOpenInTab={onOpenInTab}
          onMove={readOnly || ticket.visibleParent?.origin === "inherited" ? undefined : onMove}
          onDelete={readOnly || ticket.visibleParent?.origin === "inherited" ? undefined : onDelete}
          onStatusChange={readOnly ? undefined : onStatusChange}
          onDueDateChange={readOnly ? undefined : onDueDateChange}
          onTagsChange={handleTagsChange}
        />
      )}
      renderClosedRow={(ticket) => (
        <ClosedItemRow
          title={ticket.title}
          objectReference={objectReference("ticket", ticket.id)}
          accentColor={statusColumns.find((c) => c.value === ticket.status)?.color}
          childCount={ticket.subTicketCount}
          parent={ticket.visibleParent}
          onOpen={() => onOpen(ticket)}
          onOpenInTab={onOpenInTab ? () => onOpenInTab(ticket) : undefined}
        />
      )}
    />
  );
}
