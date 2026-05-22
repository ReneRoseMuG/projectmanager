import type { Ticket } from "@taskmanager/shared-types";
import { Edit3, GitBranch, Trash2 } from "lucide-react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogColor } from "../../utils/catalogs";
import { isOverdue } from "../../utils/date";
import { richTextToPlainText } from "../../utils/richText";
import { ActionMenu } from "../ui/ActionMenu";
import { Avatar } from "../ui/Avatar";
import { InlineDateField } from "../ui/InlineDateField";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { ParentBadge } from "../ui/ParentBadge";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusPill } from "../ui/StatusPill";
import { TagFooter } from "../ui/TagFooter";
import { TicketTypeBadge } from "../ui/TicketTypeBadge";

interface TicketCardProps {
  ticket: Ticket;
  compact?: boolean;
  variant?: "card" | "row";
  onOpen: (ticket: Ticket) => void;
  onDelete?: (ticket: Ticket) => void;
  onStatusChange?: (ticket: Ticket, status: Ticket["status"]) => void | Promise<unknown>;
  onDueDateChange?: (ticket: Ticket, dueDate: string | null) => void | Promise<unknown>;
}

export function TicketCard({ ticket, compact = false, variant = "card", onOpen, onDelete, onStatusChange, onDueDateChange }: TicketCardProps) {
  const catalogs = useCatalogs();
  const description = richTextToPlainText(ticket.description);
  const statusColor = catalogColor(catalogs.entries, "workStatus", ticket.status);

  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <TicketCard ticket={ticket} compact={compact} onOpen={onOpen} onDelete={onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} />
        </div>
        <TicketRow ticket={ticket} description={description} statusColor={statusColor} onOpen={onOpen} onDelete={onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} />
      </>
    );
  }

  return (
    <ItemCard
      accentColor={statusColor}
      header={<TicketCardHeader ticket={ticket} onStatusChange={onStatusChange} />}
      body={<TicketCardBody description={description} />}
      footer={<TicketCardFooter ticket={ticket} onDueDateChange={onDueDateChange} />}
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
  return description ? <p className="line-clamp-3 text-xs text-slate-600">{description}</p> : null;
}

function TicketCardFooter({ ticket, onDueDateChange }: { ticket: Ticket; onDueDateChange?: (ticket: Ticket, dueDate: string | null) => void | Promise<unknown> }) {
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
            <InlineDateField value={ticket.dueDate} className={overdue ? "text-crimson" : ""} onChange={onDueDateChange ? (dueDate) => onDueDateChange(ticket, dueDate) : undefined} />
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <ParentBadge parent={ticket.visibleParent} />
      </div>
      <TagFooter tags={ticket.tags} />
    </div>
  );
}

function TicketRow({ ticket, description, statusColor, onOpen, onDelete, onStatusChange, onDueDateChange }: { ticket: Ticket; description: string; statusColor: string; onOpen: (ticket: Ticket) => void; onDelete?: (ticket: Ticket) => void; onStatusChange?: (ticket: Ticket, status: Ticket["status"]) => void | Promise<unknown>; onDueDateChange?: (ticket: Ticket, dueDate: string | null) => void | Promise<unknown> }) {
  const overdue = ticket.status !== "resolved" && ticket.status !== "closed" && isOverdue(ticket.dueDate);

  return (
    <div className="hidden md:block">
      <ItemRow
        accentColor={statusColor}
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
            <span className={`inline-flex min-w-[82px] items-center gap-1 text-xs font-semibold ${overdue ? "text-crimson" : "text-slate-500"}`}>
              <InlineDateField value={ticket.dueDate} onChange={onDueDateChange ? (dueDate) => onDueDateChange(ticket, dueDate) : undefined} />
            </span>
            <Avatar name={ticket.assignee} />
          </div>
        }
        footer={<><ParentBadge parent={ticket.visibleParent} /><TagFooter tags={ticket.tags} /></>}
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
