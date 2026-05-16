import type { Project } from "@taskmanager/shared-types";
import { Archive, Edit3, FolderOpen, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { TagBadge } from "../tags/TagBadge";
import { Button } from "../ui/Button";
import { Pill, type PillTone } from "../ui/Pill";

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

const statusTones: Record<Project["status"], PillTone> = {
  active: "fern",
  on_hold: "tangerine",
  completed: "violet",
  archived: "steel"
};

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const progress = project.totalTaskCount > 0 ? Math.round((project.doneTaskCount / project.totalTaskCount) * 100) : 0;
  const accent = project.color ?? "#2E5984";

  return (
    <article className="relative grid min-h-60 gap-3.5 overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-panel">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent }} />
      <Link className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-steel-500" to={`/projects/${project.id}`} aria-label={`${project.name} öffnen`} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ backgroundColor: accent, boxShadow: `0 6px 16px ${accent}48` }}>
            {project.status === "archived" ? <Archive size={20} /> : <FolderOpen size={20} />}
          </span>
          <div>
            <h2 className="line-clamp-2 text-base font-semibold text-ink">{project.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{project.openTaskCount} offen</p>
          </div>
        </div>
        <div className="relative z-20 flex gap-1">
          <Button
            aria-label="Bearbeiten"
            title="Bearbeiten"
            icon={<Edit3 size={16} />}
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(project);
            }}
          />
          <Button
            aria-label="Löschen"
            title="Löschen"
            icon={<Trash2 size={16} />}
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(project);
            }}
          />
        </div>
      </div>

      <p className="min-h-10 text-sm text-slate-600">{project.description || "Keine Beschreibung"}</p>

      {project.totalTaskCount > 0 ? (
        <div className="grid gap-2">
          <div className="h-1.5 overflow-hidden rounded bg-shell">
            <div className="h-full rounded" style={{ width: `${progress}%`, backgroundColor: accent }} />
          </div>
          <p className="text-xs font-medium" style={{ color: accent }}>
            {project.doneTaskCount} / {project.totalTaskCount} erledigt
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Pill tone={statusTones[project.status]}>{statusLabels[project.status]}</Pill>
        {project.tags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
      </div>

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex -space-x-2" aria-hidden="true">
          {["LR", "SK", "+3"].map((initials) => (
            <span key={initials} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-steel-100 text-[10px] font-bold text-steel-700">
              {initials}
            </span>
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-500">{project.openTaskCount} offen</span>
      </footer>
    </article>
  );
}
