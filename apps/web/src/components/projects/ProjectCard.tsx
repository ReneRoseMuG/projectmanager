import type { Project } from "@taskmanager/shared-types";
import { Archive, FolderOpen } from "lucide-react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogColor } from "../../utils/catalogs";
import { richTextToPlainText } from "../../utils/richText";
import { PlanningItemCard } from "../ui/PlanningItemCard";
import { StatusPill } from "../ui/StatusPill";
import { TagFooter } from "../ui/TagFooter";

interface ProjectCardProps {
  project: Project;
  variant?: "card" | "row";
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onStatusChange?: (project: Project, status: Project["status"]) => void | Promise<unknown>;
}

export function ProjectCard({ project, variant = "card", onEdit, onDelete, onStatusChange }: ProjectCardProps) {
  const catalogs = useCatalogs();
  const accent = catalogColor(catalogs.entries, "workStatus", project.status);
  const description = richTextToPlainText(project.description);
  const Icon = project.status === "archived" ? Archive : FolderOpen;

  return (
    <PlanningItemCard
      title={project.name}
      description={description}
      accentColor={accent}
      icon={<Icon size={20} />}
      pills={
        <StatusPill kind="workStatus" value={project.status} onChange={onStatusChange ? (status) => onStatusChange(project, status) : undefined} />
      }
      footerMeta={<TagFooter tags={project.tags} />}
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
