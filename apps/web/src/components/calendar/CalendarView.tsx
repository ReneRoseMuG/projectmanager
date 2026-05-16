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

export function CalendarView({ events, tasks, onDateClick, onEventClick, onEventMove }: CalendarViewProps) {
  const calendarEvents = [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      title: event.title,
      start: event.startTime,
      end: event.endTime,
      allDay: event.isAllDay,
      backgroundColor: event.color ?? "#6366f1",
      borderColor: event.color ?? "#6366f1",
      extendedProps: { kind: "event", source: event }
    })),
    ...tasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        start: task.dueDate ?? undefined,
        allDay: true,
        backgroundColor: "#94a3b8",
        borderColor: "#94a3b8",
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
