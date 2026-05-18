import type { Ticket } from "@taskmanager/shared-types";
import { Bug } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { ViewMode } from "../../types";
import { ticketStatusLabels } from "../../utils/domainLabels";
import { richTextToPlainText } from "../../utils/richText";
import { EmptyState } from "../ui/EmptyState";
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
  linkAction?: ReactNode;
  filters?: ReactNode;
  loading?: boolean;
}

const statusColumns = [
  { value: "open", label: ticketStatusLabels.open },
  { value: "in_progress", label: ticketStatusLabels.in_progress },
  { value: "in_review", label: ticketStatusLabels.in_review },
  { value: "resolved", label: ticketStatusLabels.resolved },
  { value: "closed", label: ticketStatusLabels.closed }
];

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

  const values = [
    ticket.title,
    richTextToPlainText(ticket.description),
    ticket.assignee,
    ticket.reporter,
    ticket.status,
    ticket.type,
    ticket.priority,
    ...ticket.tags.map((tag) => tag.name)
  ];
  return values.some((value) => (value ?? "").toLocaleLowerCase("de-DE").includes(normalized));
}

export function TicketListBoardView({ tickets, viewMode, onViewModeChange, onAdd, onAddStatus, onOpen, onDelete, linkAction, filters, loading = false }: TicketListBoardViewProps) {
  const [searchValue, setSearchValue] = useState("");
  const visibleTickets = useMemo(() => tickets.filter((ticket) => matchesSearch(ticket, searchValue)), [searchValue, tickets]);

  return (
    <ListBoardView
      items={visibleTickets}
      mode={toListBoardMode(viewMode)}
      onModeChange={(mode) => onViewModeChange(toViewMode(mode))}
      onAdd={onAdd}
      onAddToColumn={(columnStatus) => (onAddStatus ? onAddStatus(columnStatus as Ticket["status"]) : onAdd())}
      addLabel="Neues Ticket"
      statusKey="status"
      statusColumns={statusColumns}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      filters={filters}
      secondaryAction={linkAction}
      loading={loading}
      emptyState={<EmptyState icon={<Bug size={22} />} title="Keine Tickets" body="Für diesen Kontext sind noch keine Tickets vorhanden." tone="violet" variant="tinted" />}
      renderCard={(ticket) => <TicketCard ticket={ticket} onOpen={onOpen} onDelete={onDelete} />}
      renderRow={(ticket) => <TicketCard ticket={ticket} variant="row" onOpen={onOpen} onDelete={onDelete} />}
    />
  );
}
