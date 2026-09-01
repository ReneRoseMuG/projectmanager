import type { Milestone } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { FilterChips } from "../components/ui/FilterChips";
import { LoadMoreIndicator } from "../components/ui/LoadMoreIndicator";
import { PageHero } from "../components/ui/PageHero";
import { ProjectMilestoneFilterBar } from "../components/ui/ProjectMilestoneFilterBar";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage, errorMessageAsync } from "../hooks/errors";
import { useCatalogs } from "../hooks/useCatalogs";
import { useMilestoneLibrary, useMilestones } from "../hooks/useMilestones";
import { useHasPermission } from "../hooks/usePermissions";
import { useProjects } from "../hooks/useProjects";
import { useStandaloneView } from "../hooks/useStandaloneView";
import { useStatusCascadeWorkflow } from "../hooks/useStatusCascadeWorkflow";
import { useTasks } from "../hooks/useTasks";
import { useTickets } from "../hooks/useTickets";
import { invalidateTags } from "../queries/invalidation";
import type { MilestoneListFilter } from "../api/milestones";
import type { ViewMode } from "../types";
import { catalogEntriesByKind } from "../utils/catalogs";
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
  const statusCascade = useStatusCascadeWorkflow();
  const canCreateTasks = useHasPermission("tasks", "write");
  const canCreateTickets = useHasPermission("tickets", "write");
  const catalogs = useCatalogs();
  const projects = useProjects();
  const projectId = parseId(searchParams.get("projectId"));
  // `useMilestones` liefert Mutationen und – bei gewähltem Projekt – die projektgebundene
  // Liste (byProject, unpaginiert wie bisher). Ohne Projektwahl zeigt die Seite die globale,
  // serverseitig gefilterte/paginierte Liste aus `useMilestoneLibrary`.
  const milestones = useMilestones(null, projectId);
  const usePaginatedList = projectId === null;
  const [statusFilter, setStatusFilter] = useState<Milestone["status"] | "all">("all");
  const [search, setSearch] = useState<string>("");

  // Serverseitiger Filter der globalen Liste: Status (Gleichheit, wie bisher clientseitig)
  // + Freitextsuche `q` (Name). Bildet die bisher clientseitige Filterung der Hauptseite nach.
  const libraryFilter = useMemo<MilestoneListFilter>(() => {
    const next: MilestoneListFilter = {};
    if (statusFilter !== "all") {
      next.status = statusFilter;
    }
    if (search.trim()) {
      next.q = search.trim();
    }
    return next;
  }, [statusFilter, search]);

  // Globale Liste lädt progressiv nach: der erste Block erscheint sofort, weitere Blöcke werden
  // sequenziell angehängt (kein Seitenzahl-Blättern mehr). Status/Suche wirken serverseitig je
  // Block; ein Filterwechsel startet das Nachladen über den geänderten queryKey neu.
  const library = useMilestoneLibrary(libraryFilter);

  // Angezeigte Liste: global paginiert (ohne Projektwahl, Server filtert) oder byProject
  // (mit Projektwahl, unpaginiert). Da die BoardView im kontrollierten Modus läuft, wird der
  // byProject-Pfad hier clientseitig mit denselben Filtern (Status/Suche) nachgefiltert, damit
  // Status und Suche in beiden Modi identisch wirken.
  const displayedMilestones = useMemo(() => {
    if (usePaginatedList) {
      return library.milestones;
    }
    const normalized = search.trim().toLocaleLowerCase("de-DE");
    return milestones.milestones.filter(
      (milestone) =>
        (statusFilter === "all" || milestone.status === statusFilter) &&
        (normalized === "" || milestone.name.toLocaleLowerCase("de-DE").includes(normalized)),
    );
  }, [usePaginatedList, library.milestones, milestones.milestones, statusFilter, search]);
  const listLoading = usePaginatedList ? library.loading : milestones.loading;
  const listError = usePaginatedList ? library.error : milestones.error;

  // Status-Chip-Counts über die volle (globale bzw. byProject) Liste aus `useMilestones` —
  // analog ProjectsPage, das die Counts aus der vollen `useProjects()`-Liste zieht. Diese
  // Liste ist unabhängig von Server-Filter/Pagination und liefert stabile Gesamtzahlen.
  const statusOptions = useMemo(
    () =>
      catalogEntriesByKind(catalogs.entries, "workStatus").map((entry) => ({
        value: entry.key as Milestone["status"],
        label: entry.label,
        color: entry.color,
        count: milestones.milestones.filter((milestone) => milestone.status === entry.key).length,
      })),
    [catalogs.entries, milestones.milestones],
  );

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
      const updated = await milestones.updateMilestone(milestone.id, { status, expectedVersion: milestone.version });
      await statusCascade.startMilestoneCascade(milestone, updated);
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

  const changeMilestoneTags = async (milestoneId: number, tagIds: number[]) => {
    try {
      await milestones.updateMilestoneTags(milestoneId, tagIds);
    } catch (milestoneError) {
      showToast({ tone: "error", title: "Meilenstein-Tags konnten nicht geändert werden", message: errorMessage(milestoneError) });
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
      reporterUserId: input.reporterUserId,
      responsibleUserId: input.responsibleUserId,
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
        subtitle={`${usePaginatedList ? library.total : milestones.milestones.length} Einträge`}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        {listError || projects.error ? (
          <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">
            {listError ?? projects.error}
          </div>
        ) : null}

        <MilestoneListBoardView
          milestones={displayedMilestones}
          loading={listLoading || projects.loading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onCreate={openCreate}
          onEdit={openMilestone}
          onOpenInTab={(milestone) => window.open(withStandaloneView(`/milestones/${milestone.id}`), "_blank")}
          onDelete={(milestone) => void deleteMilestone(milestone)}
          onStatusChange={updateMilestoneStatus}
          onDueDateChange={updateMilestoneDueDate}
          onTagsChange={changeMilestoneTags}
          onCreateTask={canCreateTasks ? (milestone) => setCreateTaskForMilestone(milestone) : undefined}
          onCreateTicket={canCreateTickets ? (milestone) => setCreateTicketForMilestone(milestone) : undefined}
          searchValue={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          filters={
            <div className="flex flex-wrap items-end gap-3">
              <ProjectMilestoneFilterBar
                projects={projects.projects}
                projectId={projectId}
                onProjectChange={updateProjectFilter}
              />
              <FilterChips
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
                allCount={milestones.milestones.length}
              />
            </div>
          }
        />
        {usePaginatedList ? (
          <LoadMoreIndicator loadedCount={library.loadedCount} total={library.total} loadingMore={library.loadingMore} />
        ) : null}
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
      {statusCascade.dialog}
    </div>
  );
}
