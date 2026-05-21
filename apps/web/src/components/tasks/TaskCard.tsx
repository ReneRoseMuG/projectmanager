import type { Task } from "@taskmanager/shared-types";
import { CalendarClock, CheckCircle2, Edit3, Trash2 } from "lucide-react";
import { formatHumanDate, isOverdue } from "../../utils/date";
import { richTextToPlainText } from "../../utils/richText";
import { ActionMenu } from "../ui/ActionMenu";
import { Badge } from "../ui/Badge";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusPill } from "../ui/StatusPill";

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  variant?: "card" | "row";
  onOpen: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

const priorityAccent: Record<string, string> = {
  urgent: "var(--color-crimson)",
  high: "var(--color-tangerine)",
  medium: "var(--color-mustard)",
  low: "var(--color-steel-400)"
};

const tagTones: Array<"violet" | "teal" | "magenta" | "fern" | "steel"> = ["violet", "teal", "magenta", "fern", "steel"];

export function TaskCard({ task, compact = false, variant = "card", onOpen, onDelete }: TaskCardProps) {
  const description = richTextToPlainText(task.description);

  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <TaskCard task={task} compact={compact} onOpen={onOpen} onDelete={onDelete} />
        </div>
        <TaskRow task={task} description={description} onOpen={onOpen} onDelete={onDelete} />
      </>
    );
  }

  return (
    <ItemCard
      accentColor={priorityAccent[task.priority] ?? "var(--color-steel-400)"}
      header={<TaskCardHeader task={task} />}
      body={<TaskCardBody description={description} />}
      footer={<TaskCardFooter task={task} />}
      onOpen={() => onOpen(task)}
      onEdit={() => onOpen(task)}
      onDelete={onDelete ? () => onDelete(task) : undefined}
      className={compact ? "p-4" : ""}
    />
  );
}

function TaskCardHeader({ task }: { task: Task }) {
  return (
    <div className="grid gap-2">
      <h3 className="line-clamp-2 text-sm font-semibold text-ink">{task.title}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill kind="workStatus" value={task.status} />
        <PriorityBadge value={task.priority} />
      </div>
    </div>
  );
}

function TaskCardBody({ description }: { description: string }) {
  return description ? <p className="line-clamp-3 text-xs text-slate-600">{description}</p> : null;
}

function TaskCardFooter({ task }: { task: Task }) {
  const overdue = task.status !== "done" && isOverdue(task.dueDate);
  const hasMeta = task.subtaskCount > 0 || Boolean(task.dueDate);

  return (
    <div className="grid gap-3">
      {hasMeta ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-2 text-xs text-slate-600">
          {task.subtaskCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 size={14} />
              {task.subtaskCount}
            </span>
          ) : null}
          {task.dueDate ? (
            <span className={`inline-flex items-center gap-1 ${overdue ? "text-crimson" : ""}`}>
              <CalendarClock size={14} />
              {formatHumanDate(task.dueDate)}
            </span>
          ) : null}
        </div>
      ) : null}
      {task.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {task.tags.map((tag, index) => (
            <Badge key={tag.id} tone={tagTones[index % tagTones.length]}>
              {tag.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TaskRow({ task, description, onOpen, onDelete }: { task: Task; description: string; onOpen: (task: Task) => void; onDelete?: (task: Task) => void }) {
  const overdue = task.status !== "done" && isOverdue(task.dueDate);
  const primaryTag = task.tags[0];

  return (
    <div className="hidden md:block">
      <ItemRow
        accentColor={priorityAccent[task.priority] ?? "var(--color-steel-400)"}
        title={task.title}
        description={description}
        pills={
          <>
            <StatusPill kind="workStatus" value={task.status} />
            {primaryTag ? <Badge tone={tagTones[0]}>{primaryTag.name}</Badge> : <Badge tone="mute">Ohne Tag</Badge>}
          </>
        }
        meta={
          <span className={`inline-flex min-w-[82px] items-center gap-1 text-xs font-semibold ${overdue ? "text-crimson" : "text-slate-500"}`}>
            <CalendarClock size={14} />
            {task.dueDate ? formatHumanDate(task.dueDate) : "Ohne Datum"}
          </span>
        }
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
