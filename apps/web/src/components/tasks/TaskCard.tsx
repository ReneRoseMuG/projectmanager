import type { Task } from "@taskmanager/shared-types";
import { CheckCircle2, Edit3, Trash2 } from "lucide-react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogColor, isCatalogStatusClosed } from "../../utils/catalogs";
import { isOverdue } from "../../utils/date";
import { richTextToPlainText } from "../../utils/richText";
import { ActionMenu } from "../ui/ActionMenu";
import { InlineDateField } from "../ui/InlineDateField";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { ParentBadge } from "../ui/ParentBadge";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusPill } from "../ui/StatusPill";
import { TagFooter } from "../ui/TagFooter";

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  variant?: "card" | "row";
  onOpen: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onStatusChange?: (task: Task, status: Task["status"]) => void | Promise<unknown>;
  onDueDateChange?: (task: Task, dueDate: string | null) => void | Promise<unknown>;
}

export function TaskCard({ task, compact = false, variant = "card", onOpen, onDelete, onStatusChange, onDueDateChange }: TaskCardProps) {
  const catalogs = useCatalogs();
  const description = richTextToPlainText(task.description);
  const statusColor = catalogColor(catalogs.entries, "workStatus", task.status);
  const taskClosed = isCatalogStatusClosed(catalogs.entries, "workStatus", task.status);

  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <TaskCard task={task} compact={compact} onOpen={onOpen} onDelete={onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} />
        </div>
        <TaskRow task={task} description={description} statusColor={statusColor} taskClosed={taskClosed} onOpen={onOpen} onDelete={onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} />
      </>
    );
  }

  return (
    <ItemCard
      accentColor={statusColor}
      header={<TaskCardHeader task={task} onStatusChange={onStatusChange} />}
      body={<TaskCardBody description={description} />}
      footer={<TaskCardFooter task={task} taskClosed={taskClosed} onDueDateChange={onDueDateChange} />}
      onOpen={() => onOpen(task)}
      onEdit={() => onOpen(task)}
      onDelete={onDelete ? () => onDelete(task) : undefined}
      className={compact ? "p-4" : ""}
    />
  );
}

function TaskCardHeader({ task, onStatusChange }: { task: Task; onStatusChange?: (task: Task, status: Task["status"]) => void | Promise<unknown> }) {
  return (
    <div className="grid gap-2">
      <h3 className="line-clamp-2 text-sm font-semibold text-ink">{task.title}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill kind="workStatus" value={task.status} onChange={onStatusChange ? (status) => onStatusChange(task, status) : undefined} />
        <PriorityBadge value={task.priority} />
      </div>
    </div>
  );
}

function TaskCardBody({ description }: { description: string }) {
  return description ? <p className="line-clamp-3 text-xs text-steel-600">{description}</p> : null;
}

function TaskCardFooter({ task, taskClosed, onDueDateChange }: { task: Task; taskClosed: boolean; onDueDateChange?: (task: Task, dueDate: string | null) => void | Promise<unknown> }) {
  const overdue = !taskClosed && isOverdue(task.dueDate);
  const hasMeta = task.subtaskCount > 0 || Boolean(task.dueDate);

  return (
    <div className="grid gap-3">
      {hasMeta ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-2 text-xs text-steel-600">
          {task.subtaskCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 size={14} />
              {task.subtaskCount}
            </span>
          ) : null}
          {task.dueDate ? (
            <InlineDateField value={task.dueDate} className={overdue ? "text-crimson" : ""} onChange={onDueDateChange ? (dueDate) => onDueDateChange(task, dueDate) : undefined} />
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <ParentBadge parent={task.visibleParent} />
      </div>
      <TagFooter tags={task.tags} />
    </div>
  );
}

function TaskRow({ task, description, statusColor, taskClosed, onOpen, onDelete, onStatusChange, onDueDateChange }: { task: Task; description: string; statusColor: string; taskClosed: boolean; onOpen: (task: Task) => void; onDelete?: (task: Task) => void; onStatusChange?: (task: Task, status: Task["status"]) => void | Promise<unknown>; onDueDateChange?: (task: Task, dueDate: string | null) => void | Promise<unknown> }) {
  const overdue = !taskClosed && isOverdue(task.dueDate);

  return (
    <div className="hidden md:block">
      <ItemRow
        accentColor={statusColor}
        title={task.title}
        description={description}
        pills={
          <>
            <StatusPill kind="workStatus" value={task.status} onChange={onStatusChange ? (status) => onStatusChange(task, status) : undefined} />
            <PriorityBadge value={task.priority} />
          </>
        }
        meta={
          <span className={`inline-flex min-w-[82px] items-center gap-1 text-xs font-semibold ${overdue ? "text-crimson" : "text-steel-500"}`}>
            <InlineDateField value={task.dueDate} onChange={onDueDateChange ? (dueDate) => onDueDateChange(task, dueDate) : undefined} />
          </span>
        }
        footer={<><ParentBadge parent={task.visibleParent} /><TagFooter tags={task.tags} /></>}
        actions={
          <ActionMenu
            items={[
              { label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: () => onOpen(task) },
              ...(onDelete ? [{ label: "Löschen", icon: <Trash2 size={16} />, onClick: () => onDelete(task), danger: true }] : [])
            ]}
          />
        }
        onOpen={() => onOpen(task)}
      />
    </div>
  );
}
