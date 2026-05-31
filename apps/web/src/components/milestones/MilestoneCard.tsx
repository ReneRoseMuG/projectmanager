import type { Milestone, Tag } from "@taskmanager/shared-types";
import { Bug, ExternalLink, Flag, ListTodo } from "lucide-react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { objectReference } from "../../lib/references";
import { catalogColor } from "../../utils/catalogs";
import { richTextToPlainText } from "../../utils/richText";
import { InlineDateField } from "../ui/InlineDateField";
import type { ActionMenuItem } from "../ui/ActionMenu";
import { CardFooterBar } from "../ui/CardFooterBar";
import { PlanningItemCard } from "../ui/PlanningItemCard";
import { StatusPill } from "../ui/StatusPill";

interface MilestoneCardProps {
  milestone: Milestone;
  variant?: "card" | "row";
  onEdit: (milestone: Milestone) => void;
  onOpenInTab?: (milestone: Milestone) => void;
  onDelete?: (milestone: Milestone) => void;
  onStatusChange?: (milestone: Milestone, status: Milestone["status"]) => void | Promise<unknown>;
  onDueDateChange?: (milestone: Milestone, dueDate: string | null) => void | Promise<unknown>;
  onCreateTask?: () => void;
  onCreateTicket?: () => void;
  allTags?: Tag[];
  onTagsChange?: (milestoneId: number, tagIds: number[]) => void | Promise<void>;
}

export function MilestoneCard({ milestone, variant = "card", onEdit, onOpenInTab, onDelete, onStatusChange, onDueDateChange, onCreateTask, onCreateTicket, allTags, onTagsChange }: MilestoneCardProps) {
  const catalogs = useCatalogs();
  const accent = catalogColor(catalogs.entries, "workStatus", milestone.status);
  const description = richTextToPlainText(milestone.description);
  const createMenuItems: ActionMenuItem[] = [
    ...(onOpenInTab
      ? [{ label: "In Tab öffnen", icon: <ExternalLink size={16} />, onClick: () => onOpenInTab(milestone) }]
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
      title={milestone.name}
      description={description}
      accentColor={accent}
      objectReference={objectReference("milestone", milestone.id)}
      icon={<Flag size={20} />}
      subtitle={<InlineDateField value={milestone.dueDate} emptyLabel="Ohne Fälligkeit" onChange={onDueDateChange ? (dueDate) => onDueDateChange(milestone, dueDate) : undefined} />}
      pills={<StatusPill kind="workStatus" value={milestone.status} onChange={onStatusChange ? (status) => onStatusChange(milestone, status) : undefined} />}
      footerMeta={
        <CardFooterBar
          tags={milestone.tags}
          allTags={allTags}
          onTagsChange={onTagsChange ? (tagIds) => onTagsChange(milestone.id, tagIds) : undefined}
          leadingCounters={[
            { icon: <ListTodo size={14} aria-hidden="true" />, value: milestone.totalTaskCount, label: "Aufgaben" },
            { icon: <Bug size={14} aria-hidden="true" />, value: milestone.ticketCount, label: "Tickets" }
          ]}
          attachmentCount={milestone.attachmentCount}
          noteCount={milestone.noteCount}
          commentCount={milestone.commentCount}
          bordered={variant !== "row"}
        />
      }
      taskStats={{
        openTasks: milestone.openTaskCount,
        doneTasks: milestone.doneTaskCount,
        totalTasks: milestone.totalTaskCount
      }}
      variant={variant}
      onOpen={() => onEdit(milestone)}
      onEdit={() => onEdit(milestone)}
      extraMenuItems={createMenuItems}
      onDelete={onDelete ? () => onDelete(milestone) : undefined}
    />
  );
}
