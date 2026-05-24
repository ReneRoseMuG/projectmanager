import type { Project } from "@taskmanager/shared-types";
import { Archive, Bug, Flag, FolderOpen, ListTodo } from "lucide-react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { objectReference } from "../../lib/references";
import { catalogColor } from "../../utils/catalogs";
import { richTextToPlainText } from "../../utils/richText";
import type { ActionMenuItem } from "../ui/ActionMenu";
import { PlanningItemCard } from "../ui/PlanningItemCard";
import { StatusPill } from "../ui/StatusPill";
import { TagFooter } from "../ui/TagFooter";

interface ProjectCardProps {
  project: Project;
  variant?: "card" | "row";
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onStatusChange?: (project: Project, status: Project["status"]) => void | Promise<unknown>;
  onCreateMilestone?: () => void;
  onCreateTask?: () => void;
  onCreateTicket?: () => void;
}

export function ProjectCard({ project, variant = "card", onEdit, onDelete, onStatusChange, onCreateMilestone, onCreateTask, onCreateTicket }: ProjectCardProps) {
  const catalogs = useCatalogs();
  const accent = catalogColor(catalogs.entries, "workStatus", project.status);
  const description = richTextToPlainText(project.description);
  const Icon = project.status === "archived" ? Archive : FolderOpen;
  const createMenuItems: ActionMenuItem[] = [
    ...(onCreateMilestone
      ? [{ label: "Neuer Meilenstein", icon: <Flag size={16} />, onClick: onCreateMilestone }]
      : []),
    ...(onCreateTask
      ? [{ label: "Neue Aufgabe", icon: <ListTodo size={16} />, onClick: onCreateTask }]
      : []),
    ...(onCreateTicket
      ? [{ label: "Neues Ticket", icon: <Bug size={16} />, onClick: onCreateTicket }]
      : [])
  ];

  return (
    <PlanningItemCard
      title={project.name}
      description={description}
      accentColor={accent}
      objectReference={objectReference("project", project.id)}
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
      extraMenuItems={createMenuItems}
      onDelete={() => onDelete(project)}
    />
  );
}
