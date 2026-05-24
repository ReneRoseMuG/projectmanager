import type { Milestone } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { uploadTaskAttachment } from "../api/attachments";
import { createEntityComment } from "../api/comments";
import { createTaskNote } from "../api/notes";
import { createSubtask } from "../api/subtasks";
import { setTaskTags } from "../api/tags";
import { addTicketRelation, createOwnerTicket, createSubTicket, createTicketNote, linkOwnerTicket, setTicketTags, uploadTicketAttachment } from "../api/tickets";
import { MilestoneListBoardView } from "../components/milestones/MilestoneListBoardView";
import { TaskForm, type TaskFormInput } from "../components/tasks/TaskForm";
import { TicketForm, type TicketFormInput } from "../components/tickets/TicketForm";
import { PageHero } from "../components/ui/PageHero";
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
import { invalidateTags } from "../queries/invalidation";
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
  const queryClient = useQueryClient();
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

  const createTask = async (input: TaskFormInput) => {
    const {
      tagIds,
      pendingSubtasks,
      pendingTickets,
      pendingComments,
      pendingNotes,
      pendingFiles,
      ...taskInput
    } = input;
    let created: Awaited<ReturnType<typeof taskActions.createTask>> | null = null;
    try {
      created = await taskActions.createTask(taskInput);
      if (!created) {
        throw new Error("Aufgabe konnte nicht angelegt werden");
      }
      if (tagIds.length > 0) {
        await setTaskTags(created.id, tagIds);
        await invalidateTags(queryClient);
      }
      for (const subtask of pendingSubtasks) {
        await createSubtask(created.id, subtask);
      }
      const ticketOwner = { type: "task" as const, id: created.id };
      for (const ticket of pendingTickets) {
        if (ticket.kind === "existing") {
          await linkOwnerTicket(ticketOwner, ticket.ticket.id);
        } else {
          await createOwnerTicket(ticketOwner, ticket.draft);
        }
      }
      for (const comment of pendingComments) {
        await createEntityComment("task", created.id, { body: comment.text });
      }
      for (const note of pendingNotes) {
        await createTaskNote(created.id, note);
      }
      for (const file of pendingFiles) {
        await uploadTaskAttachment(created.id, file.file);
      }
      showToast({ tone: "success", title: "Aufgabe angelegt" });
      return created;
    } catch (taskError) {
      showToast({
        tone: "error",
        title: created
          ? "Aufgabe wurde angelegt, aber nicht alle Zuordnungen konnten gespeichert werden"
          : "Aufgabe konnte nicht angelegt werden",
        message: errorMessage(taskError),
      });
      throw taskError;
    }
  };

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
    let created: Awaited<ReturnType<typeof ticketActions.createTicket>> | null = null;
    try {
      created = await ticketActions.createTicket(ticketInput);
      if (!created) {
        throw new Error("Ticket konnte nicht angelegt werden");
      }
      if (tagIds.length > 0) {
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
      for (const file of pendingFiles) {
        await uploadTicketAttachment(created.id, file.file);
      }
      showToast({ tone: "success", title: "Ticket angelegt" });
      return created;
    } catch (ticketError) {
      showToast({
        tone: "error",
        title: created
          ? "Ticket wurde angelegt, aber nicht alle Zuordnungen konnten gespeichert werden"
          : "Ticket konnte nicht angelegt werden",
        message: await errorMessageAsync(ticketError),
      });
      throw ticketError;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="list"
        title="Meilensteine"
        subtitle={`${milestones.milestones.length} Einträge`}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
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
      </div>
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
