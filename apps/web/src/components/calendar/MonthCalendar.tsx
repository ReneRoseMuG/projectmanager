import type { CalendarEvent, Task } from "@taskmanager/shared-types";
import { DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { addMonths, eachDayOfInterval, endOfISOWeek, endOfMonth, format, getISOWeek, isSameDay, isSameMonth, parseISO, startOfISOWeek, startOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { sortCalendarTasks } from "../../lib/task-calendar";
import { Button } from "../ui/Button";
import { CalendarHolidayBadge, getCalendarHolidayNames } from "./CalendarHolidayBadge";
import { MonthTaskBar } from "./MonthTaskBar";

interface MonthCalendarProps {
  events?: CalendarEvent[];
  tasks: Task[];
  initialDate?: string;
  visibleDate?: Date;
  onVisibleDateChange?: (date: Date) => void;
  hideHeader?: boolean;
  onDateClick?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (task: Task, dueDate: string) => Promise<void>;
}

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function monthDays(visibleDate: Date): Date[] {
  const monthStart = startOfMonth(visibleDate);
  const monthEnd = endOfMonth(visibleDate);
  return eachDayOfInterval({
    start: startOfISOWeek(monthStart),
    end: endOfISOWeek(monthEnd)
  });
}

export function tasksByDueDate(tasks: Task[]): Record<string, Task[]> {
  const result: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!task.dueDate) {
      continue;
    }
    const dateKey = task.dueDate.slice(0, 10);
    result[dateKey] = [...(result[dateKey] ?? []), task];
  }
  for (const dateKey of Object.keys(result)) {
    result[dateKey] = sortCalendarTasks(result[dateKey] ?? []);
  }
  return result;
}

function eventDateKey(event: CalendarEvent): string {
  return format(parseISO(event.startTime), "yyyy-MM-dd");
}

function eventsByStartDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const result: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const dateKey = eventDateKey(event);
    result[dateKey] = [...(result[dateKey] ?? []), event];
  }
  for (const dateKey of Object.keys(result)) {
    result[dateKey] = [...(result[dateKey] ?? [])].sort((left, right) => left.startTime.localeCompare(right.startTime) || left.title.localeCompare(right.title));
  }
  return result;
}

function MonthDayCell({
  date,
  currentMonth,
  events,
  tasks,
  draggable,
  activeTaskId,
  onDateClick,
  onEventClick,
  onTaskClick
}: {
  date: Date;
  currentMonth: Date;
  events: CalendarEvent[];
  tasks: Task[];
  draggable: boolean;
  activeTaskId: number | null;
  onDateClick?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onTaskClick?: (task: Task) => void;
}) {
  const dateKey = toDateKey(date);
  const droppable = useDroppable({ id: dateKey });
  const inCurrentMonth = isSameMonth(date, currentMonth);
  const today = isSameDay(date, new Date());
  const holidayNames = getCalendarHolidayNames(dateKey);
  const cellStyle: CSSProperties | undefined =
    holidayNames.length > 0
      ? {
          backgroundColor: "color-mix(in srgb, var(--color-crimson) 14%, var(--color-white))"
        }
      : undefined;

  return (
    <section
      ref={droppable.setNodeRef}
      className={`grid min-h-32 min-w-0 content-start gap-2 border-t p-2 transition ${
        holidayNames.length > 0 ? "calendar-holiday-cell border-line" : `border-line ${today ? "bg-teal/5" : inCurrentMonth ? "bg-white" : "bg-shell/60"}`
      } ${droppable.isOver ? "bg-teal/10" : ""}`}
      style={cellStyle}
      data-testid={`month-day-${dateKey}`}
    >
      <header className="flex min-w-0 items-start justify-between gap-2">
        <span className={`text-sm font-semibold ${today ? "text-teal" : inCurrentMonth ? "text-ink" : "text-steel-400"}`}>
          {format(date, "d", { locale: de })}
        </span>
        <div className="flex min-w-0 items-center gap-1">
          <CalendarHolidayBadge dateKey={dateKey} />
          {onDateClick ? (
            <button
              type="button"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-steel-500 transition hover:bg-teal/10 hover:text-teal"
              title="Termin anlegen"
              aria-label="Termin anlegen"
              onClick={(event) => {
                event.stopPropagation();
                onDateClick(dateKey);
              }}
            >
              <Plus size={14} />
            </button>
          ) : null}
        </div>
      </header>
      <div className="grid min-w-0 gap-1">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            className="min-w-0 truncate rounded-md border border-line bg-steel-50 px-2 py-1 text-left text-xs font-semibold text-ink transition hover:border-teal hover:bg-teal/10"
            onClick={() => onEventClick?.(event)}
            data-testid={`month-event-${event.id}`}
          >
            {event.title}
          </button>
        ))}
        {tasks.map((task) => (
          <MonthTaskBar
            key={task.id}
            task={task}
            dragging={activeTaskId === task.id}
            draggable={draggable}
            onClick={onTaskClick}
          />
        ))}
      </div>
    </section>
  );
}

