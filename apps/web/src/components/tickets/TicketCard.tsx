import type { Ticket } from "@taskmanager/shared-types";
import { CalendarClock, Edit3, GitBranch, Trash2 } from "lucide-react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogColor } from "../../utils/catalogs";
import { formatHumanDate, isOverdue } from "../../utils/date";
import { richTextToPlainText } from "../../utils/richText";
import { ActionMenu } from "../ui/ActionMenu";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusPill } from "../ui/StatusPill";
import { TicketTypeBadge } from "../ui/TicketTypeBadge";

interface TicketCardProps {
  ticket: Ticket;
  compact?: boolean;
  variant?: "card" | "row";
  onOpen: (ticket: Ticket) => void;
  onDelete?: (ticket: Ticket) => void;
}

const tagTones = ["violet", "teal", "magenta", "fern", "steel"] as const;

export function TicketCard({ ticket, compact = false, variant = "card", onOpen, onDelete }: TicketCardProps) {
  const catalogs = useCatalogs();
  const description = richTextToPlainText(ticket.description);
  const priorityColor = catalogColor(catalogs.entries, "priority", ticket.priority);
  const statusColor = catalogColor(catalogs.entries, "workStatus", ticket.status);

  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <TicketCard ticket={ticket} compact={compact} onOpen={onOpen} onDelete={onDelete} />
        </div>
        <TicketRow ticket={ticket} description={description} priorityColor={priorityColor} statusColor={statusColor} onOpen={onOpen} onDelete={onDelete} />
      </>
    );
  }

  return (
    <ItemCard
      accentColor={priorityColor}
      header={<TicketCardHeader ticket={ticket} />}
      body={<TicketCardBody description={description} />}
      footer={<TicketCardFooter ticket={ticket} />}
      onOpen={() => onOpen(ticket)}
      onEdit={() => onOpen(ticket)}
      onDelete={onDelete ? () => onDelete(ticket) : undefined}
      className={compact ? "p-4" : ""}
    />
  );
}

function TicketCardHeader({ ticket }: { ticket: Ticket }) {
  return (
    <div className="grid gap-2">
      <h3 className="line-clamp-2 text-sm font-semibold text-ink">{ticket.title}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill kind="workStatus" value={ticket.status} />
        <TicketTypeBadge value={ticket.type} />
      </div>
    </div>
  );
}

function TicketCardBody({ description }: { description: string }) {
  return description ? <p className="line-clamp-3 text-xs text-slate-600">{description}</p> : null;
}

function TicketCardFooter({ ticket }: { ticket: Ticket }) {
  const overdue = ticket.status !== "resolved" && ticket.status !== "closed" && isOverdue(ticket.dueDate);
  const hasMeta = ticket.subTicketCount > 0 || Boolean(ticket.dueDate);

  return (
    <div className="grid gap-3">
      {hasMeta ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-2 text-xs text-slate-600">
          {ticket.subTicketCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <GitBranch size={14} />
              {ticket.subTicketCount}
            </span>
          ) : null}
          {ticket.dueDate ? (
            <span className={`inline-flex items-center gap-1 ${overdue ? "text-crimson" : ""}`}>
              <CalendarClock size={14} />
              {formatHumanDate(ticket.dueDate)}
            </span>
          ) : null}
        </div>
      ) : null}
      {ticket.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {ticket.tags.map((tag, index) => (
            <Badge key={tag.id} tone={tagTones[index % tagTones.length]}>
              {tag.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TicketRow({ ticket, description, priorityColor, statusColor, onOpen, onDelete }: { ticket: Ticket; description: string; priorityColor: string; statusColor: string; onOpen: (ticket: Ticket) => void; onDelete?: (ticket: Ticket) => void }) {
  const overdue = ticket.status !== "resolved" && ticket.status !== "closed" && isOverdue(ticket.dueDate);

  return (
    <div className="hidden md:block">
      <ItemRow
        accentColor={priorityColor}
        statusIndicator={<span className="block h-3 w-3 rounded-full" style={{ backgroundColor: statusColor }} aria-hidden="true" />}
        title={ticket.title}
        description={description}
        pills={
          <>
            <StatusPill kind="workStatus" value={ticket.status} />
            <TicketTypeBadge value={ticket.type} />
            <PriorityBadge value={ticket.priority} />
          </>
        }
        meta={
          <div className="flex items-center gap-3">
            <span className={`inline-flex min-w-[82px] items-center gap-1 text-xs font-semibold ${overdue ? "text-crimson" : "text-slate-500"}`}>
              <CalendarClock size={14} />
              {ticket.dueDate ? formatHumanDate(ticket.dueDate) : "Ohne Datum"}
            </span>
            <Avatar name={ticket.assignee} />
          </div>
        }
        actions={
          <ActionMenu
            items={[
              { label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: () => onOpen(ticket) },
              ...(onDelete ? [{ label: "Löschen", icon: <Trash2 size={16} />, onClick: () => onDelete(ticket), danger: true }] : [])
            ]}
          />
        }
        onOpen={() => onOpen(ticket)}
      />
    </div>
  );
}
