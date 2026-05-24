import type { DraftComment, DraftNote, MilestoneInput, Project, ProjectStatus } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { uploadMilestoneAttachment, uploadTaskAttachment } from "../api/attachments";
import { createEntityComment } from "../api/comments";
import { createMilestoneNote, createTaskNote } from "../api/notes";
import { createSubtask } from "../api/subtasks";
import { setTaskTags } from "../api/tags";
import { addTicketRelation, createOwnerTicket, createSubTicket, createTicketNote, linkOwnerTicket, setTicketTags, uploadTicketAttachment } from "../api/tickets";
import { MilestoneForm } from "../components/milestones/MilestoneForm";
import { ProjectListBoardView } from "../components/projects/ProjectListBoardView";
import { TaskForm, type TaskFormInput } from "../components/tasks/TaskForm";
import { TicketForm, type TicketFormInput } from "../components/tickets/TicketForm";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { FilterChips } from "../components/ui/FilterChips";
import { PageHeader } from "../components/ui/PageHeader";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage, errorMessageAsync } from "../hooks/errors";
import { useCatalogs } from "../hooks/useCatalogs";
import { useHasPermission } from "../hooks/usePermissions";
import { useMilestones } from "../hooks/useMilestones";
import { useProjects } from "../hooks/useProjects";
import { useStandaloneView } from "../hooks/useStandaloneView";
import { useTasks } from "../hooks/useTasks";
import { useTickets } from "../hooks/useTickets";
import { invalidateTags } from "../queries/invalidation";
import type { DraftFile } from "../types";
import { catalogEntriesByKind } from "../utils/catalogs";
import { withStandaloneView } from "../utils/standalone";

