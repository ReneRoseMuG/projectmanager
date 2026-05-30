import type { Task } from "@taskmanager/shared-types";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import { resolveTaskStatusColor } from "../../lib/task-status-color";

interface MonthTaskBarProps {
  task: Task;
  dragging?: boolean;
  overlay?: boolean;
  draggable?: boolean;
  onClick?: (task: Task) => void;
}

export function MonthTaskBar({ task, dragging = false, overlay = false, draggable = true, onClick }: MonthTaskBarProps) {
  const drag = useDraggable({
    id: `task-${task.id}`,
    data: { task },
    disabled: overlay || !draggable
  });
  const dndStyle: CSSProperties = overlay
    ? {}
    : {
        transform: CSS.Translate.toString(drag.transform)
      };

  return (
    <button
      ref={overlay ? undefined : drag.setNodeRef}
      type="button"
      title={task.title}
      data-testid={`month-task-${task.id}`}
      className={`flex h-6 w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-left text-[11px] font-semibold text-white transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-steel-700/10 ${
        draggable && !overlay ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${dragging ? "opacity-50" : ""} ${overlay ? "w-56 shadow-panel" : ""}`}
      style={{ backgroundColor: resolveTaskStatusColor(task.status), ...dndStyle }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(task);
      }}
      {...(overlay || !draggable ? {} : drag.attributes)}
      {...(overlay || !draggable ? {} : drag.listeners)}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-white/80" aria-hidden="true" />
      <span className="min-w-0 truncate">{task.title}</span>
    </button>
  );
}
