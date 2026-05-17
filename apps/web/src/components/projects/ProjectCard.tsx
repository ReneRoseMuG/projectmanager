import type { Project } from "@taskmanager/shared-types";
import { Archive, Edit3, FolderOpen, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { projectStatusLabels, projectStatusTones } from "../../utils/domainLabels";
import { TagBadge } from "../tags/TagBadge";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { Pill } from "../ui/Pill";
import { ProgressBar } from "../ui/ProgressBar";

interface ProjectCardProps {
  project: Project;
  variant?: "card" | "row";
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

function getProjectCode(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function ProjectCard({ project, variant = "card", onEdit, onDelete }: ProjectCardProps) {
  const navigate = useNavigate();
  const accent = project.color ?? "var(--color-steel-700)";
  const progress = project.totalTaskCount > 0 ? Math.round((project.doneTaskCount / project.totalTaskCount) * 100) : 0;
  const openProject = () => navigate(`/projects/${project.id}`);

  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <ProjectCard project={project} onEdit={onEdit} onDelete={onDelete} />
        </div>
        <div className="hidden md:block">
          <ItemRow
            accentColor={accent}
            statusIndicator={<ProjectAvatar project={project} />}
            title={project.name}
            description={project.description || "Keine Beschreibung"}
            pills={
              <>
                <Pill tone={projectStatusTones[project.status]}>{projectStatusLabels[project.status]}</Pill>
                {project.tags[0] ? <TagBadge tag={project.tags[0]} /> : null}
              </>
            }
            meta={<span className="text-xs font-semibold text-slate-500">{project.openTaskCount} offen</span>}
            actions={
              <>
                <Button aria-label="Öffnen" title="Öffnen" className="h-8 w-8" icon={<Edit3 size={15} />} variant="ghost" onClick={() => onEdit(project)} />
                <Button aria-label="Löschen" title="Löschen" className="h-8 w-8" icon={<Trash2 size={15} />} variant="ghost" onClick={() => onDelete(project)} />
              </>
            }
            onOpen={openProject}
          />
        </div>
      </>
    );
  }

  return (
    <ItemCard
      accentColor={accent}
      header={<ProjectCardHeader project={project} />}
      body={<ProjectCardBody project={project} />}
      footer={<ProjectCardFooter project={project} progress={progress} accent={accent} />}
      onOpen={openProject}
      onEdit={() => onEdit(project)}
      onDelete={() => onDelete(project)}
      className="min-h-60"
    />
  );
}

function ProjectAvatar({ project }: { project: Project }) {
  const accent = project.color ?? "var(--color-steel-700)";
  const Icon = project.status === "archived" ? Archive : FolderOpen;

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: accent }}>
      <Icon size={20} />
    </span>
  );
}

function ProjectCardHeader({ project }: { project: Project }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-3">
        <ProjectAvatar project={project} />
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-base font-semibold text-ink">{project.name}</h2>
          <p className="mt-1 font-mono text-xs uppercase text-slate-500">{getProjectCode(project.name) || "PRJ"}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={projectStatusTones[project.status]}>{projectStatusLabels[project.status]}</Pill>
        {project.tags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
      </div>
    </div>
  );
}

function ProjectCardBody({ project }: { project: Project }) {
  return <p className="line-clamp-3 min-h-10 text-sm text-slate-600">{project.description || "Keine Beschreibung"}</p>;
}

function ProjectCardFooter({ project, progress, accent }: { project: Project; progress: number; accent: string }) {
  return (
    <div className="grid gap-3 border-t border-line pt-3">
      {project.totalTaskCount > 0 ? <ProgressBar value={progress} color={accent} label={`${project.doneTaskCount} / ${project.totalTaskCount} erledigt`} /> : null}
      <div className="flex items-center justify-between gap-3">
        <div className="flex -space-x-2" aria-hidden="true">
          {[project.name, "Team", project.openTaskCount > 0 ? `+${project.openTaskCount}` : "OK"].map((name, index) => (
            <Avatar key={`${name}-${index}`} name={name} size="sm" />
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-500">{project.openTaskCount} offen</span>
      </div>
    </div>
  );
}
