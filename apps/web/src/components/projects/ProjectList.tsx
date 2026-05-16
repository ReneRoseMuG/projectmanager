import type { Project } from "@taskmanager/shared-types";
import { FolderKanban } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { ProjectCard } from "./ProjectCard";

interface ProjectListProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectList({ projects, onEdit, onDelete }: ProjectListProps) {
  if (projects.length === 0) {
    return <EmptyState icon={<FolderKanban size={22} />} title="Keine Projekte" body="Lege dein erstes Projekt an, um Aufgaben, Backlog und Dateien zu bündeln." tone="fern" variant="first-run" />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
