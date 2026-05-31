import type { CatalogEntry, Milestone, Project, ProjectStatus, TaskBoardItem, TaskStatus, Ticket, TicketStatus } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { getProjectMilestones } from "../api/milestones";
import { getOwnerTasks } from "../api/tasks";
import { getOwnerTickets } from "../api/tickets";
import { StatusCascadeDialog } from "../components/ui/StatusCascadeDialog";
import { queryKeys } from "../queries/queryKeys";
import { catalogLabel } from "../utils/catalogs";
import {
  buildDialogSteps,
  filterAffectedObjects,
  isStatusIncrease,
  type StatusCascadeCandidate,
  type StatusCascadeSelection,
  type StatusCascadeStep,
  workStatusSortOrder,
} from "../utils/statusCascade";
import { errorMessage } from "./errors";
import { useCatalogs } from "./useCatalogs";
import { useMilestones } from "./useMilestones";
import { useHasPermission } from "./usePermissions";
import { useTasks } from "./useTasks";
import { useTickets } from "./useTickets";
import { useToast } from "../components/ui/ToastProvider";

interface StatusCascadeDialogState {
  parentLabel: string;
  parentTitle: string;
  targetStatus: ProjectStatus;
  targetStatusLabel: string;
  steps: StatusCascadeStep[];
}

function toCandidate(
  item: Milestone | TaskBoardItem | Ticket,
  title: string,
  entries: CatalogEntry[],
): StatusCascadeCandidate {
  return {
    id: item.id,
    title,
    status: item.status,
    statusLabel: catalogLabel(entries, "workStatus", item.status),
    statusSortOrder: workStatusSortOrder(entries, item.status),
    version: item.version,
  };
}

function toDialogItems(items: StatusCascadeCandidate[]) {
  return items.map(({ statusSortOrder: _statusSortOrder, ...item }) => item);
}

function emptySelection(): StatusCascadeSelection {
  return { milestone: [], task: [], ticket: [] };
}