export function MonthCalendar({ events = [], tasks, initialDate, visibleDate, onVisibleDateChange, hideHeader = false, onDateClick, onEventClick, onTaskClick, onTaskMove }: MonthCalendarProps) {
  const [localVisibleDate, setLocalVisibleDate] = useState(() => parseISO(initialDate ?? toDateKey(new Date())));
  const currentVisibleDate = visibleDate ?? localVisibleDate;
  const setCurrentVisibleDate = onVisibleDateChange ?? setLocalVisibleDate;
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const days = useMemo(() => monthDays(currentVisibleDate), [currentVisibleDate]);
  const groupedEvents = useMemo(() => eventsByStartDate(events), [events]);
  const groupedTasks = useMemo(() => tasksByDueDate(tasks), [tasks]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const canDragTasks = Boolean(onTaskMove);

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(event.active.data.current?.task as Task | null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const targetDate = typeof event.over?.id === "string" ? event.over.id : null;
    const draggedTask = event.active.data.current?.task as Task | undefined;
    setActiveTask(null);
    if (!draggedTask || !targetDate || !onTaskMove || targetDate === draggedTask.dueDate?.slice(0, 10)) {
      return;
    }
    await onTaskMove(draggedTask, targetDate);
  }

  return (
    <section className={hideHeader ? "overflow-hidden bg-white" : "overflow-hidden rounded-lg border border-line bg-white shadow-sm"}>
      {hideHeader ? null : (
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
        <Button size="sm" variant="secondary" icon={<ChevronLeft size={15} />} onClick={() => setCurrentVisibleDate(addMonths(currentVisibleDate, -1))}>
          Zurück
        </Button>
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <h2 className="truncate text-lg font-bold text-ink">{format(currentVisibleDate, "MMMM yyyy", { locale: de })}</h2>
          <Button size="sm" variant="secondary" icon={<CalendarDays size={15} />} onClick={() => setCurrentVisibleDate(new Date())}>
            Heute
          </Button>
        </div>
        <Button size="sm" variant="secondary" icon={<ChevronRight size={15} />} onClick={() => setCurrentVisibleDate(addMonths(currentVisibleDate, 1))}>
          Weiter
        </Button>
      </header>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={(event) => void handleDragEnd(event).catch(() => undefined)} onDragCancel={() => setActiveTask(null)}>
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[50px_repeat(7,minmax(0,1fr))] border-b border-line bg-shell">
            <div className="border-r border-line px-2 py-2 text-xs font-bold uppercase tracking-wide text-steel-400">KW</div>
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((weekday) => (
              <div key={weekday} className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-steel-400">
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid min-w-[760px] grid-cols-[50px_repeat(7,minmax(0,1fr))]">
            {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIndex) => {
              const week = days.slice(weekIndex * 7, weekIndex * 7 + 7);
              return [
                <div key={`kw-${weekIndex}`} className="flex min-h-32 items-start justify-center border-r border-t border-line bg-shell p-2 text-sm font-bold text-steel-700">
                  {getISOWeek(week[0] ?? currentVisibleDate)}
                </div>,
                ...week.map((date) => {
                  const dateKey = toDateKey(date);
                  return (
                    <MonthDayCell
                      key={dateKey}
                      date={date}
                      currentMonth={currentVisibleDate}
                      events={groupedEvents[dateKey] ?? []}
                      tasks={groupedTasks[dateKey] ?? []}
                      draggable={canDragTasks}
                      activeTaskId={activeTask?.id ?? null}
                      onDateClick={onDateClick}
                      onEventClick={onEventClick}
                      onTaskClick={onTaskClick}
                    />
                  );
                })
              ];
            })}
          </div>
        </div>
        <DragOverlay>{activeTask ? <MonthTaskBar task={activeTask} overlay draggable={false} /> : null}</DragOverlay>
      </DndContext>
    </section>
  );
}
