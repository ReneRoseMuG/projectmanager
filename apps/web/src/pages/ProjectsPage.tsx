import { PROJECT_STATUSES, type Project, type ProjectStatus } from "@taskmanager/shared-types";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectListBoardView } from "../components/projects/ProjectListBoardView";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { FilterChips } from "../components/ui/FilterChips";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useProjects } from "../hooks/useProjects";
import { projectStatusLabels } from "../utils/domainLabels";

export function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, loading, error, removeProject } = useProjects();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

  const statusOptions = useMemo(
    () =>
      PROJECT_STATUSES.map((status) => ({
        value: status,
        label: projectStatusLabels[status],
        count: projects.filter((project) => project.status === status).length
      })),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => statusFilter === "all" || project.status === statusFilter);
  }, [projects, statusFilter]);

  const deleteProject = async (project: Project) => {
    const approved = await confirm({
      title: "Projekt löschen?",
      body: `Das Projekt "${project.name}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await removeProject(project.id);
      showToast({ tone: "success", title: "Projekt gelöscht" });
    } catch (deleteError) {
      showToast({ tone: "error", title: "Projekt konnte nicht gelöscht werden", message: errorMessage(deleteError) });
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Projekte</h1>
          <p className="text-sm text-slate-600">{projects.length} Einträge</p>
        </div>
      </header>

      {error ? <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">{error}</div> : null}
      <ProjectListBoardView
        projects={filteredProjects}
        loading={loading}
        onCreate={() => navigate("/projects/new")}
        onEdit={(project) => navigate(`/projects/${project.id}`)}
        onDelete={(project) => void deleteProject(project)}
        filters={!loading ? <FilterChips value={statusFilter} onChange={setStatusFilter} options={statusOptions} allCount={projects.length} /> : null}
      />
    </div>
  );
}
