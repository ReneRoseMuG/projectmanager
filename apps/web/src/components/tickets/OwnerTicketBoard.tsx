import type { Ticket, TicketStatus } from "@taskmanager/shared-types";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { TicketOwner } from "../../api/tickets";
import { errorMessageAsync } from "../../hooks/errors";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useTickets } from "../../hooks/useTickets";
import { useViewMode } from "../../hooks/useViewMode";
import { resolveCatalogEntryKey } from "../../utils/catalogs";
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
  const catalogs = useCatalogs();
  const { viewMode, setViewMode } = useViewMode("kanban", "ticketBoard.viewMode");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const returnTo = `${location.pathname}${location.search}`;

  const defaultStatus = resolveCatalogEntryKey(catalogs.entries, "workStatus", "open", "open") ?? "open";

  const openTicketForm = (status: TicketStatus = defaultStatus) => {
    const resolvedStatus = resolveCatalogEntryKey(catalogs.entries, "workStatus", status, "open") ?? defaultStatus;
    navigate(`/tickets/new?ownerType=${owner.type}&ownerId=${owner.id}&status=${resolvedStatus}&returnTo=${encodeURIComponent(returnTo)}`);
  };

  return (
    <>
      <OwnerRelationBoard<Ticket>
        items={ticketController.tickets}
        loading={ticketController.loading}
        onCreateItem={(status) => openTicketForm(status ?? defaultStatus)}
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
        owner={owner}
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
