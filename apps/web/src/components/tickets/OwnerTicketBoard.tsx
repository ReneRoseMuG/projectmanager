import type { Ticket, TicketStatus } from "@taskmanager/shared-types";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { TicketOwner } from "../../api/tickets";
import { errorMessageAsync } from "../../hooks/errors";
import { useTickets } from "../../hooks/useTickets";
import { useViewMode } from "../../hooks/useViewMode";
import { OwnerRelationBoard } from "../ui/OwnerRelationBoard";
import { useToast } from "../ui/ToastProvider";
import { TicketLinkDialog } from "./TicketLinkDialog";
import { TicketListBoardView } from "./TicketListBoardView";

interface OwnerTicketBoardProps {
  owner: TicketOwner;
}

export function OwnerTicketBoard({ owner }: OwnerTicketBoardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const ticketController = useTickets(owner);
  const { viewMode, setViewMode } = useViewMode("kanban");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const returnTo = `${location.pathname}${location.search}`;

  const openTicketForm = (status: TicketStatus = "open") => {
    navigate(`/tickets/new?ownerType=${owner.type}&ownerId=${owner.id}&status=${status}&returnTo=${encodeURIComponent(returnTo)}`);
  };

  return (
    <>
      <OwnerRelationBoard<Ticket>
        items={ticketController.tickets}
        loading={ticketController.loading}
        onCreateItem={(status) => openTicketForm(toTicketStatus(status))}
        onLinkItem={() => setLinkDialogOpen(true)}
        onUnlinkItem={(ticket) => ticketController.unlinkTicket(ticket.id)}
        onOpenItem={(ticket) => navigate(`/tickets/${ticket.id}?returnTo=${encodeURIComponent(returnTo)}`)}
        confirmUnlinkTitle={() => "Ticket-Zuordnung entfernen?"}
        confirmUnlinkBody={(ticket) => `Das Ticket "${ticket.title}" wird nur aus diesem Bereich entfernt.`}
        renderListBoardView={(props) => (
          <TicketListBoardView
            tickets={props.items}
            loading={props.loading}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onAdd={props.onAdd}
            onAddStatus={(status) => props.onAddStatus?.(status)}
            onOpen={props.onOpen}
            onDelete={props.onDelete}
            linkAction={props.linkAction}
          />
        )}
      />

      <TicketLinkDialog
        open={linkDialogOpen}
        currentTickets={ticketController.tickets}
        onLink={async (ticket) => {
          try {
            await ticketController.linkTicket(ticket.id);
            showToast({ tone: "success", title: "Ticket verknüpft" });
          } catch (ticketError) {
            showToast({ tone: "error", title: "Ticket konnte nicht verknüpft werden", message: await errorMessageAsync(ticketError) });
            throw ticketError;
          }
        }}
        onClose={() => setLinkDialogOpen(false)}
      />
    </>
  );
}

function toTicketStatus(status?: string): TicketStatus {
  if (status === "in_progress" || status === "in_review" || status === "resolved" || status === "closed") {
    return status;
  }
  return "open";
}
