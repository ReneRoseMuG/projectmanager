import type { Task } from "@taskmanager/shared-types";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ListTodo } from "lucide-react";
import type { CSSProperties, KeyboardEvent } from "react";
import { resolveTaskStatusColor } from "../../lib/task-status-color";
import { Avatar } from "../ui/Avatar";
import { StatusPill } from "../ui/StatusPill";

export const WEEK_TILE_HEADER_HEIGHT_PX = 48;
export const WEEK_TILE_FOOTER_HEIGHT_PX = 0;
export const WEEK_TILE_MIN_HEIGHT_PX = 136;

interface WeekTaskTileProps {
  task: Task;
  dragging?: boolean;
  overlay?: boolean;
  draggable?: boolean;
  onClick?: (task: Task) => void;
}

export function WeekTaskTile({ task, dragging = false, overlay = false, draggable = true, onClick }: WeekTaskTileProps) {
  const drag = useDraggable({
    id: `task-${task.id}`,
    data: { task },
    disabled: overlay || !draggable
  });
  const style: CSSProperties = overlay
    ? {}
    : {
        transform: CSS.Translate.toString(drag.transform)
      };
  const tileStyle: CSSProperties = {
    ...style,
    ["--task-accent" as string]: resolveTaskStatusColor(task.status)
  };
  const interactionAttributes = overlay || !draggable ? { role: "button", tabIndex: 0 } : drag.attributes;

  function activate() {
    onClick?.(task);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    activate();
  }

  return (
    <article
      ref={overlay ? undefined : drag.setNodeRef}
      data-testid={`week-task-${task.id}`}
      className={`group relative grid min-h-[136px] w-full min-w-0 gap-3 overflow-hidden rounded-lg border border-line bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-steel-300 hover:shadow-panel focus:outline-none focus:ring-2 focus:ring-steel-700/10 ${
        draggable && !overlay ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${dragging ? "opacity-50" : ""} ${overlay ? "w-64 shadow-panel" : ""}`}
      style={tileStyle}
      onClick={(event) => {
        event.stopPropagation();
        activate();
      }}
      onKeyDown={handleKeyDown}
      {...interactionAttributes}
      {...(overlay || !draggable ? {} : drag.listeners)}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ backgroundColor: "var(--task-accent)" }} />
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-shell text-steel-700">
            <ListTodo size={15} />
          </span>
          <span className="min-w-0 truncate text-xs font-semibold text-steel-500">Aufgabe</span>
        </span>
        {draggable && !overlay ? <GripVertical size={14} className="shrink-0 text-steel-300 opacity-0 transition group-hover:opacity-100" /> : null}
      </div>
      <h3 className="line-clamp-3 break-words text-sm font-semibold text-ink">{task.title}</h3>
      <div className="mt-auto flex min-w-0 items-center justify-between gap-2">
        <StatusPill kind="workStatus" value={task.status} />
        {task.responsibleUser?.fullName ? <Avatar name={task.responsibleUser.fullName} size="sm" /> : null}
      </div>
    </article>
  );
}
