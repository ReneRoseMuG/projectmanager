import type { CalendarEvent, Milestone, Project, Task } from "@taskmanager/shared-types";
import { DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { addDays, addMilliseconds, differenceInMilliseconds, endOfISOWeek, format, getISOWeek, isBefore, isSameDay, parseISO, set, startOfDay, startOfISOWeek } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { sortCalendarTasks } from "../../lib/task-calendar";
import { Button } from "../ui/Button";
import { CalendarHolidayBadge } from "./CalendarHolidayBadge";
import { WeekEventTile, type EventContext } from "./WeekEventTile";
import { WeekTaskTile } from "./WeekTaskTile";

interface WeekCalendarProps {
  events: CalendarEvent[];
  tasks: Task[];
  projects?: Project[];
  milestones?: Milestone[];
  initialDate?: string;
  onDateClick?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventMove?: (event: CalendarEvent, startTime: string, endTime: string) => Promise<void>;
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (task: Task, dueDate: string) => Promise<void>;
}

const fallbackAccent = "var(--color-steel-700)";
const dayPlanAccent = "var(--color-teal)";
const milestoneAccent = "var(--color-violet)";
const taskAccent = "var(--color-tangerine)";
const neutralEventAccents = new Set(["#6366f1", fallbackAccent]);

function contextualAccent(eventColor: string | null, fallback: string): string {
  return eventColor && !neutralEventAccents.has(eventColor) ? eventColor : fallback;
}

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

export function resolveEventContext(event: CalendarEvent, projects: Project[] = [], milestones: Milestone[] = [], tasks: Task[] = []): EventContext {
  const owners = event.owners;
  const projectOwner = owners.find((owner) => owner.type === "project");
  const milestoneOwner = owners.find((owner) => owner.type === "milestone");
  const taskOwner = owners.find((owner) => owner.type === "task");
  const dayPlanOwner = owners.find((owner) => owner.type === "dayPlan" || (owner.type as string) === "day_plan");

  if (projectOwner) {
    const project = projects.find((candidate) => candidate.id === projectOwner.id);
    return {
      label: project?.name ?? `Projekt #${projectOwner.id}`,
      accentColor: contextualAccent(event.color, project?.color ?? fallbackAccent),
      ownerType: "project",
      responsibleName: project?.responsibleUser?.fullName ?? null
    };
  }

  if (milestoneOwner) {
    const milestone = milestones.find((candidate) => candidate.id === milestoneOwner.id);
    const project = milestone ? projects.find((candidate) => candidate.id === milestone.projectId) : undefined;
    return {
      label: milestone?.name ?? `Meilenstein #${milestoneOwner.id}`,
      accentColor: contextualAccent(event.color, milestone?.color ?? project?.color ?? milestoneAccent),
      ownerType: "milestone",
      responsibleName: milestone?.responsibleUser?.fullName ?? null
    };
  }

  if (taskOwner) {
    const task = tasks.find((candidate) => candidate.id === taskOwner.id);
    return {
      label: task?.title ?? `Aufgabe #${taskOwner.id}`,
      accentColor: contextualAccent(event.color, taskAccent),
      ownerType: "task",
      responsibleName: task?.responsibleUser?.fullName ?? null
    };
  }

  if (dayPlanOwner) {
    return {
      label: "Persönliche Planung",
      accentColor: contextualAccent(event.color, dayPlanAccent),
      ownerType: "dayPlan",
      responsibleName: event.responsibleUser?.fullName ?? null
    };
  }

  return {
    label: "Ohne Kontext",
    accentColor: event.color ?? fallbackAccent,
    ownerType: "none",
    responsibleName: event.responsibleUser?.fullName ?? null
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
    const dueDate = task.dueDate?.slice(0, 10);
    if (dueDate && result[dueDate]) {
      result[dueDate]?.push(task);
    }
  }
  for (const date of days) {
    result[date] = sortCalendarTasks(result[date] ?? []);
  }
  return result;
}

function readDragData(value: unknown): { event?: CalendarEvent; task?: Task } {
  return typeof value === "object" && value !== null ? (value as { event?: CalendarEvent; task?: Task }) : {};
}

function WeekDayColumn({
  date,
  events,
  tasks,
  allTasks,
  projects,
  milestones,
  activeEventId,
  activeTaskId,
  canMoveTasks,
  onDateClick,
  onEventClick,
  onTaskClick
}: {
  date: string;
  events: CalendarEvent[];
  tasks: Task[];
  allTasks: Task[];
  projects: Project[];
  milestones: Milestone[];
  activeEventId: number | null;
  activeTaskId: number | null;
  canMoveTasks: boolean;
  onDateClick?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onTaskClick?: (task: Task) => void;
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
        <div className="flex shrink-0 items-center gap-1">
          <CalendarHolidayBadge dateKey={date} />
          {onDateClick ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<Plus size={15} />}
              title="Termin anlegen"
              aria-label="Termin anlegen"
              onClick={(event) => {
                event.stopPropagation();
                onDateClick(date);
              }}
            />
          ) : null}
        </div>
      </header>

      <div className="grid gap-2">
        {events.map((event) => (
          <WeekEventTile
            key={event.id}
            event={event}
            context={resolveEventContext(event, projects, milestones, allTasks)}
            timeLabel={calendarTimeLabel(event)}
            dragging={activeEventId === event.id}
            onClick={onEventClick}
          />
        ))}
        {tasks.map((task) => (
          <WeekTaskTile
            key={task.id}
            task={task}
            dragging={activeTaskId === task.id}
            draggable={canMoveTasks}
            onClick={onTaskClick}
          />
        ))}
      </div>
    </section>
  );
}

