import type { Ticket, TicketStatus } from "@taskmanager/shared-types";
import { useState } from "react";
import { setTicketTags } from "../api/tickets";
import { TicketDetail } from "../components/tickets/TicketDetail";
import { TicketForm, type TicketFormInput } from "../components/tickets/TicketForm";
import { TicketListBoardView } from "../components/tickets/TicketListBoardView";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessageAsync } from "../hooks/errors";
import { useTickets } from "../hooks/useTickets";
import { useViewMode } from "../hooks/useViewMode";

export function TicketsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { viewMode, setViewMode } = useViewMode("kanban");
  const tickets = useTickets();
  const [formOpen, setFormOpen] = useState(false);
  const [initialStatus, setInitialStatus] = useState<TicketStatus>("open");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const createTicket = async (input: TicketFormInput) => {
    const { tagIds, ...ticketInput } = input;
    try {
      const created = await tickets.createTicket(ticketInput);
      if (created && tagIds.length > 0) {
        await setTicketTags(created.id, tagIds);
      }
      await tickets.reload();
      showToast({ tone: "success", title: "Ticket erstellt" });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticket konnte nicht erstellt werden", message: await errorMessageAsync(ticketError) });
      throw ticketError;
    }
  };

  const deleteTicket = async (ticket: Ticket) => {
    const approved = await confirm({
      title: "Ticket löschen?",
      body: ticket.title,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await tickets.removeTicket(ticket.id);
      showToast({ tone: "success", title: "Ticket gelöscht" });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticket konnte nicht gelöscht werden", message: await errorMessageAsync(ticketError) });
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tickets</h1>
          <p className="text-sm text-slate-600">{tickets.tickets.length} Einträge</p>
        </div>
      </header>

      {tickets.error ? <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">{tickets.error}</div> : null}

      <TicketListBoardView
        tickets={tickets.tickets}
        loading={tickets.loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={() => {
          setInitialStatus("open");
          setFormOpen(true);
        }}
        onAddStatus={(status) => {
          setInitialStatus(status);
          setFormOpen(true);
        }}
        onOpen={(ticket) => setSelectedTicketId(ticket.id)}
        onDelete={deleteTicket}
      />

      <TicketForm open={formOpen} initialStatus={initialStatus} onSubmit={createTicket} onClose={() => setFormOpen(false)} />
      <TicketDetail ticketId={selectedTicketId} open={selectedTicketId !== null} onClose={() => setSelectedTicketId(null)} onChanged={tickets.reload} />
    </div>
  );
}
