import type { Ticket } from "@taskmanager/shared-types";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { TicketOwner } from "../api/tickets";
import { TicketListBoardView } from "../components/tickets/TicketListBoardView";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { PageHero } from "../components/ui/PageHero";
import { ProjectMilestoneFilterBar } from "../components/ui/ProjectMilestoneFilterBar";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessageAsync } from "../hooks/errors";
import { useMilestones } from "../hooks/useMilestones";
import { useProjects } from "../hooks/useProjects";
import { useStandaloneView } from "../hooks/useStandaloneView";
import { useTickets } from "../hooks/useTickets";
import { useViewMode } from "../hooks/useViewMode";
import { withStandaloneView } from "../utils/standalone";

function parseId(value: string | null): number | null {
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function setOptionalId(params: URLSearchParams, key: string, value: number | null): void {
  if (value) {
    params.set(key, String(value));
    return;
  }
  params.delete(key);
}

export function TicketsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const standalone = useStandaloneView();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { viewMode, setViewMode } = useViewMode(
    "kanban",
    "ticketBoard.viewMode",
  );
  const projects = useProjects();
  const milestones = useMilestones();
  const projectId = parseId(searchParams.get("projectId"));
  const milestoneId = parseId(searchParams.get("milestoneId"));
  const owner: TicketOwner | null = milestoneId
    ? { type: "milestone", id: milestoneId }
    : projectId
      ? { type: "project", id: projectId }
      : null;
  const tickets = useTickets(owner ?? undefined);
  const currentReturnTo = `${location.pathname}${location.search}`;
  const targetForMode = (to: string) => (standalone ? withStandaloneView(to) : to);

  const updateProjectFilter = (nextProjectId: number | null) => {
    const nextParams = new URLSearchParams(searchParams);
    setOptionalId(nextParams, "projectId", nextProjectId);
    nextParams.delete("milestoneId");
    setSearchParams(nextParams);
  };

  const updateMilestoneFilter = (nextMilestoneId: number | null) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("projectId");
    setOptionalId(nextParams, "milestoneId", nextMilestoneId);
    setSearchParams(nextParams);
  };

  const ticketCreateTarget = (status?: Ticket["status"]) => {
    const params = new URLSearchParams({ returnTo: currentReturnTo });
    if (status) {
      params.set("status", status);
    }
    if (owner) {
      params.set("ownerType", owner.type);
      params.set("ownerId", String(owner.id));
    }
    return targetForMode(`/tickets/new?${params.toString()}`);
  };

  const ticketOpenTarget = (ticket: Ticket) => {
    const params = new URLSearchParams({ returnTo: currentReturnTo });
    return targetForMode(`/tickets/${ticket.id}?${params.toString()}`);
  };

  const deleteTicket = async (ticket: Ticket) => {
    const approved = await confirm({
      title: "Ticket löschen?",
      body: ticket.title,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return;
    }
    try {
      await tickets.removeTicket(ticket.id);
      showToast({ tone: "success", title: "Ticket gelöscht" });
    } catch (ticketError) {
      showToast({
        tone: "error",
        title: "Ticket konnte nicht gelöscht werden",
        message: await errorMessageAsync(ticketError),
      });
    }
  };

  const updateTicketStatus = async (ticket: Ticket, status: Ticket["status"]) => {
    try {
      await tickets.updateTicket(ticket.id, { status, expectedVersion: ticket.version });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticketstatus konnte nicht geändert werden", message: await errorMessageAsync(ticketError) });
      throw ticketError;
    }
  };

  const updateTicketDueDate = async (ticket: Ticket, dueDate: string | null) => {
    try {
      await tickets.updateTicket(ticket.id, { dueDate, expectedVersion: ticket.version });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticketdatum konnte nicht geändert werden", message: await errorMessageAsync(ticketError) });
      throw ticketError;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="list"
        title="Tickets"
        subtitle={`${tickets.tickets.length} Einträge`}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        {tickets.error || projects.error || milestones.error ? (
          <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">
            {tickets.error ?? projects.error ?? milestones.error}
          </div>
        ) : null}

        <TicketListBoardView
          tickets={tickets.tickets}
          loading={tickets.loading || projects.loading || milestones.loading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAdd={() => navigate(ticketCreateTarget())}
          onAddStatus={(status) => navigate(ticketCreateTarget(status))}
          onOpen={(ticket) => navigate(ticketOpenTarget(ticket))}
          onDelete={deleteTicket}
          onStatusChange={updateTicketStatus}
          onDueDateChange={updateTicketDueDate}
          filters={
            <ProjectMilestoneFilterBar
              projects={projects.projects}
              milestones={milestones.milestones}
              projectId={milestoneId ? null : projectId}
              milestoneId={milestoneId}
              onProjectChange={updateProjectFilter}
              onMilestoneChange={updateMilestoneFilter}
            />
          }
        />
      </div>
    </div>
  );
}