export function WeekCalendar({ events, tasks, projects = [], milestones = [], initialDate, onDateClick, onEventClick, onEventMove, onTaskClick, onTaskMove }: WeekCalendarProps) {
  const [visibleDate, setVisibleDate] = useState(() => parseISO(initialDate ?? toDateKey(new Date())));
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const weekStart = startOfISOWeek(visibleDate);
  const weekEnd = endOfISOWeek(visibleDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => toDateKey(addDays(weekStart, index))), [weekStart]);
  const dayEvents = useMemo(() => eventsByDay(events, weekStart), [events, weekStart]);
  const dayTasks = useMemo(() => tasksByDueDate(tasks, weekStart), [tasks, weekStart]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const canMoveTasks = Boolean(onTaskMove);

  function handleDragStart(event: DragStartEvent) {
    const data = readDragData(event.active.data.current);
    setActiveEvent(data.event ?? null);
    setActiveTask(data.task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const targetDate = typeof event.over?.id === "string" ? event.over.id : null;
    const data = readDragData(event.active.data.current);
    const draggedEvent = data.event;
    const draggedTask = data.task;
    setActiveEvent(null);
    setActiveTask(null);
    if (draggedEvent) {
      if (!targetDate || !onEventMove || targetDate === eventDateKey(draggedEvent)) {
        return;
      }
      const moved = moveEventToDate(draggedEvent, targetDate);
      await onEventMove(draggedEvent, moved.startTime, moved.endTime);
      return;
    }
    if (!draggedTask || !targetDate || !onTaskMove || targetDate === draggedTask.dueDate?.slice(0, 10)) {
      return;
    }
    await onTaskMove(draggedTask, targetDate);
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
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

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={(event) => void handleDragEnd(event).catch(() => undefined)}
        onDragCancel={() => {
          setActiveEvent(null);
          setActiveTask(null);
        }}
      >
        <div className="grid min-h-[560px] grid-flow-col auto-cols-[minmax(220px,1fr)] divide-x divide-line overflow-x-auto lg:grid-flow-row lg:grid-cols-7 lg:auto-cols-auto">
          {weekDays.map((date) => (
            <WeekDayColumn
              key={date}
              date={date}
              events={dayEvents[date] ?? []}
              tasks={dayTasks[date] ?? []}
              allTasks={tasks}
              projects={projects}
              milestones={milestones}
              activeEventId={activeEvent?.id ?? null}
              activeTaskId={activeTask?.id ?? null}
              canMoveTasks={canMoveTasks}
              onDateClick={onDateClick}
              onEventClick={onEventClick}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
        <DragOverlay>
          {activeEvent ? (
            <WeekEventTile
              event={activeEvent}
              context={resolveEventContext(activeEvent, projects, milestones, tasks)}
              timeLabel={calendarTimeLabel(activeEvent)}
              overlay
            />
          ) : activeTask ? (
            <WeekTaskTile task={activeTask} overlay draggable={false} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
