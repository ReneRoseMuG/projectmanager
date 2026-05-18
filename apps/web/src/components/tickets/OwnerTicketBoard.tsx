import type { Ticket, TicketStatus } from "@taskmanager/shared-types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, LinkIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { getTickets, type TicketOwner } from "../../api/tickets";
import { setTicketTags } from "../../api/tickets";
import { errorMessageAsync } from "../../hooks/errors";
import { useTickets } from "../../hooks/useTickets";
import { useViewMode } from "../../hooks/useViewMode";
import { invalidateTags } from "../../queries/invalidation";
import { queryKeys } from "../../queries/queryKeys";
import { priorityBadgeTones, priorityLabels, ticketStatusLabels, ticketStatusTones, ticketTypeLabels, ticketTypeTones } from "../../utils/domainLabels";
import { richTextToPlainText } from "../../utils/richText";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { EmptyState } from "../ui/EmptyState";
import { Modal } from "../ui/Modal";
import { Pill } from "../ui/Pill";
import { SearchInput } from "../ui/SearchInput";
import { TaskListSkeleton } from "../ui/Skeleton";
import { useToast } from "../ui/ToastProvider";
import { TicketDetail } from "./TicketDetail";
import { TicketForm } from "./TicketForm";
import { TicketListBoardView } from "./TicketListBoardView";

interface OwnerTicketBoardProps {
  owner: TicketOwner;
}

export function OwnerTicketBoard({ owner }: OwnerTicketBoardProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
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

  const unlinkTicket = async (ticket: Ticket) => {
    const approved = await confirm({
      title: "Ticket-Zuordnung entfernen?",
      body: `Das Ticket "${ticket.title}" wird nur aus diesem Bereich entfernt.`,
      severity: "danger",
      confirmLabel: "Entfernen"
    });
    if (!approved) {
      return;
    }

    try {
      await ticketController.unlinkTicket(ticket.id);
      showToast({ tone: "success", title: "Ticket-Zuordnung entfernt" });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticket-Zuordnung konnte nicht entfernt werden", message: await errorMessageAsync(ticketError) });
    }
  };

  return (
    <>
      <TicketListBoardView
        tickets={ticketController.tickets}
        loading={ticketController.loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={() => openTicketForm()}
        onAddStatus={openTicketForm}
        onOpen={(ticket) => setDetailTicketId(ticket.id)}
        onDelete={(ticket) => void unlinkTicket(ticket)}
        linkAction={
          <Button variant="secondary" icon={<LinkIcon size={17} />} onClick={() => setLinkDialogOpen(true)}>
            Verknüpfen
          </Button>
        }
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

function TicketLinkDialog({
  open,
  currentTickets,
  onLink,
  onClose
}: {
  open: boolean;
  currentTickets: Ticket[];
  onLink: (ticket: Ticket) => Promise<void>;
  onClose: () => void;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [linkingTicketId, setLinkingTicketId] = useState<number | null>(null);
  const allTicketsQuery = useQuery({
    queryKey: queryKeys.tickets.list(),
    queryFn: getTickets,
    enabled: open
  });
  const currentTicketIds = useMemo(() => new Set(currentTickets.map((ticket) => ticket.id)), [currentTickets]);
  const availableTickets = useMemo(() => {
    const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
    return (allTicketsQuery.data ?? [])
      .filter((ticket) => !currentTicketIds.has(ticket.id))
      .filter((ticket) => {
        if (!normalized) {
          return true;
        }
        const values = [ticket.title, richTextToPlainText(ticket.description), ticket.status, ticket.type, ticket.priority, ...ticket.tags.map((tag) => tag.name)];
        return values.some((value) => (value ?? "").toLocaleLowerCase("de-DE").includes(normalized));
      });
  }, [allTicketsQuery.data, currentTicketIds, searchValue]);

  const linkTicket = async (ticket: Ticket) => {
    setLinkingTicketId(ticket.id);
    try {
      await onLink(ticket);
    } finally {
      setLinkingTicketId(null);
    }
  };

  return (
    <Modal open={open} title="Ticket verknüpfen" size="lg" onClose={onClose}>
      <div className="grid gap-4">
        <SearchInput value={searchValue} onChange={setSearchValue} placeholder="Tickets suchen" />
        {allTicketsQuery.isLoading ? <TaskListSkeleton /> : null}
        {!allTicketsQuery.isLoading && availableTickets.length === 0 ? (
          <EmptyState icon={<Bug size={22} />} title="Keine Tickets verfügbar" body="Es gibt kein unverknüpftes Ticket für diese Suche." tone="violet" variant="tinted" />
        ) : null}
        {!allTicketsQuery.isLoading && availableTickets.length > 0 ? (
          <div className="grid max-h-[52vh] gap-2 overflow-auto pr-1">
            {availableTickets.map((ticket) => {
              const description = richTextToPlainText(ticket.description);
              return (
                <div key={ticket.id} className="grid gap-3 rounded-md border border-line bg-white p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{ticket.title}</span>
                      <Pill tone={ticketStatusTones[ticket.status]}>{ticketStatusLabels[ticket.status]}</Pill>
                      <Badge tone={ticketTypeTones[ticket.type]}>{ticketTypeLabels[ticket.type]}</Badge>
                      <Badge tone={priorityBadgeTones[ticket.priority]}>{priorityLabels[ticket.priority]}</Badge>
                    </div>
                    {description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{description}</p> : null}
                  </div>
                  <Button variant="secondary" icon={<LinkIcon size={17} />} loading={linkingTicketId === ticket.id} onClick={() => void linkTicket(ticket)}>
                    Verknüpfen
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
