import type { CalendarEvent } from "@taskmanager/shared-types";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock3, GripVertical } from "lucide-react";
import type { CSSProperties } from "react";

export interface EventContext {
  label: string;
  accentColor: string;
  ownerType: string;
}

interface WeekEventTileProps {
  event: CalendarEvent;
  context: EventContext;
  timeLabel: string;
  dragging?: boolean;
  overlay?: boolean;
  onClick?: (event: CalendarEvent) => void;
}

export function WeekEventTile({ event, context, timeLabel, dragging = false, overlay = false, onClick }: WeekEventTileProps) {
  const draggable = useDraggable({
    id: `event-${event.id}`,
    data: { event },
    disabled: overlay
  });
  const style: CSSProperties = overlay
    ? {}
    : {
        transform: CSS.Translate.toString(draggable.transform)
      };

  return (
    <button
      ref={overlay ? undefined : draggable.setNodeRef}
      type="button"
      data-testid={`week-event-${event.id}`}
      className={`group grid w-full min-w-0 gap-1 rounded-md border border-line bg-white p-2 text-left shadow-sm transition hover:border-steel-300 hover:shadow-panel focus:outline-none focus:ring-2 focus:ring-steel-700/10 ${
        dragging ? "opacity-50" : ""
      } ${overlay ? "w-64 shadow-panel" : ""}`}
      style={style}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onClick?.(event);
      }}
      {...(overlay ? {} : draggable.attributes)}
      {...(overlay ? {} : draggable.listeners)}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: context.accentColor }} />
        <span className="min-w-0 truncate text-xs font-semibold text-steel-500">{context.label}</span>
        <GripVertical size={13} className="ml-auto shrink-0 text-steel-300 opacity-0 transition group-hover:opacity-100" />
      </span>
      <span className="line-clamp-2 break-words text-sm font-semibold text-ink">{event.title}</span>
      <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-steel-500">
        <Clock3 size={12} className="shrink-0" />
        <span className="truncate">{timeLabel}</span>
      </span>
    </button>
  );
}
