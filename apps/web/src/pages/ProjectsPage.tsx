import type { Project, ProjectStatus } from "@taskmanager/shared-types";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ProjectListBoardView } from "../components/projects/ProjectListBoardView";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { FilterChips } from "../components/ui/FilterChips";
import { PageHeader } from "../components/ui/PageHeader";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useCatalogs } from "../hooks/useCatalogs";
import { useProjects } from "../hooks/useProjects";
import { useStandaloneView } from "../hooks/useStandaloneView";
import { catalogEntriesByKind } from "../utils/catalogs";
import { withStandaloneView } from "../utils/standalone";

export function ProjectsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, loading, error, updateProject, removeProject } = useProjects();
  const catalogs = useCatalogs();
  const standalone = useStandaloneView();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">(
    "all",
  );
  const currentReturnTo = `${location.pathname}${location.search}`;

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
    </div>
  );
}
