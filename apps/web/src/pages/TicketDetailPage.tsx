import type { TicketStatus } from "@taskmanager/shared-types";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  addTicketRelation,
  createSubTicket,
  createTicketNote,
  setTicketTags,
  type TicketOwner,
  uploadTicketAttachment,
} from "../api/tickets";
import { createEntityComment } from "../api/comments";
import {
  TicketForm,
  type TicketFormInput,
} from "../components/tickets/TicketForm";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage, errorMessageAsync } from "../hooks/errors";
import { useTicketDetail } from "../hooks/useTicketDetail";
import { useTickets } from "../hooks/useTickets";

function parseTicketOwner(
  searchParams: URLSearchParams,
): TicketOwner | undefined {
  const ownerType = searchParams.get("ownerType");
  const ownerIdParam = searchParams.get("ownerId");
  const ownerId = ownerIdParam ? Number(ownerIdParam) : NaN;
  if (
    (ownerType === "project" ||
      ownerType === "milestone" ||
      ownerType === "task" ||
      ownerType === "feature" ||
      ownerType === "useCase") &&
    Number.isFinite(ownerId)
  ) {
    return { type: ownerType, id: ownerId };
  }
  return undefined;
}

function parseTicketStatus(value: string | null): TicketStatus {
  return value && value.trim().length > 0 ? value : "open";
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
  const detail = useTicketDetail(
    !isCreateMode && Number.isFinite(ticketId) ? ticketId : null,
  );
  const returnTo = searchParams.get("returnTo") ?? "/tickets";
  const currentRoute = !isCreateMode && ticketId !== null && Number.isFinite(ticketId)
    ? `/tickets/${ticketId}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
    : "/tickets";

  const closePage = () => navigate(returnTo);
  const openInTab =
    !isCreateMode && ticketId !== null && Number.isFinite(ticketId)
      ? () => {
          window.open(`/tickets/${ticketId}`, "_blank");
          navigate(returnTo);
        }
      : undefined;

  const createTicket = async (input: TicketFormInput) => {
    const { tagIds, pendingSubTickets, pendingRelations, pendingComments, pendingNotes, pendingFiles } = input;
    const ticketInput = {
      title: input.title,
      type: input.type,
      description: input.description,
      status: input.status,
      priority: input.priority,
      reporter: input.reporter,
      assignee: input.assignee,
      environment: input.environment,
      affectedVersion: input.affectedVersion,
      dueDate: input.dueDate,
    };
    let created: Awaited<ReturnType<typeof tickets.createTicket>> | null = null;
    try {
      created = await tickets.createTicket(ticketInput);
      if (!created) {
        throw new Error("Ticket konnte nicht erstellt werden");
      }
      if (created && tagIds.length > 0) {
        await setTicketTags(created.id, tagIds);
      }
      for (const subTicket of pendingSubTickets) {
        await createSubTicket(created.id, subTicket);
      }
      for (const relation of pendingRelations) {
        await addTicketRelation(created.id, {
          targetTicketId: relation.ticket.id,
          relationType: relation.relationType,
        });
      }
      for (const comment of pendingComments) {
        await createEntityComment("ticket", created.id, { body: comment.text });
      }
      for (const note of pendingNotes) {
        await createTicketNote(created.id, note);
      }
      for (let index = 0; index < pendingFiles.length; index += 1) {
        const file = pendingFiles[index];
        if (!file) {
          continue;
        }
        await uploadTicketAttachment(created.id, file.file);
      }
      await tickets.reload();
      showToast({ tone: "success", title: "Ticket erstellt" });
    } catch (ticketError) {
      showToast({
        tone: "error",
        title: created
          ? "Ticket wurde erstellt, aber nicht alle Zuordnungen konnten gespeichert werden"
          : "Ticket konnte nicht erstellt werden",
        message: await errorMessageAsync(ticketError),
      });
      throw ticketError;
    }
  };

  const saveTicket = async (input: TicketFormInput) => {
    const ticket = detail.ticket;
    if (!ticket) {
      return;
    }
    const tagIds = input.tagIds;
    const ticketInput = {
      title: input.title,
      type: input.type,
      description: input.description,
      status: input.status,
      priority: input.priority,
      resolution: input.resolution,
      reporter: input.reporter,
      assignee: input.assignee,
      environment: input.environment,
      affectedVersion: input.affectedVersion,
      dueDate: input.dueDate,
    };
    try {
      await detail.updateTicket({
        ...ticketInput,
        expectedVersion: ticket.version,
      });
      await setTicketTags(ticket.id, tagIds);
      await detail.reload();
      await tickets.reload();
      showToast({ tone: "success", title: "Ticket gespeichert" });
    } catch (ticketError) {
      showToast({
        tone: "error",
        title: "Ticket konnte nicht gespeichert werden",
        message: errorMessage(ticketError),
      });
      throw ticketError;
    }
  };

  if (isCreateMode) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <TicketForm
          open
          variant="page"
          owner={owner}
          initialStatus={parseTicketStatus(searchParams.get("status"))}
          onSubmit={createTicket}
          onClose={closePage}
        />
      </div>
    );
  }

  if (!Number.isFinite(ticketId)) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">
        Ticket nicht gefunden
      </div>
    );
  }

  if (detail.loading) {
    return <DetailPageSkeleton />;
  }

  if (!detail.ticket) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">
        Ticket nicht gefunden
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <TicketForm
        open
        ticket={detail.ticket}
        owner={owner}
        variant="page"
        onSubmit={saveTicket}
        onClose={closePage}
        onChanged={detail.reload}
        onOpenInTab={openInTab}
        onOpenTicket={(targetTicket) => {
          navigate(`/tickets/${targetTicket.id}?returnTo=${encodeURIComponent(currentRoute)}`);
        }}
      />
    </div>
  );
}
