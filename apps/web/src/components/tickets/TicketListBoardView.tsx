import type { Ticket } from "@taskmanager/shared-types";
import { Bug } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { ViewMode } from "../../types";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogEntriesByKind } from "../../utils/catalogs";
import { EmptyState } from "../ui/EmptyState";
import { FilterChips } from "../ui/FilterChips";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { TicketCard } from "./TicketCard";

interface TicketListBoardViewProps {
  tickets: Ticket[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onAdd: () => void;
  onAddStatus?: (status: Ticket["status"]) => void;
  onOpen: (ticket: Ticket) => void;
  onDelete: (ticket: Ticket) => void;
  onStatusChange?: (ticket: Ticket, status: Ticket["status"]) => void | Promise<unknown>;
  onDueDateChange?: (ticket: Ticket, dueDate: string | null) => void | Promise<unknown>;
  linkAction?: ReactNode;
  filters?: ReactNode;
  loading?: boolean;
  showToolbarAdd?: boolean;
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
  onDelete,
  onStatusChange,
  onDueDateChange,
  linkAction,
  filters,
  loading = false,
  showToolbarAdd = true,
}: TicketListBoardViewProps) {
  const catalogs = useCatalogs();
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<Ticket["status"] | "all">("all");
  const statusColumns = useMemo(
    () => catalogEntriesByKind(catalogs.entries, "workStatus").map((entry) => ({ value: entry.key, label: entry.label, sortOrder: entry.sortOrder, isClosed: entry.isClosed, color: entry.color })),
    [catalogs.entries],
  );
  const filteredTickets = useMemo(
    () => tickets.filter((ticket) => statusFilter === "all" || ticket.status === statusFilter),
    [statusFilter, tickets],
  );
  const visibleTickets = useMemo(
    () => filteredTickets.filter((ticket) => matchesSearch(ticket, searchValue)),
    [filteredTickets, searchValue],
  );
  const filterOptions = statusColumns.map((column) => ({
    value: column.value as Ticket["status"],
    label: column.label,
    color: column.color,
    count: tickets.filter((ticket) => ticket.status === column.value).length,
  }));

  return (
    <ListBoardView
      items={visibleTickets}
      mode={toListBoardMode(viewMode)}
      onModeChange={(mode) => onViewModeChange(toViewMode(mode))}
      onAdd={onAdd}
      onAddToColumn={(columnStatus) =>
        onAddStatus ? onAddStatus(columnStatus as Ticket["status"]) : onAdd()
      }
      addLabel="Neues Ticket"
      showToolbarAdd={showToolbarAdd}
      statusKey="status"
      statusCatalogKind="workStatus"
      statusColumns={statusColumns}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      filters={
        <div className="flex flex-wrap justify-center gap-2">
          <FilterChips value={statusFilter} onChange={setStatusFilter} options={filterOptions} allCount={tickets.length} />
          {filters}
        </div>
      }
      secondaryAction={linkAction}
      loading={loading}
      emptyState={
        <EmptyState
          icon={<Bug size={22} />}
          title="Keine Tickets"
          body="Für diesen Kontext sind noch keine Tickets vorhanden."
          tone="violet"
          variant="tinted"
        />
      }
      renderCard={(ticket) => (
        <TicketCard ticket={ticket} onOpen={onOpen} onDelete={ticket.visibleParent?.origin === "inherited" ? undefined : onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} />
      )}
      renderRow={(ticket) => (
        <TicketCard
          ticket={ticket}
          variant="row"
          onOpen={onOpen}
          onDelete={ticket.visibleParent?.origin === "inherited" ? undefined : onDelete}
          onStatusChange={onStatusChange}
          onDueDateChange={onDueDateChange}
        />
      )}
    />
  );
}
