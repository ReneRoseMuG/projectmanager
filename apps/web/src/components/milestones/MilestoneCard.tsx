import type { Milestone } from "@taskmanager/shared-types";
import { Flag } from "lucide-react";
import { richTextToPlainText } from "../../utils/richText";
import { TagBadge } from "../tags/TagBadge";
import { PlanningItemCard } from "../ui/PlanningItemCard";
import { StatusPill } from "../ui/StatusPill";

interface MilestoneCardProps {
  milestone: Milestone;
  variant?: "card" | "row";
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestone: Milestone) => void;
}

export function MilestoneCard({ milestone, variant = "card", onEdit, onDelete }: MilestoneCardProps) {
  const accent = milestone.color ?? "var(--color-teal)";
  const description = richTextToPlainText(milestone.description);

  return (
    <PlanningItemCard
      title={milestone.name}
      description={description}
      accentColor={accent}
      icon={<Flag size={20} />}
      subtitle={milestone.dueDate ? `Fällig ${milestone.dueDate}` : "Ohne Fälligkeit"}
      pills={
        <>
          <StatusPill kind="workStatus" value={milestone.status} />
          {milestone.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </>
      }
      taskStats={{
        openTasks: milestone.openTaskCount,
        doneTasks: milestone.doneTaskCount,
        totalTasks: milestone.totalTaskCount
      }}
      variant={variant}
      onOpen={() => onEdit(milestone)}
      onEdit={() => onEdit(milestone)}
      onDelete={() => onDelete(milestone)}
    />
  );
}
