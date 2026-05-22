import type { Ticket } from "@taskmanager/shared-types";
import { useNavigate } from "react-router-dom";
import { TicketListBoardView } from "../components/tickets/TicketListBoardView";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessageAsync } from "../hooks/errors";
import { useTickets } from "../hooks/useTickets";
import { useViewMode } from "../hooks/useViewMode";

export function TicketsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { viewMode, setViewMode } = useViewMode(
    "kanban",
    "ticketBoard.viewMode",
  );
  const tickets = useTickets();

  const deleteTicket = async (ticket: Ticket) => {
    const approved = await confirm({
      title: "Ticket löschen?",
      body: ticket.title,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return;
    }
    try {
      await tickets.removeTicket(ticket.id);
      showToast({ tone: "success", title: "Ticket gelöscht" });
    } catch (ticketError) {
      showToast({
        tone: "error",
        title: "Ticket konnte nicht gelöscht werden",
        message: await errorMessageAsync(ticketError),
      });
    }
  };

  const updateTicketStatus = async (ticket: Ticket, status: Ticket["status"]) => {
    try {
      await tickets.updateTicket(ticket.id, { status, expectedVersion: ticket.version });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticketstatus konnte nicht geändert werden", message: await errorMessageAsync(ticketError) });
      throw ticketError;
    }
  };

  const updateTicketDueDate = async (ticket: Ticket, dueDate: string | null) => {
    try {
      await tickets.updateTicket(ticket.id, { dueDate, expectedVersion: ticket.version });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticketdatum konnte nicht geändert werden", message: await errorMessageAsync(ticketError) });
      throw ticketError;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-6">
      <header>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tickets</h1>
          <p className="text-sm text-slate-500">
            {tickets.tickets.length} Einträge
          </p>
        </div>
      </header>

      {tickets.error ? (
        <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">
          {tickets.error}
        </div>
      ) : null}

      <TicketListBoardView
        tickets={tickets.tickets}
        loading={tickets.loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={() => navigate("/tickets/new")}
        onAddStatus={(status) => navigate(`/tickets/new?status=${status}`)}
        onOpen={(ticket) => navigate(`/tickets/${ticket.id}`)}
        onDelete={deleteTicket}
        onStatusChange={updateTicketStatus}
        onDueDateChange={updateTicketDueDate}
      />
    </div>
  );
}
