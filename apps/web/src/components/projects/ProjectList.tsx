import type { Project } from "@taskmanager/shared-types";
import { ProjectCard } from "./ProjectCard";

interface ProjectListProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectList({ projects, onEdit, onDelete }: ProjectListProps) {
  if (projects.length === 0) {
    return <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-slate-600">Keine Projekte</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
