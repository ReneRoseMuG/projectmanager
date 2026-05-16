import type { CalendarEvent } from "@taskmanager/shared-types";
import { CalendarClock } from "lucide-react";
import { useMemo } from "react";
import { formatHumanDate } from "../../utils/date";

interface UpcomingEventsProps {
  events: CalendarEvent[];
  onOpen: (event: CalendarEvent) => void;
}

export function UpcomingEvents({ events, onOpen }: UpcomingEventsProps) {
  const upcoming = useMemo(() => {
    const now = Date.now();
    return events
      .filter((event) => new Date(event.startTime).getTime() >= now)
      .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())
      .slice(0, 4);
  }, [events]);

  return (
    <section className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <CalendarClock size={18} className="text-teal" />
        <h2 className="text-base font-semibold text-ink">Nächste Termine</h2>
      </div>

      {upcoming.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {upcoming.map((event) => (
            <button
              key={event.id}
              type="button"
              className="grid min-h-24 gap-2 rounded-md border border-line bg-shell/60 p-3 text-left transition hover:border-teal hover:bg-white"
              onClick={() => onOpen(event)}
            >
              <span className="h-1 w-10 rounded" style={{ backgroundColor: event.color ?? "#0f766e" }} />
              <span className="line-clamp-2 text-sm font-semibold text-ink">{event.title}</span>
              <span className="text-xs text-slate-600">{formatHumanDate(event.startTime)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-600">Keine anstehenden Termine</p>
      )}
    </section>
  );
}
