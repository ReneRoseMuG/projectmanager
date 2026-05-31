import type { Tag, Task } from "@taskmanager/shared-types";
import { CheckCircle2, Edit3, ExternalLink, Trash2 } from "lucide-react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { objectReference } from "../../lib/references";
import { catalogColor, isCatalogStatusClosed } from "../../utils/catalogs";
import { formatHumanDate, isOverdue } from "../../utils/date";
import { richTextToPlainText } from "../../utils/richText";
import { ActionMenu } from "../ui/ActionMenu";
import { CardFooterBar } from "../ui/CardFooterBar";
import { InlineDateField } from "../ui/InlineDateField";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { ParentBadge } from "../ui/ParentBadge";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusPill } from "../ui/StatusPill";

interface TaskCardProps {
  task: Task;
  allTags?: Tag[];
  compact?: boolean;
  variant?: "card" | "row";
  onOpen: (task: Task) => void;
  onOpenInTab?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onStatusChange?: (task: Task, status: Task["status"]) => void | Promise<unknown>;
  onDueDateChange?: (task: Task, dueDate: string | null) => void | Promise<unknown>;
  onTagsChange?: (taskId: number, tagIds: number[]) => void | Promise<void>;
}

export function TaskCard({ task, allTags, compact = false, variant = "card", onOpen, onOpenInTab, onDelete, onStatusChange, onDueDateChange, onTagsChange }: TaskCardProps) {
  const catalogs = useCatalogs();
  const description = richTextToPlainText(task.description);
  const statusColor = catalogColor(catalogs.entries, "workStatus", task.status);
  const taskClosed = isCatalogStatusClosed(catalogs.entries, "workStatus", task.status);

  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <TaskCard task={task} allTags={allTags} compact={compact} onOpen={onOpen} onOpenInTab={onOpenInTab} onDelete={onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} onTagsChange={onTagsChange} />
        </div>
        <TaskRow task={task} allTags={allTags} description={description} statusColor={statusColor} taskClosed={taskClosed} onOpen={onOpen} onOpenInTab={onOpenInTab} onDelete={onDelete} onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} onTagsChange={onTagsChange} />
      </>
    );
  }

  return (
    <ItemCard
      accentColor={statusColor}
      objectReference={objectReference("task", task.id)}
      header={<TaskCardHeader task={task} onStatusChange={onStatusChange} />}
      body={<TaskCardBody description={description} />}
      footer={<TaskCardFooter task={task} allTags={allTags} taskClosed={taskClosed} onDueDateChange={onDueDateChange} onTagsChange={onTagsChange} />}
      onOpen={() => onOpen(task)}
      onEdit={() => onOpen(task)}
      extraMenuItems={onOpenInTab ? [{ label: "In Tab öffnen", icon: <ExternalLink size={16} />, onClick: () => onOpenInTab(task) }] : []}
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

function TaskCardFooter({ task, allTags, taskClosed, onDueDateChange, onTagsChange }: { task: Task; allTags?: Tag[]; taskClosed: boolean; onDueDateChange?: (task: Task, dueDate: string | null) => void | Promise<unknown>; onTagsChange?: (taskId: number, tagIds: number[]) => void | Promise<void> }) {
  const overdue = !taskClosed && isOverdue(task.dueDate);
  const closedDate = taskClosed ? task.updatedAt : null;
  const hasMeta = task.subtaskCount > 0 || Boolean(task.dueDate) || Boolean(closedDate);

  return (
    <div className="grid gap-3">
      {hasMeta ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-steel-600">
          {task.subtaskCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 size={14} />
              {task.subtaskCount}
            </span>
          ) : null}
          {task.dueDate ? (
            <span className={`inline-flex items-center gap-1 font-semibold ${overdue ? "text-crimson" : ""}`}>
              Fällig
              <InlineDateField value={task.dueDate} onChange={onDueDateChange ? (dueDate) => onDueDateChange(task, dueDate) : undefined} />
            </span>
          ) : null}
          {closedDate ? (
            <span className="inline-flex items-center gap-1 font-semibold text-steel-500">
              Geschlossen {formatHumanDate(closedDate)}
            </span>
          ) : null}
        </div>
      ) : null}
      <TaskSupportFooter task={task} allTags={allTags} onTagsChange={onTagsChange} />
    </div>
  );
}

function TaskSupportFooter({ task, allTags, onTagsChange, bordered = true }: { task: Task; allTags?: Tag[]; onTagsChange?: (taskId: number, tagIds: number[]) => void | Promise<void>; bordered?: boolean }) {
  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex flex-wrap gap-2">
        <ParentBadge parent={task.visibleParent} />
      </div>
      <CardFooterBar
        tags={task.tags}
        allTags={allTags}
        onTagsChange={onTagsChange ? (tagIds) => onTagsChange(task.id, tagIds) : undefined}
        attachmentCount={task.attachmentCount}
        noteCount={task.noteCount}
        commentCount={task.commentCount}
        bordered={bordered}
      />
    </div>
  );
}

function TaskRow({ task, allTags, description, statusColor, taskClosed, onOpen, onOpenInTab, onDelete, onStatusChange, onDueDateChange, onTagsChange }: { task: Task; allTags?: Tag[]; description: string; statusColor: string; taskClosed: boolean; onOpen: (task: Task) => void; onOpenInTab?: (task: Task) => void; onDelete?: (task: Task) => void; onStatusChange?: (task: Task, status: Task["status"]) => void | Promise<unknown>; onDueDateChange?: (task: Task, dueDate: string | null) => void | Promise<unknown>; onTagsChange?: (taskId: number, tagIds: number[]) => void | Promise<void> }) {
  const overdue = !taskClosed && isOverdue(task.dueDate);
  const closedDate = taskClosed ? task.updatedAt : null;

  return (
    <div className="hidden md:block">
      <ItemRow
        accentColor={statusColor}
        objectReference={objectReference("task", task.id)}
        title={task.title}
        description={description}
        pills={
          <>
            <StatusPill kind="workStatus" value={task.status} onChange={onStatusChange ? (status) => onStatusChange(task, status) : undefined} />
            <PriorityBadge value={task.priority} />
          </>
        }
        meta={
          <div className="flex min-w-[9rem] flex-wrap items-center justify-end gap-2 text-xs font-semibold text-steel-500">
            <span className={`inline-flex items-center gap-1 ${overdue ? "text-crimson" : ""}`}>
              Fällig
              <InlineDateField value={task.dueDate} emptyLabel="Ohne Fälligkeit" onChange={onDueDateChange ? (dueDate) => onDueDateChange(task, dueDate) : undefined} />
            </span>
            {closedDate ? <span>Geschlossen {formatHumanDate(closedDate)}</span> : null}
          </div>
        }
        footer={<TaskSupportFooter task={task} allTags={allTags} onTagsChange={onTagsChange} bordered={false} />}
        actions={
          <ActionMenu
            objectReference={objectReference("task", task.id)}
            items={[
              { label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: () => onOpen(task) },
              ...(onOpenInTab ? [{ label: "In Tab öffnen", icon: <ExternalLink size={16} />, onClick: () => onOpenInTab(task) }] : []),
              ...(onDelete ? [{ label: "Löschen", icon: <Trash2 size={16} />, onClick: () => onDelete(task), danger: true }] : [])
            ]}
          />
        }
        actionsIncludeObjectReference
        onOpen={() => onOpen(task)}
      />
    </div>
  );
}
