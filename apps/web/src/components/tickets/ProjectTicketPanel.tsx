import type { Ticket, TicketStatus } from "@taskmanager/shared-types";
import { useState } from "react";
import { setTicketTags } from "../../api/tickets";
import { errorMessage } from "../../hooks/errors";
import { useTickets } from "../../hooks/useTickets";
import { useViewMode } from "../../hooks/useViewMode";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { useToast } from "../ui/ToastProvider";
import { TicketDetail } from "./TicketDetail";
import { TicketForm, type TicketFormInput } from "./TicketForm";
import { TicketListBoardView } from "./TicketListBoardView";

interface ProjectTicketPanelProps {
  projectId: number;
}

export function ProjectTicketPanel({ projectId }: ProjectTicketPanelProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { viewMode, setViewMode } = useViewMode("kanban");
  const tickets = useTickets(projectId);
  const [formOpen, setFormOpen] = useState(false);
  const [initialStatus, setInitialStatus] = useState<TicketStatus>("open");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const createTicket = async (input: TicketFormInput) => {
    const { tagIds, ...ticketInput } = input;
    try {
      const created = await tickets.createTicket(ticketInput);
      if (created && tagIds.length > 0) {
        await setTicketTags(created.id, tagIds);
        await tickets.reload();
      }
      showToast({ tone: "success", title: "Ticket erstellt" });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticket konnte nicht erstellt werden", message: errorMessage(ticketError) });
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
      showToast({ tone: "error", title: "Ticket konnte nicht gelöscht werden", message: errorMessage(ticketError) });
    }
  };

  return (
    <>
      <TicketListBoardView
        tickets={tickets.tickets}
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
        loading={tickets.loading}
      />
      <TicketForm open={formOpen} initialStatus={initialStatus} onSubmit={createTicket} onClose={() => setFormOpen(false)} />
      <TicketDetail ticketId={selectedTicketId} open={selectedTicketId !== null} onClose={() => setSelectedTicketId(null)} onChanged={tickets.reload} />
    </>
  );
}
