import type { CalendarEvent, EventOrigin, Milestone, Project, Task } from "@taskmanager/shared-types";
import { addDays, addMonths, endOfISOWeek, format, getISOWeek, parseISO, startOfISOWeek } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { FilterChips } from "../ui/FilterChips";
import { SegmentedControl } from "../ui/SegmentedControl";
import { MonthCalendar } from "./MonthCalendar";
import { WeekCalendar } from "./WeekCalendar";

type CalendarWidgetMode = "interactive" | "readonly";
type CalendarWidgetViewMode = "week" | "month";

interface CalendarWidgetViewProps {
  events: CalendarEvent[];
  tasks: Task[];
  projects?: Project[];
  milestones?: Milestone[];
  mode?: CalendarWidgetMode;
  compact?: boolean;
  initialDate?: string;
  initialView?: CalendarWidgetViewMode;
  onDateClick?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventMove?: (event: CalendarEvent, startTime: string, endTime: string) => Promise<void>;
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (task: Task, dueDate: string) => Promise<void>;
}

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function viewTitle(viewMode: CalendarWidgetViewMode, visibleDate: Date): { title: string; subtitle: string } {
  if (viewMode === "month") {
    return {
      title: format(visibleDate, "MMMM yyyy", { locale: de }),
      subtitle: "Monatsansicht"
    };
  }

  const weekStart = startOfISOWeek(visibleDate);
  const weekEnd = endOfISOWeek(visibleDate);
  return {
    title: `KW ${getISOWeek(weekStart)}`,
    subtitle: `${format(weekStart, "dd.MM.", { locale: de })} - ${format(weekEnd, "dd.MM.yy", { locale: de })}`
  };
}

export function CalendarWidgetView({
  events,
  tasks,
  projects = [],
  milestones = [],
  mode = "readonly",
  compact = false,
  initialDate,
  initialView,
  onDateClick,
  onEventClick,
  onEventMove,
  onTaskClick,
  onTaskMove
}: CalendarWidgetViewProps) {
  const [viewMode, setViewMode] = useState<CalendarWidgetViewMode>(initialView ?? (compact ? "month" : "week"));
  const [visibleDate, setVisibleDate] = useState(() => parseISO(initialDate ?? toDateKey(new Date())));
  const title = viewTitle(viewMode, visibleDate);
  const canCreateEvents = mode === "interactive" && Boolean(onDateClick);

  const [originFilter, setOriginFilter] = useState<EventOrigin | "all">("all");
  const originCounts = useMemo(() => {
    const counts: Record<EventOrigin, number> = { local: 0, nextcloud: 0, google: 0 };
    for (const event of events) {
      counts[event.origin] += 1;
    }
    return counts;
  }, [events]);
  const originOptions = ([
    ["local", "Lokal"],
    ["nextcloud", "NextCloud"],
    ["google", "Google"]
  ] as const)
    .filter(([origin]) => originCounts[origin] > 0)
    .map(([origin, label]) => ({ value: origin, label, count: originCounts[origin] }));
  const showOriginFilter = originOptions.length > 1;
  const visibleEvents = originFilter === "all" ? events : events.filter((event) => event.origin === originFilter);

  const movePrevious = () => {
    setVisibleDate((current) => viewMode === "month" ? addMonths(current, -1) : addDays(current, -7));
  };

  const moveNext = () => {
    setVisibleDate((current) => viewMode === "month" ? addMonths(current, 1) : addDays(current, 7));
  };
  const shellClassName = compact
    ? "flex h-full min-h-0 overflow-hidden bg-white"
    : "flex h-full min-h-0 overflow-hidden rounded-lg border border-line bg-white shadow-sm";

  return (
    <section className={shellClassName} data-testid="calendar-widget-view">
      <button
        type="button"
        className="flex w-7 shrink-0 items-center justify-center border-r border-line bg-steel-50 text-steel-700 transition hover:bg-steel-100 hover:text-ink"
        aria-label="Vorheriger Zeitraum"
        onClick={movePrevious}
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-steel-400">{title.title}</p>
            <h2 className="truncate text-lg font-bold text-ink">{title.subtitle}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={viewMode}
              options={[
                { value: "week", label: "Woche" },
                { value: "month", label: "Monat" }
              ]}
              onChange={setViewMode}
            />
            <Button size="sm" variant="secondary" icon={<CalendarDays size={15} />} onClick={() => setVisibleDate(new Date())}>
              Heute
            </Button>
          </div>
        </header>

        {showOriginFilter ? (
          <div className="border-b border-line bg-white px-4 py-2" data-testid="calendar-origin-filter">
            <FilterChips value={originFilter} onChange={setOriginFilter} options={originOptions} allLabel="Alle Kalender" allCount={events.length} />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto">
          {viewMode === "week" ? (
            <WeekCalendar
              events={visibleEvents}
              tasks={tasks}
              projects={projects}
              milestones={milestones}
              visibleDate={visibleDate}
              onVisibleDateChange={setVisibleDate}
              hideHeader
              onDateClick={canCreateEvents ? onDateClick : undefined}
              onEventClick={mode === "interactive" ? onEventClick : undefined}
              onEventMove={mode === "interactive" ? onEventMove : undefined}
              onTaskClick={mode === "interactive" ? onTaskClick : undefined}
              onTaskMove={mode === "interactive" ? onTaskMove : undefined}
            />
          ) : (
            <MonthCalendar
              events={visibleEvents}
              tasks={tasks}
              visibleDate={visibleDate}
              onVisibleDateChange={setVisibleDate}
              hideHeader
              onDateClick={canCreateEvents ? onDateClick : undefined}
              onEventClick={mode === "interactive" ? onEventClick : undefined}
              onTaskClick={mode === "interactive" ? onTaskClick : undefined}
              onTaskMove={mode === "interactive" ? onTaskMove : undefined}
            />
          )}
        </div>

      </div>

      <button
        type="button"
        className="flex w-7 shrink-0 items-center justify-center border-l border-line bg-steel-50 text-steel-700 transition hover:bg-steel-100 hover:text-ink"
        aria-label="Nächster Zeitraum"
        onClick={moveNext}
      >
        <ChevronRight size={16} />
      </button>
    </section>
  );
}
