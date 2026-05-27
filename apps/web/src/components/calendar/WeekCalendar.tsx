import type { CalendarEvent, Milestone, Project, Task } from "@taskmanager/shared-types";
import { DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { addDays, addMilliseconds, differenceInMilliseconds, endOfISOWeek, format, getISOWeek, isBefore, isSameDay, parseISO, set, startOfDay, startOfISOWeek } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { WeekEventTile, type EventContext } from "./WeekEventTile";

interface WeekCalendarProps {
  events: CalendarEvent[];
  tasks: Task[];
  projects?: Project[];
  milestones?: Milestone[];
  initialDate?: string;
  onDateClick?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventMove?: (event: CalendarEvent, startTime: string, endTime: string) => Promise<void>;
}

const fallbackAccent = "var(--color-steel-700)";
const dayPlanAccent = "var(--color-teal)";
const milestoneAccent = "var(--color-tangerine)";
const taskAccent = "var(--color-mustard)";

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function eventDateKey(event: CalendarEvent): string {
  return toDateKey(parseISO(event.startTime));
}

function eventEndForRange(event: CalendarEvent): Date {
  const end = parseISO(event.endTime);
  const start = parseISO(event.startTime);
  return isBefore(start, end) ? end : addMilliseconds(start, 1);
}

export function eventsByDay(events: CalendarEvent[], weekStart: Date): Record<string, CalendarEvent[]> {
  const days = Array.from({ length: 7 }, (_, index) => startOfDay(addDays(weekStart, index)));
  const result = Object.fromEntries(days.map((day) => [toDateKey(day), [] as CalendarEvent[]]));

  for (const event of events) {
    const start = parseISO(event.startTime);
    const end = eventEndForRange(event);
    for (const day of days) {
      const nextDay = addDays(day, 1);
      if (isBefore(start, nextDay) && isBefore(day, end)) {
        result[toDateKey(day)]?.push(event);
      }
    }
  }

  for (const dayEvents of Object.values(result)) {
    dayEvents.sort((left, right) => left.startTime.localeCompare(right.startTime) || left.title.localeCompare(right.title));
  }

  return result;
}

export function moveEventToDate(event: CalendarEvent, targetDate: string): { startTime: string; endTime: string } {
  const sourceStart = parseISO(event.startTime);
  const sourceEnd = eventEndForRange(event);
  const target = parseISO(targetDate);
  const nextStart = set(target, {
    hours: sourceStart.getHours(),
    minutes: sourceStart.getMinutes(),
    seconds: sourceStart.getSeconds(),
    milliseconds: sourceStart.getMilliseconds()
  });
  const nextEnd = addMilliseconds(nextStart, differenceInMilliseconds(sourceEnd, sourceStart));
  return {
    startTime: nextStart.toISOString(),
    endTime: nextEnd.toISOString()
  };
}

export function resolveEventContext(event: CalendarEvent, projects: Project[] = [], milestones: Milestone[] = []): EventContext {
  const owners = event.owners;
  const projectOwner = owners.find((owner) => owner.type === "project");
  const milestoneOwner = owners.find((owner) => owner.type === "milestone");
  const taskOwner = owners.find((owner) => owner.type === "task");
  const dayPlanOwner = owners.find((owner) => owner.type === "dayPlan" || (owner.type as string) === "day_plan");

  if (projectOwner) {
    const project = projects.find((candidate) => candidate.id === projectOwner.id);
    return {
      label: project?.name ?? `Projekt #${projectOwner.id}`,
      accentColor: event.color ?? project?.color ?? fallbackAccent,
      ownerType: "project"
    };
  }

  if (milestoneOwner) {
    const milestone = milestones.find((candidate) => candidate.id === milestoneOwner.id);
    const project = milestone ? projects.find((candidate) => candidate.id === milestone.projectId) : undefined;
    return {
      label: milestone?.name ?? `Meilenstein #${milestoneOwner.id}`,
      accentColor: event.color ?? milestone?.color ?? project?.color ?? milestoneAccent,
      ownerType: "milestone"
    };
  }

  if (taskOwner) {
    return {
      label: `Aufgabe #${taskOwner.id}`,
      accentColor: event.color ?? taskAccent,
      ownerType: "task"
    };
  }

  if (dayPlanOwner) {
    return {
      label: "Tagesplan",
      accentColor: event.color ?? dayPlanAccent,
      ownerType: "dayPlan"
    };
  }

  return {
    label: "Ohne Kontext",
    accentColor: event.color ?? fallbackAccent,
    ownerType: "none"
  };
}

function calendarTimeLabel(event: CalendarEvent): string {
  if (event.isAllDay) {
    return "Ganztägig";
  }
  return `${format(parseISO(event.startTime), "HH:mm")} - ${format(parseISO(event.endTime), "HH:mm")}`;
}

function tasksByDueDate(tasks: Task[], weekStart: Date): Record<string, Task[]> {
  const days = Array.from({ length: 7 }, (_, index) => toDateKey(addDays(weekStart, index)));
  const result = Object.fromEntries(days.map((day) => [day, [] as Task[]]));
  for (const task of tasks) {
    if (task.dueDate && result[task.dueDate]) {
      result[task.dueDate]?.push(task);
    }
  }
  return result;
}

function WeekDayColumn({
  date,
  events,
  tasks,
  projects,
  milestones,
  activeEventId,
  onDateClick,
  onEventClick
}: {
  date: string;
  events: CalendarEvent[];
  tasks: Task[];
  projects: Project[];
  milestones: Milestone[];
  activeEventId: number | null;
  onDateClick?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const droppable = useDroppable({ id: date });
  const dateValue = parseISO(date);
  const today = isSameDay(dateValue, new Date());

  return (
    <section
      ref={droppable.setNodeRef}
      data-testid={`week-day-${date}`}
      className={`grid min-h-[520px] min-w-0 content-start gap-3 border-line bg-white p-3 transition ${droppable.isOver ? "bg-teal/10" : ""}`}
      onClick={() => onDateClick?.(date)}
    >
      <header className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-steel-400">{format(dateValue, "EEEE", { locale: de })}</p>
          <h2 className={`text-lg font-bold ${today ? "text-teal" : "text-ink"}`}>{format(dateValue, "dd.MM.")}</h2>
        </div>
        <Button
          size="sm"
          variant="ghost"
          icon={<Plus size={15} />}
          title="Termin anlegen"
          aria-label="Termin anlegen"
          onClick={(event) => {
            event.stopPropagation();
            onDateClick?.(date);
          }}
        />
      </header>

      <div className="grid gap-2">
        {events.map((event) => (
          <WeekEventTile
            key={event.id}
            event={event}
            context={resolveEventContext(event, projects, milestones)}
            timeLabel={calendarTimeLabel(event)}
            dragging={activeEventId === event.id}
            onClick={onEventClick}
          />
        ))}
        {tasks.map((task) => (
          <div key={task.id} className="rounded-md border border-dashed border-steel-200 bg-shell px-2 py-1.5 text-xs font-semibold text-steel-600">
            Aufgabe fällig: {task.title}
          </div>
        ))}
      </div>
    </section>
  );
}

export function WeekCalendar({ events, tasks, projects = [], milestones = [], initialDate, onDateClick, onEventClick, onEventMove }: WeekCalendarProps) {
  const [visibleDate, setVisibleDate] = useState(() => parseISO(initialDate ?? toDateKey(new Date())));
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const weekStart = startOfISOWeek(visibleDate);
  const weekEnd = endOfISOWeek(visibleDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => toDateKey(addDays(weekStart, index))), [weekStart]);
  const dayEvents = useMemo(() => eventsByDay(events, weekStart), [events, weekStart]);
  const dayTasks = useMemo(() => tasksByDueDate(tasks, weekStart), [tasks, weekStart]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(event: DragStartEvent) {
    setActiveEvent(event.active.data.current?.event as CalendarEvent | null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const targetDate = typeof event.over?.id === "string" ? event.over.id : null;
    const draggedEvent = event.active.data.current?.event as CalendarEvent | undefined;
    setActiveEvent(null);
    if (!draggedEvent || !targetDate || !onEventMove || targetDate === eventDateKey(draggedEvent)) {
      return;
    }
    const moved = moveEventToDate(draggedEvent, targetDate);
    await onEventMove(draggedEvent, moved.startTime, moved.endTime);
  }

  return (
    <section className="overflow-hidden rounded-md border border-line bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-steel-400">KW {getISOWeek(weekStart)}</p>
          <h2 className="truncate text-lg font-bold text-ink">
            {format(weekStart, "dd.MM.", { locale: de })} - {format(weekEnd, "dd.MM.yy", { locale: de })}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" icon={<ChevronLeft size={15} />} onClick={() => setVisibleDate((current) => addDays(current, -7))}>
            Zurück
          </Button>
          <Button size="sm" variant="secondary" icon={<CalendarDays size={15} />} onClick={() => setVisibleDate(new Date())}>
            Heute
          </Button>
          <Button size="sm" variant="secondary" icon={<ChevronRight size={15} />} onClick={() => setVisibleDate((current) => addDays(current, 7))}>
            Weiter
          </Button>
        </div>
      </header>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={(event) => void handleDragEnd(event).catch(() => undefined)} onDragCancel={() => setActiveEvent(null)}>
        <div className="grid min-h-[560px] grid-flow-col auto-cols-[minmax(220px,1fr)] divide-x divide-line overflow-x-auto lg:grid-flow-row lg:grid-cols-7 lg:auto-cols-auto">
          {weekDays.map((date) => (
            <WeekDayColumn
              key={date}
              date={date}
              events={dayEvents[date] ?? []}
              tasks={dayTasks[date] ?? []}
              projects={projects}
              milestones={milestones}
              activeEventId={activeEvent?.id ?? null}
              onDateClick={onDateClick}
              onEventClick={onEventClick}
            />
          ))}
        </div>
        <DragOverlay>
          {activeEvent ? (
            <WeekEventTile
              event={activeEvent}
              context={resolveEventContext(activeEvent, projects, milestones)}
              timeLabel={calendarTimeLabel(activeEvent)}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
