import type { Milestone } from "@taskmanager/shared-types";
import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { MilestoneListBoardView } from "../components/milestones/MilestoneListBoardView";
import { PageHeader } from "../components/ui/PageHeader";
import { ProjectMilestoneFilterBar } from "../components/ui/ProjectMilestoneFilterBar";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useMilestones } from "../hooks/useMilestones";
import { useProjects } from "../hooks/useProjects";
import { useStandaloneView } from "../hooks/useStandaloneView";
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
  const projects = useProjects();
  const projectId = parseId(searchParams.get("projectId"));
  const milestones = useMilestones(null, projectId);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

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
        filters={
          <ProjectMilestoneFilterBar
            projects={projects.projects}
            projectId={projectId}
            onProjectChange={updateProjectFilter}
          />
        }
      />
    </div>
  );
}
