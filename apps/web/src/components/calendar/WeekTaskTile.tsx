import type { Task } from "@taskmanager/shared-types";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical } from "lucide-react";
import type { CSSProperties, KeyboardEvent } from "react";
import { resolveTaskStatusColor } from "../../lib/task-status-color";
import { formatHumanDate } from "../../utils/date";

export const WEEK_TILE_HEADER_HEIGHT_PX = 48;
export const WEEK_TILE_FOOTER_HEIGHT_PX = 60;
export const WEEK_TILE_MIN_HEIGHT_PX = 180;

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
      className={`group grid min-h-[180px] w-full min-w-0 overflow-hidden rounded-lg border border-line bg-white text-left shadow-sm transition hover:shadow-panel focus:outline-none focus:ring-2 focus:ring-steel-700/10 ${
        draggable && !overlay ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${dragging ? "opacity-50" : ""} ${overlay ? "w-64 shadow-panel" : ""}`}
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        activate();
      }}
      onKeyDown={handleKeyDown}
      {...interactionAttributes}
      {...(overlay || !draggable ? {} : drag.listeners)}
    >
      <div className="flex min-h-12 items-start justify-between gap-2 rounded-t-lg px-3 py-2 text-xs font-semibold text-white" style={{ backgroundColor: resolveTaskStatusColor(task.status) }}>
        <span className="inline-flex min-h-6 max-w-full items-center rounded-md border border-white/20 bg-white/10 px-2 text-xs font-semibold text-white">
          <span className="truncate">{task.status}</span>
        </span>
        {draggable && !overlay ? <GripVertical size={14} className="shrink-0 text-white/80 opacity-0 transition group-hover:opacity-100" /> : null}
      </div>
      <div className="min-w-0 bg-white px-3 py-2">
        <h3 className="line-clamp-3 break-words text-sm font-semibold text-ink">{task.title}</h3>
      </div>
      <footer className="mt-auto flex min-h-[60px] items-center gap-2 border-t border-line bg-shell px-3 py-2 text-xs text-steel-500">
        <CalendarDays size={13} className="shrink-0 text-steel-400" />
        <span className="truncate">{task.dueDate ? `Fällig ${formatHumanDate(task.dueDate)}` : "Ohne Fälligkeit"}</span>
      </footer>
    </article>
  );
}
