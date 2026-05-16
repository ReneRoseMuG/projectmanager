import { PROJECT_STATUSES, type Project, type ProjectInput, type ProjectStatus } from "@taskmanager/shared-types";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { ProjectForm } from "../components/projects/ProjectForm";
import { ProjectList } from "../components/projects/ProjectList";
import { Button } from "../components/ui/Button";
import { FilterChips } from "../components/ui/FilterChips";
import { SearchInput } from "../components/ui/SearchInput";
import { ProjectGridSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useProjects } from "../hooks/useProjects";

export function ProjectsPage() {
  const { projects, loading, error, createProject, updateProject, removeProject } = useProjects();
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [search, setSearch] = useState("");

  const statusOptions = useMemo(
    () =>
      PROJECT_STATUSES.map((status) => ({
        value: status,
        label: statusLabels[status],
        count: projects.filter((project) => project.status === status).length
      })),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      const matchesSearch = !query || project.name.toLowerCase().includes(query) || (project.description ?? "").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [projects, search, statusFilter]);

  const openCreate = () => {
    setEditingProject(null);
    setFormOpen(true);
  };

  const submit = async (input: ProjectInput, tagIds: number[]) => {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, input, tagIds);
        showToast({ tone: "success", title: "Projekt aktualisiert" });
        return;
      }
      await createProject(input, tagIds);
      showToast({ tone: "success", title: "Projekt erstellt" });
    } catch (submitError) {
      showToast({ tone: "error", title: "Projekt konnte nicht gespeichert werden", message: errorMessage(submitError) });
      throw submitError;
    }
  };

  const deleteProject = async (project: Project) => {
    if (!window.confirm("Projekt löschen?")) {
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
        <Button variant="primary" icon={<Plus size={17} />} onClick={openCreate}>
          Neues Projekt
        </Button>
      </header>

      {error ? <div className="rounded-md border border-coral bg-coral/10 p-3 text-sm text-coral">{error}</div> : null}
      {!loading ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <FilterChips value={statusFilter} onChange={setStatusFilter} options={statusOptions} allCount={projects.length} />
          <SearchInput value={search} onChange={setSearch} placeholder="Projekte suchen" />
        </div>
      ) : null}
      {loading ? <ProjectGridSkeleton /> : <ProjectList projects={filteredProjects} onEdit={(project) => {
        setEditingProject(project);
        setFormOpen(true);
      }} onDelete={(project) => void deleteProject(project)} />}

      <ProjectForm open={formOpen} project={editingProject} onSubmit={submit} onClose={() => setFormOpen(false)} />
    </div>
  );
}

const statusLabels: Record<ProjectStatus, string> = {
  active: "Aktiv",
  on_hold: "Pausiert",
  completed: "Abgeschlossen",
  archived: "Archiviert"
};
