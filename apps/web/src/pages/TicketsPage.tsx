import type { Ticket, TicketStatus } from "@taskmanager/shared-types";
import { useState } from "react";
import { createTicket as createTicketRequest, setTicketTags } from "../api/tickets";
import { TicketDetail } from "../components/tickets/TicketDetail";
import { TicketForm, type TicketFormInput } from "../components/tickets/TicketForm";
import { TicketListBoardView } from "../components/tickets/TicketListBoardView";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useProjects } from "../hooks/useProjects";
import { useTickets } from "../hooks/useTickets";
import { useViewMode } from "../hooks/useViewMode";

export function TicketsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const projects = useProjects();
  const { viewMode, setViewMode } = useViewMode("kanban");
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const tickets = useTickets(selectedProjectId);
  const [formOpen, setFormOpen] = useState(false);
  const [initialStatus, setInitialStatus] = useState<TicketStatus>("open");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const createTicket = async (input: TicketFormInput) => {
    const targetProjectId = selectedProjectId ?? projects.projects[0]?.id;
    if (targetProjectId === undefined) {
      showToast({ tone: "error", title: "Ticket konnte nicht erstellt werden", message: "Kein Projekt vorhanden." });
      throw new Error("No project available");
    }

    const { tagIds, ...ticketInput } = input;
    try {
      const created = await createTicketRequest(targetProjectId, ticketInput);
      if (created && tagIds.length > 0) {
        await setTicketTags(created.id, tagIds);
      }
      await tickets.reload();
      showToast({ tone: "success", title: "Ticket erstellt" });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticket konnte nicht erstellt werden", message: errorMessage(ticketError) });
      throw ticketError;
    }
  };

  const deleteTicket = async (ticket: Ticket) => {
    const approved = await confirm({
      title: "Ticket löschen?",
      body: ticket.title,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await tickets.removeTicket(ticket.id);
      showToast({ tone: "success", title: "Ticket gelöscht" });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticket konnte nicht gelöscht werden", message: errorMessage(ticketError) });
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tickets</h1>
          <p className="text-sm text-slate-600">{tickets.tickets.length} Einträge</p>
        </div>
      </header>

      {tickets.error ? <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">{tickets.error}</div> : null}

      <TicketListBoardView
        tickets={tickets.tickets}
        loading={tickets.loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={() => {
          setInitialStatus("open");
          setFormOpen(true);
        }}
        onAddStatus={(status) => {
          setInitialStatus(status);
          setFormOpen(true);
        }}
        onOpen={(ticket) => setSelectedTicketId(ticket.id)}
        onDelete={deleteTicket}
        filters={
          <select
            className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
            value={selectedProjectId ?? "all"}
            onChange={(event) => setSelectedProjectId(event.target.value === "all" ? undefined : Number(event.target.value))}
          >
            <option value="all">Alle Projekte</option>
            {projects.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        }
      />

      <TicketForm open={formOpen} initialStatus={initialStatus} onSubmit={createTicket} onClose={() => setFormOpen(false)} />
      <TicketDetail ticketId={selectedTicketId} open={selectedTicketId !== null} onClose={() => setSelectedTicketId(null)} onChanged={tickets.reload} />
    </div>
  );
}