export function ProjectsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { projects, loading, error, updateProject, removeProject } = useProjects();
  const catalogs = useCatalogs();
  const standalone = useStandaloneView();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreateMilestones = useHasPermission("milestones", "write");
  const canCreateTasks = useHasPermission("tasks", "write");
  const canCreateTickets = useHasPermission("tickets", "write");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">(
    "all",
  );
  const [createMilestoneForProject, setCreateMilestoneForProject] = useState<Project | null>(null);
  const [createTaskForProject, setCreateTaskForProject] = useState<Project | null>(null);
  const [createTicketForProject, setCreateTicketForProject] = useState<Project | null>(null);
  const currentReturnTo = `${location.pathname}${location.search}`;
  const createTaskOwner = createTaskForProject ? { type: "project" as const, id: createTaskForProject.id } : null;
  const createTicketOwner = createTicketForProject ? { type: "project" as const, id: createTicketForProject.id } : null;
  const milestoneActions = useMilestones(null, createMilestoneForProject?.id ?? null);
  const taskActions = useTasks(createTaskOwner);
  const ticketActions = useTickets(createTicketOwner);

  const targetForMode = (to: string) => (standalone ? withStandaloneView(to) : to);
  const projectTarget = (path: string) => {
    const params = new URLSearchParams({ returnTo: currentReturnTo });
    return targetForMode(`${path}?${params.toString()}`);
  };

  const statusOptions = useMemo(
    () =>
      catalogEntriesByKind(catalogs.entries, "workStatus").map((entry) => ({
        value: entry.key,
        label: entry.label,
        color: entry.color,
        count: projects.filter((project) => project.status === entry.key)
          .length,
      })),
    [catalogs.entries, projects],
  );

  const filteredProjects = useMemo(() => {
    return projects.filter(
      (project) => statusFilter === "all" || project.status === statusFilter,
    );
  }, [projects, statusFilter]);

  const deleteProject = async (project: Project) => {
    const approved = await confirm({
      title: "Projekt löschen?",
      body: `Das Projekt "${project.name}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return;
    }
    try {
      await removeProject(project.id);
      showToast({ tone: "success", title: "Projekt gelöscht" });
    } catch (deleteError) {
      showToast({
        tone: "error",
        title: "Projekt konnte nicht gelöscht werden",
        message: errorMessage(deleteError),
      });
    }
  };

  const updateProjectStatus = async (project: Project, status: ProjectStatus) => {
    try {
      await updateProject(project.id, { status, expectedVersion: project.version });
    } catch (updateError) {
      showToast({ tone: "error", title: "Projektstatus konnte nicht geändert werden", message: errorMessage(updateError) });
      throw updateError;
    }
  };

  const createMilestone = async (input: MilestoneInput, tagIds: number[]) => {
    try {
      const created = await milestoneActions.createMilestone(input, tagIds);
      showToast({ tone: "success", title: "Meilenstein angelegt" });
      return created;
    } catch (createError) {
      showToast({
        tone: "error",
        title: "Meilenstein konnte nicht angelegt werden",
        message: errorMessage(createError),
      });
      throw createError;
    }
  };

  const postCreateMilestone = async (
    milestoneId: number,
    pending: {
      comments: DraftComment[];
      notes: DraftNote[];
      files: DraftFile[];
    },
  ) => {
    try {
      for (const comment of pending.comments) {
        await createEntityComment("milestone", milestoneId, { body: comment.text });
      }
      for (const note of pending.notes) {
        await createMilestoneNote(milestoneId, note);
      }
      for (const file of pending.files) {
        await uploadMilestoneAttachment(milestoneId, file.file);
      }
    } catch (createError) {
      showToast({
        tone: "error",
        title:
          "Meilenstein wurde erstellt, aber nicht alle Zuordnungen konnten gespeichert werden",
        message: errorMessage(createError),
      });
      throw createError;
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
    } catch (createError) {
      showToast({
        tone: "error",
        title: created
          ? "Aufgabe wurde angelegt, aber nicht alle Zuordnungen konnten gespeichert werden"
          : "Aufgabe konnte nicht angelegt werden",
        message: errorMessage(createError),
      });
      throw createError;
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
    } catch (createError) {
      showToast({
        tone: "error",
        title: created
          ? "Ticket wurde angelegt, aber nicht alle Zuordnungen konnten gespeichert werden"
          : "Ticket konnte nicht angelegt werden",
        message: await errorMessageAsync(createError),
      });
      throw createError;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-6">
      <PageHeader
        title="Projekte"
        subtitle={`${projects.length} Einträge`}
      />

      {error ? (
        <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">
          {error}
        </div>
      ) : null}
      <ProjectListBoardView
        projects={filteredProjects}
        loading={loading}
        onCreate={() => navigate(projectTarget("/projects/new"))}
        onEdit={(project) => navigate(projectTarget(`/projects/${project.id}`))}
        onDelete={(project) => void deleteProject(project)}
        onStatusChange={updateProjectStatus}
        onCreateMilestone={canCreateMilestones ? (project) => setCreateMilestoneForProject(project) : undefined}
        onCreateTask={canCreateTasks ? (project) => setCreateTaskForProject(project) : undefined}
        onCreateTicket={canCreateTickets ? (project) => setCreateTicketForProject(project) : undefined}
        filters={
          !loading ? (
            <FilterChips
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              allCount={projects.length}
            />
          ) : null
        }
      />
      <MilestoneForm
        open={createMilestoneForProject !== null}
        projects={projects}
        initialProjectId={createMilestoneForProject?.id}
        lockProjectSelection
        closeOnSubmit
        onSubmit={createMilestone}
        onPostCreate={postCreateMilestone}
        onClose={() => setCreateMilestoneForProject(null)}
      />
      <TaskForm
        open={createTaskForProject !== null}
        owner={createTaskOwner ?? undefined}
        closeOnSubmit
        onSubmit={createTask}
        onClose={() => setCreateTaskForProject(null)}
      />
      <TicketForm
        open={createTicketForProject !== null}
        owner={createTicketOwner ?? undefined}
        closeOnSubmit
        onSubmit={createTicket}
        onClose={() => setCreateTicketForProject(null)}
      />
    </div>
  );
}
