import type { CalendarEvent } from "@taskmanager/shared-types";
import { CalendarClock } from "lucide-react";
import { useMemo } from "react";
import { formatHumanDate } from "../../utils/date";
import { richTextToPlainText } from "../../utils/richText";
import { ItemRow } from "../ui/ItemRow";

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
        <CalendarClock size={18} className="text-fern" />
        <h2 className="text-base font-semibold text-ink">Nächste Termine</h2>
      </div>

      {upcoming.length > 0 ? (
        <div className="grid gap-2">
          {upcoming.map((event) => {
            const description = richTextToPlainText(event.description);

            return (
              <ItemRow
                key={event.id}
                accentColor={event.color ?? "var(--color-teal)"}
                statusIndicator={<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-fern/10 text-fern"><CalendarClock size={16} /></span>}
                title={event.title}
                description={description}
                meta={<span className="text-xs font-semibold text-steel-600">{formatHumanDate(event.startTime)}</span>}
                onOpen={() => onOpen(event)}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-steel-600">Keine anstehenden Termine</p>
      )}
    </section>
  );
}
