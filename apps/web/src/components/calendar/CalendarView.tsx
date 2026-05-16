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
  onDateClick: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventMove: (event: CalendarEvent, startTime: string, endTime: string) => Promise<void>;
}

const theme = {
  steel: {
    400: "#94B2D1",
    700: "#2E5984"
  },
  shell: "#F4F7FA",
  ink: "#0F2542",
  tangerine: "#ED8C3A",
  teal: "#2F8E96",
  fern: "#4D9359"
};

const projectAccent: Record<number, string> = {
  1: theme.steel[700],
  2: theme.tangerine,
  3: theme.teal,
  4: theme.fern
};

function getEventAccent(event: CalendarEvent) {
  return event.color ?? (event.projectId ? projectAccent[event.projectId] : undefined) ?? theme.steel[700];
}

export function CalendarView({ events, tasks, onDateClick, onEventClick, onEventMove }: CalendarViewProps) {
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
    if (arg.event.extendedProps.kind === "event") {
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
      await onEventMove(source, startTime, endTime);
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
        headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" }}
        buttonText={{ today: "Heute", month: "Monat", week: "Woche" }}
        events={calendarEvents}
        editable
        dateClick={(arg: DateClickArg) => onDateClick(arg.dateStr)}
        eventClick={handleEventClick}
        eventDrop={handleDrop}
        height="auto"
      />
    </div>
  );
}
