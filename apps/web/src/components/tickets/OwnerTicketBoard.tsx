import type { MoveOwner, Ticket, TicketStatus } from "@taskmanager/shared-types";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { withStandaloneView } from "../../utils/standalone";
import type { TicketOwner } from "../../api/tickets";
import { errorMessageAsync } from "../../hooks/errors";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useTickets } from "../../hooks/useTickets";
import { useViewMode } from "../../hooks/useViewMode";
import { resolveCatalogEntryKey } from "../../utils/catalogs";
import { OwnerRelationBoard } from "../ui/OwnerRelationBoard";
import { ProjectContextTreeDialog, type MoveTarget } from "../ui/ProjectContextTreeDialog";
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
  const [moveTicket, setMoveTicket] = useState<Ticket | null>(null);
  const movableOwner: MoveOwner<"project" | "milestone" | "task"> | null =
    owner.type === "project"
      ? { type: "project", id: owner.id }
      : owner.type === "milestone"
        ? { type: "milestone", id: owner.id }
        : owner.type === "task"
          ? { type: "task", id: owner.id }
          : null;
  const returnTo = `${location.pathname}${location.search}`;

  const defaultStatus = resolveCatalogEntryKey(catalogs.entries, "workStatus", "open", "open") ?? "open";

  const openTicketForm = (status: TicketStatus = defaultStatus) => {
    const resolvedStatus = resolveCatalogEntryKey(catalogs.entries, "workStatus", status, "open") ?? defaultStatus;
    navigate(`/tickets/new?ownerType=${owner.type}&ownerId=${owner.id}&status=${resolvedStatus}&returnTo=${encodeURIComponent(returnTo)}`);
  };

  const updateTicketStatus = async (ticket: Ticket, status: TicketStatus) => {
    try {
      await ticketController.updateTicket(ticket.id, { status, expectedVersion: ticket.version });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticketstatus konnte nicht geändert werden", message: await errorMessageAsync(ticketError) });
      throw ticketError;
    }
  };

  const updateTicketDueDate = async (ticket: Ticket, dueDate: string | null) => {
    try {
      await ticketController.updateTicket(ticket.id, { dueDate, expectedVersion: ticket.version });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticketdatum konnte nicht geändert werden", message: await errorMessageAsync(ticketError) });
      throw ticketError;
    }
  };

  const updateTicketTags = async (ticketId: number, tagIds: number[]) => {
    try {
      await ticketController.updateTicketTags(ticketId, tagIds);
    } catch (ticketError) {
      showToast({ tone: "error", title: "Tickettags konnten nicht geÃ¤ndert werden", message: await errorMessageAsync(ticketError) });
      throw ticketError;
    }
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
            onOpenInTab={(ticket) => window.open(withStandaloneView(`/tickets/${ticket.id}`), "_blank")}
            onMove={movableOwner ? (ticket) => setMoveTicket(ticket) : undefined}
            onDelete={props.onDelete}
            onStatusChange={updateTicketStatus}
            onDueDateChange={updateTicketDueDate}
            onTagsChange={updateTicketTags}
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

      <ProjectContextTreeDialog
        open={Boolean(moveTicket && movableOwner)}
        source={movableOwner}
        itemType="ticket"
        itemId={moveTicket?.id ?? null}
        onSelect={async (target: MoveTarget) => {
          if (!moveTicket || !movableOwner) return;
          try {
            await ticketController.moveTicket(moveTicket.id, { source: movableOwner, target, expectedVersion: moveTicket.version });
            showToast({ tone: "success", title: "Ticket verschoben" });
            setMoveTicket(null);
          } catch (ticketError) {
            showToast({ tone: "error", title: "Ticket konnte nicht verschoben werden", message: await errorMessageAsync(ticketError) });
            throw ticketError;
          }
        }}
        onClose={() => setMoveTicket(null)}
      />
    </>
  );
}
