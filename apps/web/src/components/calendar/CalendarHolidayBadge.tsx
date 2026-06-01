import { getGermanHolidaysForDate } from "../../lib/german-holidays";

interface CalendarHolidayBadgeProps {
  dateKey: string;
}

export function getCalendarHolidayNames(dateKey: string): string[] {
  return getGermanHolidaysForDate(dateKey);
}

export function CalendarHolidayBadge({ dateKey }: CalendarHolidayBadgeProps) {
  const holidays = getGermanHolidaysForDate(dateKey);
  if (holidays.length === 0) {
    return null;
  }

  const label = holidays[0] ?? "Feiertag";

  return (
    <span
      title={holidays.join(", ")}
      className="inline-flex min-h-6 max-w-full items-center truncate rounded-md border border-crimson bg-crimson/10 px-2 text-xs font-semibold text-ink"
      data-testid={`calendar-holiday-${dateKey}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
