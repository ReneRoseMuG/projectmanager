import type { Milestone, TaskInput, TicketInput } from "@taskmanager/shared-types";
import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { MilestoneListBoardView } from "../components/milestones/MilestoneListBoardView";
import { TaskForm } from "../components/tasks/TaskForm";
import { TicketForm } from "../components/tickets/TicketForm";
import { PageHeader } from "../components/ui/PageHeader";
import { ProjectMilestoneFilterBar } from "../components/ui/ProjectMilestoneFilterBar";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage, errorMessageAsync } from "../hooks/errors";
import { useMilestones } from "../hooks/useMilestones";
import { useHasPermission } from "../hooks/usePermissions";
import { useProjects } from "../hooks/useProjects";
import { useStandaloneView } from "../hooks/useStandaloneView";
import { useTasks } from "../hooks/useTasks";
import { useTickets } from "../hooks/useTickets";
import type { ViewMode } from "../types";
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

export function MilestonesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const standalone = useStandaloneView();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreateTasks = useHasPermission("tasks", "write");
  const canCreateTickets = useHasPermission("tickets", "write");
  const projects = useProjects();
  const projectId = parseId(searchParams.get("projectId"));
  const milestones = useMilestones(null, projectId);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [createTaskForMilestone, setCreateTaskForMilestone] = useState<Milestone | null>(null);
  const [createTicketForMilestone, setCreateTicketForMilestone] = useState<Milestone | null>(null);
  const createTaskOwner = createTaskForMilestone ? { type: "milestone" as const, id: createTaskForMilestone.id } : null;
  const createTicketOwner = createTicketForMilestone ? { type: "milestone" as const, id: createTicketForMilestone.id } : null;
  const taskActions = useTasks(createTaskOwner);
  const ticketActions = useTickets(createTicketOwner);

  const currentReturnTo = `${location.pathname}${location.search}`;
  const targetForMode = (to: string) => (standalone ? withStandaloneView(to) : to);

  const updateProjectFilter = (nextProjectId: number | null) => {
    const nextParams = new URLSearchParams(searchParams);
    setOptionalId(nextParams, "projectId", nextProjectId);
    setSearchParams(nextParams);
  };

  const openMilestone = (milestone: Milestone) => {
    const params = new URLSearchParams({ returnTo: currentReturnTo });
    navigate(targetForMode(`/milestones/${milestone.id}?${params.toString()}`));
  };

  const openCreate = () => {
    const params = new URLSearchParams({ returnTo: currentReturnTo });
    if (projectId) {
      params.set("projectId", String(projectId));
    }
    navigate(targetForMode(`/milestones/new?${params.toString()}`));
  };

  const deleteMilestone = async (milestone: Milestone) => {
    const approved = await confirm({
      title: "Meilenstein löschen?",
      body: `Der Meilenstein "${milestone.name}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return;
    }
    try {
      await milestones.removeMilestone(milestone.id);
      showToast({ tone: "success", title: "Meilenstein gelöscht" });
    } catch (milestoneError) {
      showToast({
        tone: "error",
        title: "Meilenstein konnte nicht gelöscht werden",
        message: errorMessage(milestoneError),
      });
    }
  };

  const updateMilestoneStatus = async (milestone: Milestone, status: Milestone["status"]) => {
    try {
      await milestones.updateMilestone(milestone.id, { status, expectedVersion: milestone.version });
    } catch (milestoneError) {
      showToast({ tone: "error", title: "Meilensteinstatus konnte nicht geändert werden", message: errorMessage(milestoneError) });
      throw milestoneError;
    }
  };

  const updateMilestoneDueDate = async (milestone: Milestone, dueDate: string | null) => {
    try {
      await milestones.updateMilestone(milestone.id, { dueDate, expectedVersion: milestone.version });
    } catch (milestoneError) {
      showToast({ tone: "error", title: "Meilensteindatum konnte nicht geändert werden", message: errorMessage(milestoneError) });
      throw milestoneError;
    }
  };

  const createTask = async (input: TaskInput) => {
    try {
      const created = await taskActions.createTask(input);
      showToast({ tone: "success", title: "Aufgabe angelegt" });
      return created ?? undefined;
    } catch (taskError) {
      showToast({
        tone: "error",
        title: "Aufgabe konnte nicht angelegt werden",
        message: errorMessage(taskError),
      });
      throw taskError;
    }
  };

  const createTicket = async (input: TicketInput) => {
    try {
      const created = await ticketActions.createTicket(input);
      showToast({ tone: "success", title: "Ticket angelegt" });
      return created;
    } catch (ticketError) {
      showToast({
        tone: "error",
        title: "Ticket konnte nicht angelegt werden",
        message: await errorMessageAsync(ticketError),
      });
      throw ticketError;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-6">
      <PageHeader
        title="Meilensteine"
        subtitle={`${milestones.milestones.length} Einträge`}
      />

      {milestones.error || projects.error ? (
        <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">
          {milestones.error ?? projects.error}
        </div>
      ) : null}

      <MilestoneListBoardView
        milestones={milestones.milestones}
        loading={milestones.loading || projects.loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreate={openCreate}
        onEdit={openMilestone}
        onDelete={(milestone) => void deleteMilestone(milestone)}
        onStatusChange={updateMilestoneStatus}
        onDueDateChange={updateMilestoneDueDate}
        onCreateTask={canCreateTasks ? (milestone) => setCreateTaskForMilestone(milestone) : undefined}
        onCreateTicket={canCreateTickets ? (milestone) => setCreateTicketForMilestone(milestone) : undefined}
        filters={
          <ProjectMilestoneFilterBar
            projects={projects.projects}
            projectId={projectId}
            onProjectChange={updateProjectFilter}
          />
        }
      />
      <TaskForm
        open={createTaskForMilestone !== null}
        owner={createTaskOwner ?? undefined}
        closeOnSubmit
        onSubmit={createTask}
        onClose={() => setCreateTaskForMilestone(null)}
      />
      <TicketForm
        open={createTicketForMilestone !== null}
        owner={createTicketOwner ?? undefined}
        closeOnSubmit
        onSubmit={createTicket}
        onClose={() => setCreateTicketForMilestone(null)}
      />
    </div>
  );
}
