import type { Task } from "@taskmanager/shared-types";
import { CalendarClock, Check, CheckCircle2, Edit3, Trash2 } from "lucide-react";
import { formatHumanDate, isOverdue } from "../../utils/date";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Pill, type PillTone } from "../ui/Pill";

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  variant?: "card" | "row";
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

const priorityBar: Record<Task["priority"], string> = {
  urgent: "border-t-2 border-t-crimson",
  high: "border-t-2 border-t-tangerine",
  medium: "border-t-2 border-t-mustard",
  low: "border-t-2 border-t-steel-400"
};

const rowPriorityBar: Record<Task["priority"], string> = {
  urgent: "border-l-crimson",
  high: "border-l-tangerine",
  medium: "border-l-mustard",
  low: "border-l-steel-400"
};

const checkboxTone: Record<Task["status"], string> = {
  todo: "border-steel-400 bg-white text-transparent",
  in_progress: "border-tangerine bg-tangerine text-white",
  done: "border-fern bg-fern text-white"
};

const statusTones: Record<Task["status"], PillTone> = {
  todo: "crimson",
  in_progress: "tangerine",
  done: "fern"
};

const priorityTones: Record<Task["priority"], "crimson" | "tangerine" | "mustard" | "steel"> = {
  urgent: "crimson",
  high: "tangerine",
  medium: "mustard",
  low: "steel"
};

const tagTones: Array<"violet" | "teal" | "magenta" | "fern" | "steel"> = ["violet", "teal", "magenta", "fern", "steel"];

function AssigneeAvatar({ assignee }: { assignee: string | null }) {
  const initials = assignee
    ? assignee
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "RM";

  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet to-magenta text-[11px] font-bold text-white">{initials}</span>;
}

export function TaskCard({ task, compact = false, variant = "card", onOpen, onDelete }: TaskCardProps) {
  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <TaskCard task={task} compact={compact} onOpen={onOpen} onDelete={onDelete} />
        </div>
        <TaskRow task={task} onOpen={onOpen} onDelete={onDelete} />
      </>
    );
  }

  const overdue = task.status !== "done" && isOverdue(task.dueDate);
  const hoverClass = compact ? "" : "transition duration-200 hover:-translate-y-0.5 hover:shadow-panel";
  const hasMeta = task.subtaskCount > 0 || Boolean(task.dueDate);

  return (
    <article className={`rounded-lg border border-line bg-white p-4 shadow-sm ${priorityBar[task.priority]} ${hoverClass} ${compact ? "grid gap-2" : "grid gap-3"}`}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 text-left" onClick={() => onOpen(task)}>
          <h3 className="line-clamp-2 text-sm font-semibold text-ink">{task.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Pill tone={statusTones[task.status]}>{statusLabels[task.status]}</Pill>
            <Badge tone={priorityTones[task.priority]}>{priorityLabels[task.priority]}</Badge>
          </div>
          {task.description ? <p className="mt-2 line-clamp-2 text-xs text-slate-600">{task.description}</p> : null}
        </button>
        <div className="flex shrink-0 gap-1">
          <Button aria-label="Öffnen" title="Öffnen" className="h-8 w-8" icon={<Edit3 size={15} />} variant="ghost" onClick={() => onOpen(task)} />
          {onDelete ? (
            <Button aria-label="Löschen" title="Löschen" className="h-8 w-8" icon={<Trash2 size={15} />} variant="ghost" onClick={() => onDelete(task)} />
          ) : null}
        </div>
      </div>
      {hasMeta ? (
        <footer className="flex flex-wrap items-center gap-3 border-t border-line pt-2 text-xs text-slate-600">
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
        </footer>
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
    </article>
  );
}

function TaskRow({ task, onOpen, onDelete }: { task: Task; onOpen: (task: Task) => void; onDelete?: (task: Task) => void }) {
  const overdue = task.status !== "done" && isOverdue(task.dueDate);
  const primaryTag = task.tags[0];

  return (
    <article
      className={`hidden grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto_auto] items-center gap-4 rounded-xl border border-l-[4px] border-line bg-white px-4 py-3.5 shadow-sm transition hover:border-steel-300 hover:shadow-md md:grid ${rowPriorityBar[task.priority]}`}
    >
      <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${checkboxTone[task.status]}`} aria-hidden="true">
        {task.status !== "todo" ? <Check size={14} strokeWidth={3} /> : null}
      </span>
      <button type="button" className="min-w-0 text-left" onClick={() => onOpen(task)}>
        <h3 className="truncate text-[14px] font-semibold text-ink">{task.title}</h3>
        <p className="truncate text-[12px] text-slate-500">{task.description || "Keine Beschreibung"}</p>
      </button>
      <Pill tone={statusTones[task.status]}>{statusLabels[task.status]}</Pill>
      {primaryTag ? <Badge tone={tagTones[0]}>{primaryTag.name}</Badge> : <Badge tone="mute">Ohne Tag</Badge>}
      <span className={`inline-flex min-w-[82px] items-center gap-1 text-xs font-semibold ${overdue ? "text-crimson" : "text-slate-500"}`}>
        <CalendarClock size={14} />
        {task.dueDate ? formatHumanDate(task.dueDate) : "Ohne Datum"}
      </span>
      <AssigneeAvatar assignee={task.assignee} />
      <div className="flex justify-end gap-1">
        <Button aria-label="Öffnen" title="Öffnen" className="h-8 w-8" icon={<Edit3 size={15} />} variant="ghost" onClick={() => onOpen(task)} />
        {onDelete ? <Button aria-label="Löschen" title="Löschen" className="h-8 w-8" icon={<Trash2 size={15} />} variant="ghost" onClick={() => onDelete(task)} /> : null}
      </div>
    </article>
  );
}
