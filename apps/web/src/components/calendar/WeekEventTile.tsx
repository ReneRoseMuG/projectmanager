import type { CalendarEvent } from "@taskmanager/shared-types";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, CalendarDays, ClipboardList, Flag, FolderKanban, GripVertical, ListTodo, Lock } from "lucide-react";
import type { CSSProperties } from "react";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { StatusPill } from "../ui/StatusPill";

export interface EventContext {
  label: string;
  accentColor: string;
  ownerType: string;
  status: string | null;
  responsibleName: string | null;
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
    disabled: overlay || event.readonly
  });
  const style: CSSProperties = overlay
    ? {}
    : {
        transform: CSS.Translate.toString(draggable.transform)
      };
  const tileStyle: CSSProperties = {
    ...style,
    ["--event-accent" as string]: context.accentColor
  };
  const Icon = eventContextIcon(context.ownerType);

  return (
    <button
      ref={overlay ? undefined : draggable.setNodeRef}
      type="button"
      data-testid={`week-event-${event.id}`}
      className={`group relative grid w-full min-w-0 gap-3 overflow-hidden rounded-lg border border-line bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-steel-300 hover:shadow-panel focus:outline-none focus:ring-2 focus:ring-steel-700/10 ${
        dragging ? "opacity-50" : ""
      } ${overlay ? "w-64 shadow-panel" : ""}`}
      style={tileStyle}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onClick?.(event);
      }}
      {...(overlay ? {} : draggable.attributes)}
      {...(overlay ? {} : draggable.listeners)}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ backgroundColor: "var(--event-accent)" }} />
      <span className="flex min-w-0 items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-shell text-steel-700">
            <Icon size={15} />
          </span>
          <span className="grid min-w-0 gap-0.5">
            <span className="min-w-0 truncate text-xs font-semibold text-steel-500">{context.label}</span>
            <span className="truncate text-xs font-medium text-steel-500">{timeLabel}</span>
          </span>
        </span>
        <GripVertical size={13} className="ml-auto shrink-0 text-steel-300 opacity-0 transition group-hover:opacity-100" />
      </span>
      <span className="line-clamp-2 break-words text-sm font-semibold text-ink">{event.title}</span>
      {event.origin !== "local" ? (
        <span className="flex">
          <Badge tone={event.origin === "google" ? "teal" : "violet"}>
            <Lock size={10} className="mr-1" />
            {event.origin === "google" ? "Google" : "NextCloud"}
          </Badge>
        </span>
      ) : null}
      <span className="flex min-w-0 items-center justify-between gap-2">
        {context.status ? <StatusPill kind="workStatus" value={context.status} /> : <span className="inline-flex min-h-6 items-center rounded-md border border-line bg-shell px-2 text-xs font-semibold text-steel-600">Ohne Kontext</span>}
        {context.responsibleName ? <Avatar name={context.responsibleName} size="sm" /> : null}
      </span>
    </button>
  );
}

function eventContextIcon(ownerType: string) {
  if (ownerType === "project") {
    return FolderKanban;
  }
  if (ownerType === "milestone") {
    return Flag;
  }
  if (ownerType === "task") {
    return ListTodo;
  }
  if (ownerType === "dayPlan") {
    return CalendarDays;
  }
  if (ownerType === "none") {
    return CalendarClock;
  }
  return ClipboardList;
}
