import type { Project, ProjectInput } from "@taskmanager/shared-types";
import { ChevronRight, Edit3 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProjectForm } from "../components/projects/ProjectForm";
import { Button } from "../components/ui/Button";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useBacklog } from "../hooks/useBacklog";
import { useProjects } from "../hooks/useProjects";
import { formatHumanDate } from "../utils/date";
import { richTextToPlainText } from "../utils/richText";

export function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { project, loading: projectLoading, updateProject, removeProject } = useProjects(projectId);
  const backlog = useBacklog(Number.isFinite(projectId) ? projectId : undefined);
  const [formOpen, setFormOpen] = useState(false);

  const submitProjectDetails = async (input: ProjectInput, tagIds: number[]) => {
    if (!project) {
      return;
    }

    try {
      const updated = await updateProject(project.id, input, tagIds);
      showToast({ tone: "success", title: "Projekt gespeichert" });
      return updated;
    } catch (projectError) {
      showToast({ tone: "error", title: "Projekt konnte nicht gespeichert werden", message: errorMessage(projectError) });
      throw projectError;
    }
  };

  const deleteProject = async (targetProject: Project) => {
    const approved = await confirm({
      title: "Projekt löschen?",
      body: `Das Projekt "${targetProject.name}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return false;
    }
    try {
      await removeProject(targetProject.id);
      showToast({ tone: "success", title: "Projekt gelöscht" });
      navigate("/projects");
      return true;
    } catch (projectError) {
      showToast({ tone: "error", title: "Projekt konnte nicht gelöscht werden", message: errorMessage(projectError) });
      return false;
    }
  };

  if (projectLoading) {
    return <DetailPageSkeleton />;
  }

  if (!project) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Projekt nicht gefunden</div>;
  }

  const projectDescription = richTextToPlainText(project.description);
  const progress = project.totalTaskCount > 0 ? Math.round((project.doneTaskCount / project.totalTaskCount) * 100) : 0;

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-steel-700 via-steel-600 to-violet p-6 text-white shadow-steel">
        <div className="pointer-events-none absolute -right-20 -top-48 h-[480px] w-[480px] rounded-full bg-white/10 blur-sm" />
        <div className="relative grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <nav className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                <Link className="hover:text-white" to="/projects">
                  Projekte
                </Link>
                <ChevronRight size={16} />
                <span className="text-white">{project.name}</span>
              </nav>
              <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-normal text-white">{project.name}</h1>
              {projectDescription ? <p className="mt-1 max-w-[720px] text-[15px] leading-6 text-white/85">{projectDescription}</p> : null}
            </div>
            <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20" icon={<Edit3 size={17} />} variant="ghost" onClick={() => setFormOpen(true)}>
              Bearbeiten
            </Button>
          </div>

          <div className="grid gap-4 border-t border-white/18 pt-5 sm:grid-cols-2 lg:grid-cols-5">
            <HeroStat label="Fortschritt">{progress} %</HeroStat>
            <HeroStat label="Aufgaben">
              {project.doneTaskCount} / {project.totalTaskCount}
            </HeroStat>
            <HeroStat label="Offen">{project.openTaskCount}</HeroStat>
            <HeroStat label="Backlog">{backlog.items.length}</HeroStat>
            <HeroStat label="Aktualisiert">{formatHumanDate(project.updatedAt)}</HeroStat>
          </div>
        </div>
      </header>

      <ProjectForm open={formOpen} project={project} onSubmit={submitProjectDetails} onDelete={deleteProject} onClose={() => setFormOpen(false)} />
    </div>
  );
}

function HeroStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="block text-[11px] font-semibold uppercase tracking-widest text-white/60">{label}</span>
      <span className="mt-1 block text-2xl font-bold text-white">{children}</span>
    </div>
  );
}