export function useStatusCascadeWorkflow() {
  const queryClient = useQueryClient();
  const catalogs = useCatalogs();
  const { showToast } = useToast();
  const milestoneActions = useMilestones(null, null, { enabled: false });
  const taskActions = useTasks(null);
  const ticketActions = useTickets(null);
  const canWriteMilestones = useHasPermission("milestones", "write");
  const canWriteTasks = useHasPermission("tasks", "write");
  const canWriteTickets = useHasPermission("tickets", "write");
  const [dialogState, setDialogState] = useState<StatusCascadeDialogState | null>(null);
  const [applying, setApplying] = useState(false);
  const resolverRef = useRef<(() => void) | null>(null);

  const closeDialog = useCallback(() => {
    setDialogState(null);
    setApplying(false);
    resolverRef.current?.();
    resolverRef.current = null;
  }, []);

  const openDialog = useCallback(
    async (state: StatusCascadeDialogState) => {
      if (resolverRef.current) {
        resolverRef.current();
      }
      await new Promise<void>((resolve) => {
        resolverRef.current = resolve;
        setDialogState(state);
      });
    },
    [],
  );

  const applySelection = useCallback(
    async (selection: StatusCascadeSelection) => {
      if (!dialogState) {
        return;
      }
      setApplying(true);
      const selected = selection ?? emptySelection();

      const updatePromises: Promise<void>[] = [];
      for (const step of dialogState.steps) {
        const selectedIds = new Set(selected[step.type]);
        for (const item of step.items) {
          if (!selectedIds.has(item.id)) {
            continue;
          }
          if (step.type === "milestone") {
            updatePromises.push(milestoneActions.updateMilestone(item.id, { status: dialogState.targetStatus, expectedVersion: item.version }).then(() => undefined));
          } else if (step.type === "task") {
            updatePromises.push(taskActions.updateTask(item.id, { status: dialogState.targetStatus as TaskStatus, expectedVersion: item.version }).then(() => undefined));
          } else {
            updatePromises.push(ticketActions.updateTicket(item.id, { status: dialogState.targetStatus as TicketStatus, expectedVersion: item.version }).then(() => undefined));
          }
        }
      }

      const results = await Promise.allSettled(updatePromises);
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failureCount = results.filter((r) => r.status === "rejected").length;

      if (failureCount > 0 && successCount > 0) {
        showToast({
          tone: "warn",
          title: "Status teilweise übernommen",
          message: `${successCount} geändert, ${failureCount} fehlgeschlagen.`,
        });
      } else if (failureCount > 0) {
        showToast({ tone: "error", title: "Status konnte nicht übernommen werden", message: `${failureCount} Änderung(en) fehlgeschlagen.` });
      } else if (successCount > 0) {
        showToast({ tone: "success", title: "Status übernommen", message: `${successCount} Unterobjekt(e) aktualisiert.` });
      }

      closeDialog();
    },
    [closeDialog, dialogState, milestoneActions, showToast, taskActions, ticketActions],
  );

  const startProjectCascade = useCallback(
    async (previousProject: Project, updatedProject: Project) => {
      const statusChange = isStatusIncrease(catalogs.entries, previousProject.status, updatedProject.status);
      if (!statusChange.increased || statusChange.newSortOrder === null) {
        return;
      }

      try {
        const [milestones, tasks, tickets] = await Promise.all([
          canWriteMilestones
            ? queryClient.fetchQuery({
                queryKey: queryKeys.milestones.byProject(updatedProject.id),
                queryFn: () => getProjectMilestones(updatedProject.id),
              })
            : Promise.resolve([] as Milestone[]),
          canWriteTasks
            ? queryClient.fetchQuery({
                queryKey: queryKeys.projects.tasks(updatedProject.id),
                queryFn: () => getOwnerTasks({ type: "project", id: updatedProject.id }),
              })
            : Promise.resolve([] as TaskBoardItem[]),
          canWriteTickets
            ? queryClient.fetchQuery({
                queryKey: queryKeys.projects.tickets(updatedProject.id),
                queryFn: () => getOwnerTickets({ type: "project", id: updatedProject.id }),
              })
            : Promise.resolve([] as Ticket[]),
        ]);

        const steps = buildDialogSteps(
          toDialogItems(filterAffectedObjects(milestones.map((item) => toCandidate(item, item.name, catalogs.entries)), statusChange.newSortOrder)),
          toDialogItems(filterAffectedObjects(tasks.map((item) => toCandidate(item, item.title, catalogs.entries)), statusChange.newSortOrder)),
          toDialogItems(filterAffectedObjects(tickets.map((item) => toCandidate(item, item.title, catalogs.entries)), statusChange.newSortOrder)),
        );

        if (steps.length === 0) {
          return;
        }

        await openDialog({
          parentLabel: "Projekt",
          parentTitle: updatedProject.name,
          targetStatus: updatedProject.status,
          targetStatusLabel: catalogLabel(catalogs.entries, "workStatus", updatedProject.status),
          steps,
        });
      } catch (cascadeError) {
        showToast({
          tone: "error",
          title: "Unterobjekte konnten nicht geprüft werden",
          message: errorMessage(cascadeError),
        });
      }
    },
    [canWriteMilestones, canWriteTasks, canWriteTickets, catalogs.entries, openDialog, queryClient, showToast],
  );

  const startMilestoneCascade = useCallback(
    async (previousMilestone: Milestone, updatedMilestone: Milestone) => {
      const statusChange = isStatusIncrease(catalogs.entries, previousMilestone.status, updatedMilestone.status);
      if (!statusChange.increased || statusChange.newSortOrder === null) {
        return;
      }

      try {
        const [tasks, tickets] = await Promise.all([
          canWriteTasks
            ? queryClient.fetchQuery({
                queryKey: queryKeys.milestones.tasks(updatedMilestone.id),
                queryFn: () => getOwnerTasks({ type: "milestone", id: updatedMilestone.id }),
              })
            : Promise.resolve([] as TaskBoardItem[]),
          canWriteTickets
            ? queryClient.fetchQuery({
                queryKey: queryKeys.milestones.tickets(updatedMilestone.id),
                queryFn: () => getOwnerTickets({ type: "milestone", id: updatedMilestone.id }),
              })
            : Promise.resolve([] as Ticket[]),
        ]);

        const steps = buildDialogSteps(
          [],
          toDialogItems(filterAffectedObjects(tasks.map((item) => toCandidate(item, item.title, catalogs.entries)), statusChange.newSortOrder)),
          toDialogItems(filterAffectedObjects(tickets.map((item) => toCandidate(item, item.title, catalogs.entries)), statusChange.newSortOrder)),
        );

        if (steps.length === 0) {
          return;
        }

        await openDialog({
          parentLabel: "Meilenstein",
          parentTitle: updatedMilestone.name,
          targetStatus: updatedMilestone.status,
          targetStatusLabel: catalogLabel(catalogs.entries, "workStatus", updatedMilestone.status),
          steps,
        });
      } catch (cascadeError) {
        showToast({
          tone: "error",
          title: "Unterobjekte konnten nicht geprüft werden",
          message: errorMessage(cascadeError),
        });
      }
    },
    [canWriteTasks, canWriteTickets, catalogs.entries, openDialog, queryClient, showToast],
  );

  return {
    startProjectCascade,
    startMilestoneCascade,
    dialog: (
      <StatusCascadeDialog
        open={dialogState !== null}
        parentLabel={dialogState?.parentLabel ?? ""}
        parentTitle={dialogState?.parentTitle ?? ""}
        targetStatusLabel={dialogState?.targetStatusLabel ?? ""}
        steps={dialogState?.steps ?? []}
        applying={applying}
        onApply={applySelection}
        onCancel={closeDialog}
      />
    ),
  };
}
