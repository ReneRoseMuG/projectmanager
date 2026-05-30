import type { Tag, Ticket } from "@taskmanager/shared-types";
import { Edit3, GitBranch, Trash2 } from "lucide-react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { objectReference } from "../../lib/references";
import { catalogColor, isCatalogStatusClosed } from "../../utils/catalogs";
import { formatHumanDate, isOverdue } from "../../utils/date";
import { richTextToPlainText } from "../../utils/richText";
import { ActionMenu } from "../ui/ActionMenu";
import { Avatar } from "../ui/Avatar";
import { CardFooterBar } from "../ui/CardFooterBar";
import { InlineDateField } from "../ui/InlineDateField";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { ParentBadge } from "../ui/ParentBadge";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusPill } from "../ui/StatusPill";
import { TicketTypeBadge } from "../ui/TicketTypeBadge";

interface TicketCardProps {
  ticket: Ticket;
  allTags?: Tag[];
  compact?: boolean;
  variant?: "card" | "row";
  onOpen: (ticket: Ticket) => void;
  onDelete?: (ticket: Ticket) => void;
  onStatusChange?: (ticket: Ticket, status: Ticket["status"]) => void | Promise<unknown>;
  onDueDateChange?: (ticket: Ticket, dueDate: string | null) => void | Promise<unknown>;
  onTagsChange?: (ticketId: number, tagIds: number[]) => void | Promise<void>;
}

export function TicketCard({ ticket, allTags, compact = false, variant = "card", onOpen, onDelete, onStatusChange, onDueDateChange, onTagsChange }: TicketCardProps) {
  const catalogs = useCatalogs();
  const description = richTextToPlainText(ticket.description);
  const statusColor = catalogColor(catalogs.entries, "workStatus", ticket.status);
  const ticketClosed = isCatalogStatusClosed(catalogs.entries, "workStatus", ticket.status);

  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <TicketCard ticket={ticket} allTags={allTags} compact={compact} onOpen={onOpen} onDelete={onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} onTagsChange={onTagsChange} />
        </div>
        <TicketRow ticket={ticket} allTags={allTags} description={description} statusColor={statusColor} ticketClosed={ticketClosed} onOpen={onOpen} onDelete={onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} onTagsChange={onTagsChange} />
      </>
    );
  }

  return (
    <ItemCard
      accentColor={statusColor}
      objectReference={objectReference("ticket", ticket.id)}
      header={<TicketCardHeader ticket={ticket} onStatusChange={onStatusChange} />}
      body={<TicketCardBody description={description} />}
      footer={<TicketCardFooter ticket={ticket} allTags={allTags} ticketClosed={ticketClosed} onDueDateChange={onDueDateChange} onTagsChange={onTagsChange} />}
      onOpen={() => onOpen(ticket)}
      onEdit={() => onOpen(ticket)}
      onDelete={onDelete ? () => onDelete(ticket) : undefined}
      className={compact ? "p-4" : ""}
    />
  );
}

function TicketCardHeader({ ticket, onStatusChange }: { ticket: Ticket; onStatusChange?: (ticket: Ticket, status: Ticket["status"]) => void | Promise<unknown> }) {
  return (
    <div className="grid gap-2">
      <h3 className="line-clamp-2 text-sm font-semibold text-ink">{ticket.title}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill kind="workStatus" value={ticket.status} onChange={onStatusChange ? (status) => onStatusChange(ticket, status) : undefined} />
        <TicketTypeBadge value={ticket.type} />
        <PriorityBadge value={ticket.priority} />
      </div>
    </div>
  );
}

function TicketCardBody({ description }: { description: string }) {
  return description ? <p className="line-clamp-3 text-xs text-steel-600">{description}</p> : null;
}

