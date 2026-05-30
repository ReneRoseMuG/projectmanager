import type { CalendarEvent, Task } from "@taskmanager/shared-types";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import deLocale from "@fullcalendar/core/locales/de";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";

interface CalendarViewProps {
  events: CalendarEvent[];
  tasks: Task[];
  onDateClick?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventMove?: (event: CalendarEvent, startTime: string, endTime: string) => Promise<void>;
  compact?: boolean;
}

const theme = {
  steel: {
    400: "var(--color-steel-400)",
    700: "var(--color-steel-700)"
  },
  shell: "var(--color-shell)",
  ink: "var(--color-ink)",
  tangerine: "var(--color-tangerine)",
  teal: "var(--color-teal)",
  fern: "var(--color-fern)"
};

const projectAccent: Record<number, string> = {
  1: theme.steel[700],
  2: theme.tangerine,
  3: theme.teal,
  4: theme.fern
};

function getEventAccent(event: CalendarEvent) {
  const projectOwner = event.owners.find((owner) => owner.type === "project");
  return event.color ?? (projectOwner ? projectAccent[projectOwner.id] : undefined) ?? theme.steel[700];
}

export function CalendarView({ events, tasks, onDateClick, onEventClick, onEventMove, compact = false }: CalendarViewProps) {
  const calendarEvents = [
    ...events.map((event) => {
      const accent = getEventAccent(event);
      return {
        id: `event-${event.id}`,
        title: event.title,
        start: event.startTime,
        end: event.endTime,
        allDay: event.isAllDay,
        backgroundColor: accent,
        borderColor: accent,
        extendedProps: { kind: "event", source: event }
      };
    }),
    ...tasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        start: task.dueDate ?? undefined,
        allDay: true,
        backgroundColor: theme.shell,
        borderColor: theme.steel[400],
        textColor: theme.ink,
        classNames: ["task-due-event"],
        editable: false,
        extendedProps: { kind: "task", source: task }
      }))
  ];

  const handleEventClick = (arg: EventClickArg) => {
    if (arg.event.extendedProps.kind === "event" && onEventClick) {
      onEventClick(arg.event.extendedProps.source as CalendarEvent);
    }
  };

  const handleDrop = async (arg: EventDropArg) => {
    if (arg.event.extendedProps.kind !== "event") {
      arg.revert();
      return;
    }

    const source = arg.event.extendedProps.source as CalendarEvent;
    const startTime = arg.event.start?.toISOString();
    const endTime = arg.event.end?.toISOString() ?? startTime;
    if (!startTime || !endTime) {
      arg.revert();
      return;
    }

    try {
      await onEventMove?.(source, startTime, endTime);
    } catch {
      arg.revert();
    }
  };

  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locales={[deLocale]}
        locale="de"
        initialView="dayGridMonth"
        headerToolbar={compact ? { left: "prev,next", center: "title", right: "" } : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" }}
        buttonText={{ today: "Heute", month: "Monat", week: "Woche" }}
        events={calendarEvents}
        editable={Boolean(onEventMove)}
        dateClick={onDateClick ? (arg: DateClickArg) => onDateClick(arg.dateStr) : undefined}
        eventClick={handleEventClick}
        eventDrop={onEventMove ? handleDrop : undefined}
        height="auto"
      />
    </div>
  );
}
