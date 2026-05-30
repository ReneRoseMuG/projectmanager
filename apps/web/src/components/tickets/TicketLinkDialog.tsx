import type { Ticket } from "@taskmanager/shared-types";
import { useQuery } from "@tanstack/react-query";
import { Bug, LinkIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { getTicketLinkCandidates, type TicketOwner } from "../../api/tickets";
import { queryKeys } from "../../queries/queryKeys";
import { richTextToPlainText } from "../../utils/richText";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Modal } from "../ui/Modal";
import { PriorityBadge } from "../ui/PriorityBadge";
import { SearchInput } from "../ui/SearchInput";
import { TaskListSkeleton } from "../ui/Skeleton";
import { StatusPill } from "../ui/StatusPill";
import { TicketTypeBadge } from "../ui/TicketTypeBadge";

interface TicketLinkDialogProps {
  open: boolean;
  owner?: TicketOwner | null;
  currentTickets: Ticket[];
  excludeIds?: number[];
  onLink: (ticket: Ticket) => Promise<void>;
  onClose: () => void;
}

export function TicketLinkDialog({ open, owner, currentTickets, excludeIds = [], onLink, onClose }: TicketLinkDialogProps) {
  const [searchValue, setSearchValue] = useState("");
  const [linkingTicketId, setLinkingTicketId] = useState<number | null>(null);
  const validOwner = owner && Number.isFinite(owner.id) ? owner : undefined;
  const allTicketsQuery = useQuery({
    queryKey: validOwner ? queryKeys.tickets.linkCandidates(validOwner.type, validOwner.id) : queryKeys.tickets.root,
    queryFn: () => getTicketLinkCandidates(validOwner as TicketOwner),
    enabled: open && validOwner !== undefined
  });
  const currentTicketIds = useMemo(() => new Set([...currentTickets.map((ticket) => ticket.id), ...excludeIds]), [currentTickets, excludeIds]);
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
                      <StatusPill kind="workStatus" value={ticket.status} />
                      <TicketTypeBadge value={ticket.type} />
                      <PriorityBadge value={ticket.priority} />
                    </div>
                    {description ? <p className="mt-1 line-clamp-2 text-xs text-steel-500">{description}</p> : null}
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
