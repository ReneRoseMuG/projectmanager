import type { Project } from "@taskmanager/shared-types";
import { Archive, Edit3, FolderOpen, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { TagBadge } from "../tags/TagBadge";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

const statusLabels: Record<Project["status"], string> = {
  active: "Aktiv",
  on_hold: "Pausiert",
  completed: "Abgeschlossen",
  archived: "Archiviert"
};

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const progress = project.totalTaskCount > 0 ? Math.round((project.doneTaskCount / project.totalTaskCount) * 100) : 0;
  const accent = project.color ?? "#6366f1";

  return (
    <article className="grid min-h-52 gap-4 rounded-lg border border-line bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md text-white" style={{ backgroundColor: project.color ?? "#6366f1" }}>
            {project.status === "archived" ? <Archive size={20} /> : <FolderOpen size={20} />}
          </span>
          <div>
            <h2 className="line-clamp-2 text-base font-semibold text-ink">{project.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{project.openTaskCount} offen</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button aria-label="Bearbeiten" title="Bearbeiten" icon={<Edit3 size={16} />} variant="ghost" onClick={() => onEdit(project)} />
          <Button aria-label="Löschen" title="Löschen" icon={<Trash2 size={16} />} variant="ghost" onClick={() => onDelete(project)} />
        </div>
      </div>

      <p className="min-h-10 text-sm text-slate-600">{project.description || "Keine Beschreibung"}</p>

      {project.totalTaskCount > 0 ? (
        <div className="grid gap-2">
          <div className="h-1 overflow-hidden rounded bg-shell">
            <div className="h-full rounded" style={{ width: `${progress}%`, backgroundColor: accent }} />
          </div>
          <p className="text-xs font-medium" style={{ color: accent }}>
            {project.doneTaskCount} / {project.totalTaskCount} erledigt
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge muted>{statusLabels[project.status]}</Badge>
        {project.tags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
      </div>

      <Link
        className="mt-auto inline-flex h-10 items-center justify-center rounded-md bg-ink px-3 text-sm font-medium text-white transition hover:bg-teal"
        to={`/projects/${project.id}`}
      >
        Öffnen
      </Link>
    </article>
  );
}
