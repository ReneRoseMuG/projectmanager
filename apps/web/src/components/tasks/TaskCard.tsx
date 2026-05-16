import type { Task } from "@taskmanager/shared-types";
import { CalendarClock, CheckCircle2, Edit3, Trash2 } from "lucide-react";
import { formatHumanDate, isOverdue } from "../../utils/date";
import { TagBadge } from "../tags/TagBadge";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  onOpen: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

const priorityLabels: Record<Task["priority"], string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  urgent: "Dringend"
};

const statusLabels: Record<Task["status"], string> = {
  todo: "Offen",
  in_progress: "In Arbeit",
  done: "Erledigt"
};

export function TaskCard({ task, compact = false, onOpen, onDelete }: TaskCardProps) {
  const overdue = task.status !== "done" && isOverdue(task.dueDate);
  const hoverClass = compact ? "" : "transition duration-200 hover:-translate-y-0.5 hover:shadow-panel";

  return (
    <article className={`rounded-lg border bg-white p-4 shadow-sm ${hoverClass} ${overdue ? "border-coral" : "border-line"} ${compact ? "grid gap-2" : "grid gap-3"}`}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 text-left" onClick={() => onOpen(task)}>
          <h3 className="line-clamp-2 text-sm font-semibold text-ink">{task.title}</h3>
          {task.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-600">{task.description}</p> : null}
        </button>
        <div className="flex shrink-0 gap-1">
          <Button aria-label="Öffnen" title="Öffnen" className="h-8 w-8" icon={<Edit3 size={15} />} variant="ghost" onClick={() => onOpen(task)} />
          {onDelete ? (
            <Button aria-label="Löschen" title="Löschen" className="h-8 w-8" icon={<Trash2 size={15} />} variant="ghost" onClick={() => onDelete(task)} />
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge muted>{statusLabels[task.status]}</Badge>
        <Badge muted>{priorityLabels[task.priority]}</Badge>
        {task.subtaskCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
            <CheckCircle2 size={14} />
            {task.subtaskCount}
          </span>
        ) : null}
        {task.dueDate ? (
          <span className={`inline-flex items-center gap-1 text-xs ${overdue ? "text-coral" : "text-slate-600"}`}>
            <CalendarClock size={14} />
            {formatHumanDate(task.dueDate)}
          </span>
        ) : null}
      </div>
      {task.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {task.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
