import type { Ticket, TicketStatus } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { setTicketTags, type TicketOwner } from "../../api/tickets";
import { errorMessageAsync } from "../../hooks/errors";
import { useTickets } from "../../hooks/useTickets";
import { useViewMode } from "../../hooks/useViewMode";
import { invalidateTags } from "../../queries/invalidation";
import { OwnerRelationBoard } from "../ui/OwnerRelationBoard";
import { useToast } from "../ui/ToastProvider";
import { TicketDetail } from "./TicketDetail";
import { TicketForm } from "./TicketForm";
import { TicketLinkDialog } from "./TicketLinkDialog";
import { TicketListBoardView } from "./TicketListBoardView";

interface OwnerTicketBoardProps {
  owner: TicketOwner;
}

export function OwnerTicketBoard({ owner }: OwnerTicketBoardProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const ticketController = useTickets(owner);
  const { viewMode, setViewMode } = useViewMode("kanban");
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [newTicketStatus, setNewTicketStatus] = useState<TicketStatus>("open");
  const [detailTicketId, setDetailTicketId] = useState<number | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const openTicketForm = (status: TicketStatus = "open") => {
    setNewTicketStatus(status);
    setTicketFormOpen(true);
  };

  return (
    <>
      <OwnerRelationBoard<Ticket>
        items={ticketController.tickets}
        loading={ticketController.loading}
        onCreateItem={(status) => openTicketForm(toTicketStatus(status))}
        onLinkItem={() => setLinkDialogOpen(true)}
        onUnlinkItem={(ticket) => ticketController.unlinkTicket(ticket.id)}
        onOpenItem={(ticket) => setDetailTicketId(ticket.id)}
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

      <TicketForm
        open={ticketFormOpen}
        title="Neues Ticket"
        initialStatus={newTicketStatus}
        onSubmit={async (input) => {
          try {
            const { tagIds, ...ticketInput } = input;
            const created = await ticketController.createTicket(ticketInput);
            if (created && tagIds.length > 0) {
              await setTicketTags(created.id, tagIds);
              await invalidateTags(queryClient);
            }
            await ticketController.reload();
            showToast({ tone: "success", title: "Ticket erstellt" });
          } catch (ticketError) {
            showToast({ tone: "error", title: "Ticket konnte nicht erstellt werden", message: await errorMessageAsync(ticketError) });
            throw ticketError;
          }
        }}
        onClose={() => setTicketFormOpen(false)}
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

      <TicketDetail
        open={Boolean(detailTicketId)}
        ticketId={detailTicketId}
        onClose={() => setDetailTicketId(null)}
        onChanged={async () => {
          await ticketController.reload();
        }}
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
