import type { TicketStatus } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
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
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage, errorMessageAsync } from "../hooks/errors";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useTicketDetail } from "../hooks/useTicketDetail";
import { useTickets } from "../hooks/useTickets";
import { invalidateTags } from "../queries/invalidation";
import { withStandaloneView } from "../utils/standalone";

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
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const isCreateMode = params.id === undefined;
  const ticketId = isCreateMode ? null : Number(params.id);
  const owner = parseTicketOwner(searchParams);
  const standalone = searchParams.get("standalone") === "1";
  const tickets = useTickets(owner);
  const detail = useTicketDetail(
    !isCreateMode && Number.isFinite(ticketId) ? ticketId : null,
  );
  useDocumentTitle(isCreateMode ? "[Tkt.] Neu" : detail.ticket ? `[Tkt.] ${detail.ticket.title}` : "[Tkt.]");
  const returnTo = searchParams.get("returnTo") ?? (searchParams.get("standalone") === "1" ? withStandaloneView("/tickets") : "/tickets");
  const currentRoute = !isCreateMode && ticketId !== null && Number.isFinite(ticketId)
    ? `/tickets/${ticketId}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
    : "/tickets";
  const targetForMode = (to: string) => (standalone ? withStandaloneView(to) : to);

  const closePage = () => navigate(returnTo);
  const openInTab =
    !isCreateMode && ticketId !== null && Number.isFinite(ticketId)
      ? () => {
          window.open(withStandaloneView(`/tickets/${ticketId}`), "_blank");
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
      reporterUserId: input.reporterUserId,
      responsibleUserId: input.responsibleUserId,
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

  const autoSaveTicket = useCallback(async (input: TicketFormInput): Promise<void> => {
    if (!detail.ticket) return;
    const t = detail.ticket;
    const { tagIds } = input;
    const ticketInput = {
      title: input.title,
      type: input.type,
      description: input.description,
      status: input.status,
      priority: input.priority,
      resolution: input.resolution,
      reporterUserId: input.reporterUserId,
      responsibleUserId: input.responsibleUserId,
      environment: input.environment,
      affectedVersion: input.affectedVersion,
      dueDate: input.dueDate,
    };

    const fieldsChanged =
      ticketInput.title !== t.title ||
      ticketInput.type !== t.type ||
      (ticketInput.description ?? "") !== (t.description ?? "") ||
      ticketInput.status !== t.status ||
      ticketInput.priority !== t.priority ||
      (ticketInput.resolution ?? null) !== (t.resolution ?? null) ||
      ticketInput.reporterUserId !== t.reporterUserId ||
      ticketInput.responsibleUserId !== t.responsibleUserId ||
      (ticketInput.environment ?? null) !== (t.environment ?? null) ||
      (ticketInput.affectedVersion ?? null) !== (t.affectedVersion ?? null) ||
      ticketInput.dueDate !== t.dueDate;

    const currentTagIds = t.tags.map((tag) => tag.id).sort((a, b) => a - b);
    const nextTagIds = [...tagIds].sort((a, b) => a - b);
    const tagsChanged =
      nextTagIds.length !== currentTagIds.length ||
      nextTagIds.some((id, i) => id !== currentTagIds[i]);

    if (!fieldsChanged && !tagsChanged) return;

    await Promise.all([
      fieldsChanged
        ? detail.updateTicket({ ...ticketInput, expectedVersion: t.version })
        : Promise.resolve(undefined),
      tagsChanged ? setTicketTags(t.id, tagIds) : Promise.resolve(undefined),
    ]);
    if (tagsChanged) void invalidateTags(queryClient);
  }, [detail, queryClient]);

  const handleDeleteTicket = useCallback(async () => {
    if (!detail.ticket) return;
    const approved = await confirm({
      title: "Ticket löschen?",
      body: `Das Ticket „${detail.ticket.title}" wird unwiderruflich entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) return;
    try {
      await tickets.removeTicket(detail.ticket.id);
      closePage();
    } catch (err) {
      showToast({ tone: "error", title: "Ticket konnte nicht gelöscht werden", message: errorMessage(err) });
    }
  }, [detail.ticket, tickets, confirm, showToast]);

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
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel-600">
        Ticket nicht gefunden
      </div>
    );
  }

  if (detail.loading) {
    return <DetailPageSkeleton />;
  }

  if (!detail.ticket) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel-600">
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
        onSubmit={autoSaveTicket}
        onAutoSave={autoSaveTicket}
        onDelete={handleDeleteTicket}
        onClose={closePage}
        onChanged={detail.reload}
        onOpenInTab={openInTab}
        onOpenTicket={(targetTicket) => {
          navigate(targetForMode(`/tickets/${targetTicket.id}?returnTo=${encodeURIComponent(currentRoute)}`));
        }}
      />
    </div>
  );
}
