import type { Milestone, Project } from "@taskmanager/shared-types";
import { useMemo } from "react";

interface ProjectMilestoneFilterBarProps {
  projects: Project[];
  milestones?: Milestone[];
  projectId: number | null;
  milestoneId?: number | null;
  onProjectChange: (projectId: number | null) => void;
  onMilestoneChange?: (milestoneId: number | null) => void;
}

function numberValue(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function ProjectMilestoneFilterBar({
  projects,
  milestones = [],
  projectId,
  milestoneId = null,
  onProjectChange,
  onMilestoneChange,
}: ProjectMilestoneFilterBarProps) {
  const visibleMilestones = useMemo(
    () =>
      projectId
        ? milestones.filter((milestone) => milestone.projectId === projectId)
        : milestones,
    [milestones, projectId],
  );

  return (
    <div className="flex flex-wrap items-end justify-center gap-3">
      <label className="grid min-w-48 gap-1.5 text-xs font-semibold text-muted">
        Projekt
        <select
          aria-label="Projektfilter"
          className="h-9 rounded-md border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
          value={projectId ?? ""}
          onChange={(event) => onProjectChange(numberValue(event.target.value))}
        >
          <option value="">Alle Projekte</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      {onMilestoneChange ? (
        <label className="grid min-w-56 gap-1.5 text-xs font-semibold text-muted">
          Meilenstein
          <select
            aria-label="Meilensteinfilter"
            className="h-9 rounded-md border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
            value={milestoneId ?? ""}
            onChange={(event) => onMilestoneChange(numberValue(event.target.value))}
          >
            <option value="">Alle Meilensteine</option>
            {visibleMilestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
