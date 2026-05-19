import type { TicketStatus } from "@taskmanager/shared-types";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { setTicketTags, type TicketOwner } from "../api/tickets";
import { TicketForm, type TicketFormInput } from "../components/tickets/TicketForm";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage, errorMessageAsync } from "../hooks/errors";
import { useTicketDetail } from "../hooks/useTicketDetail";
import { useTickets } from "../hooks/useTickets";

function parseTicketOwner(searchParams: URLSearchParams): TicketOwner | undefined {
  const ownerType = searchParams.get("ownerType");
  const ownerIdParam = searchParams.get("ownerId");
  const ownerId = ownerIdParam ? Number(ownerIdParam) : NaN;
  if ((ownerType === "project" || ownerType === "milestone" || ownerType === "task" || ownerType === "feature" || ownerType === "useCase") && Number.isFinite(ownerId)) {
    return { type: ownerType, id: ownerId };
  }
  return undefined;
}

function parseTicketStatus(value: string | null): TicketStatus {
  if (value === "in_progress" || value === "in_review" || value === "resolved" || value === "closed") {
    return value;
  }
  return "open";
}

export function TicketDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isCreateMode = params.id === undefined;
  const ticketId = isCreateMode ? null : Number(params.id);
  const owner = parseTicketOwner(searchParams);
  const tickets = useTickets(owner);
  const detail = useTicketDetail(!isCreateMode && Number.isFinite(ticketId) ? ticketId : null);
  const returnTo = searchParams.get("returnTo") ?? "/tickets";

  const closePage = () => navigate(returnTo);

  const createTicket = async (input: TicketFormInput) => {
    const { tagIds, ...ticketInput } = input;
    try {
      const created = await tickets.createTicket(ticketInput);
      if (created && tagIds.length > 0) {
        await setTicketTags(created.id, tagIds);
      }
      await tickets.reload();
      showToast({ tone: "success", title: "Ticket erstellt" });
      if (created) {
        navigate(`/tickets/${created.id}?returnTo=${encodeURIComponent(returnTo)}`);
      }
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticket konnte nicht erstellt werden", message: await errorMessageAsync(ticketError) });
      throw ticketError;
    }
  };

  const saveTicket = async (input: TicketFormInput) => {
    const ticket = detail.ticket;
    if (!ticket) {
      return;
    }
    const { tagIds, ...ticketInput } = input;
    try {
      await detail.updateTicket({ ...ticketInput, expectedVersion: ticket.version });
      await setTicketTags(ticket.id, tagIds);
      await detail.reload();
      await tickets.reload();
      showToast({ tone: "success", title: "Ticket gespeichert" });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticket konnte nicht gespeichert werden", message: errorMessage(ticketError) });
      throw ticketError;
    }
  };

  if (isCreateMode) {
    return (
      <div className="mx-auto max-w-7xl">
        <TicketForm open variant="page" closeOnSubmit={false} initialStatus={parseTicketStatus(searchParams.get("status"))} onSubmit={createTicket} onClose={closePage} />
      </div>
    );
  }

  if (!Number.isFinite(ticketId)) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Ticket nicht gefunden</div>;
  }

  if (detail.loading) {
    return <DetailPageSkeleton />;
  }

  if (!detail.ticket) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Ticket nicht gefunden</div>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <TicketForm open ticket={detail.ticket} variant="page" closeOnSubmit={false} onSubmit={saveTicket} onClose={closePage} />
    </div>
  );
}
