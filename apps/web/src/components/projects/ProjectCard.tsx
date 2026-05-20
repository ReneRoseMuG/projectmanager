import type { Project } from "@taskmanager/shared-types";
import { Archive, FolderOpen } from "lucide-react";
import { richTextToPlainText } from "../../utils/richText";
import { TagBadge } from "../tags/TagBadge";
import { PlanningItemCard } from "../ui/PlanningItemCard";
import { StatusPill } from "../ui/StatusPill";

interface ProjectCardProps {
  project: Project;
  variant?: "card" | "row";
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({ project, variant = "card", onEdit, onDelete }: ProjectCardProps) {
  const accent = project.color ?? "var(--color-steel-700)";
  const description = richTextToPlainText(project.description);
  const Icon = project.status === "archived" ? Archive : FolderOpen;

  return (
    <PlanningItemCard
      title={project.name}
      description={description}
      accentColor={accent}
      icon={<Icon size={20} />}
      pills={
        <>
          <StatusPill kind="workStatus" value={project.status} />
          {project.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </>
      }
      taskStats={{
        openTasks: project.openTaskCount,
        doneTasks: project.doneTaskCount,
        totalTasks: project.totalTaskCount
      }}
      variant={variant}
      onOpen={() => onEdit(project)}
      onEdit={() => onEdit(project)}
      onDelete={() => onDelete(project)}
    />
  );
}