function TicketCardFooter({ ticket, allTags, ticketClosed, onDueDateChange, onTagsChange }: { ticket: Ticket; allTags?: Tag[]; ticketClosed: boolean; onDueDateChange?: (ticket: Ticket, dueDate: string | null) => void | Promise<unknown>; onTagsChange?: (ticketId: number, tagIds: number[]) => void | Promise<void> }) {
  const overdue = !ticketClosed && isOverdue(ticket.dueDate);
  const closedDate = ticketClosed ? (ticket.resolvedAt ?? ticket.updatedAt) : null;
  const hasMeta = ticket.subTicketCount > 0 || Boolean(ticket.dueDate) || Boolean(closedDate);

  return (
    <div className="grid gap-3">
      {hasMeta ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-steel-600">
          {ticket.subTicketCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <GitBranch size={14} />
              {ticket.subTicketCount}
            </span>
          ) : null}
          {ticket.dueDate ? (
            <span className={`inline-flex items-center gap-1 font-semibold ${overdue ? "text-crimson" : ""}`}>
              Fällig
              <InlineDateField value={ticket.dueDate} onChange={onDueDateChange ? (dueDate) => onDueDateChange(ticket, dueDate) : undefined} />
            </span>
          ) : null}
          {closedDate ? (
            <span className="inline-flex items-center gap-1 font-semibold text-steel-500">
              Geschlossen {formatHumanDate(closedDate)}
            </span>
          ) : null}
        </div>
      ) : null}
      <TicketSupportFooter ticket={ticket} allTags={allTags} onTagsChange={onTagsChange} />
    </div>
  );
}

function TicketSupportFooter({ ticket, allTags, onTagsChange, bordered = true }: { ticket: Ticket; allTags?: Tag[]; onTagsChange?: (ticketId: number, tagIds: number[]) => void | Promise<void>; bordered?: boolean }) {
  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex flex-wrap gap-2">
        <ParentBadge parent={ticket.visibleParent} />
      </div>
      <CardFooterBar
        tags={ticket.tags}
        allTags={allTags}
        onTagsChange={onTagsChange ? (tagIds) => onTagsChange(ticket.id, tagIds) : undefined}
        attachmentCount={ticket.attachmentCount}
        noteCount={ticket.noteCount}
        commentCount={ticket.commentCount}
        bordered={bordered}
      />
    </div>
  );
}

function TicketRow({ ticket, allTags, description, statusColor, ticketClosed, onOpen, onDelete, onStatusChange, onDueDateChange, onTagsChange }: { ticket: Ticket; allTags?: Tag[]; description: string; statusColor: string; ticketClosed: boolean; onOpen: (ticket: Ticket) => void; onDelete?: (ticket: Ticket) => void; onStatusChange?: (ticket: Ticket, status: Ticket["status"]) => void | Promise<unknown>; onDueDateChange?: (ticket: Ticket, dueDate: string | null) => void | Promise<unknown>; onTagsChange?: (ticketId: number, tagIds: number[]) => void | Promise<void> }) {
  const overdue = !ticketClosed && isOverdue(ticket.dueDate);
  const closedDate = ticketClosed ? (ticket.resolvedAt ?? ticket.updatedAt) : null;

  return (
    <div className="hidden md:block">
      <ItemRow
        accentColor={statusColor}
        objectReference={objectReference("ticket", ticket.id)}
        statusIndicator={<span className="block h-3 w-3 rounded-full" style={{ backgroundColor: statusColor }} aria-hidden="true" />}
        title={ticket.title}
        description={description}
        pills={
          <>
            <StatusPill kind="workStatus" value={ticket.status} onChange={onStatusChange ? (status) => onStatusChange(ticket, status) : undefined} />
            <TicketTypeBadge value={ticket.type} />
            <PriorityBadge value={ticket.priority} />
          </>
        }
        meta={
          <div className="flex items-center gap-3">
            <div className="flex min-w-[9rem] flex-wrap items-center justify-end gap-2 text-xs font-semibold text-steel-500">
              <span className={`inline-flex items-center gap-1 ${overdue ? "text-crimson" : ""}`}>
                Fällig
                <InlineDateField value={ticket.dueDate} emptyLabel="Ohne Fälligkeit" onChange={onDueDateChange ? (dueDate) => onDueDateChange(ticket, dueDate) : undefined} />
              </span>
              {closedDate ? <span>Geschlossen {formatHumanDate(closedDate)}</span> : null}
            </div>
            <Avatar name={ticket.responsibleUser?.fullName ?? null} />
          </div>
        }
        footer={<TicketSupportFooter ticket={ticket} allTags={allTags} onTagsChange={onTagsChange} bordered={false} />}
        actions={
          <ActionMenu
            objectReference={objectReference("ticket", ticket.id)}
            items={[
              { label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: () => onOpen(ticket) },
              ...(onDelete ? [{ label: "Löschen", icon: <Trash2 size={16} />, onClick: () => onDelete(ticket), danger: true }] : [])
            ]}
          />
        }
        actionsIncludeObjectReference
        onOpen={() => onOpen(ticket)}
      />
    </div>
  );
}
