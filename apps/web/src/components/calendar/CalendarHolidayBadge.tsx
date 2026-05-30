import { getGermanHolidaysForDate } from "../../lib/german-holidays";

interface CalendarHolidayBadgeProps {
  dateKey: string;
}

export function CalendarHolidayBadge({ dateKey }: CalendarHolidayBadgeProps) {
  const holidays = getGermanHolidaysForDate(dateKey);
  if (holidays.length === 0) {
    return null;
  }

  return (
    <span
      title={holidays.join(", ")}
      className="inline-flex items-center rounded border border-line bg-shell px-1.5 py-0.5 text-[10px] font-semibold text-steel-600"
      data-testid={`calendar-holiday-${dateKey}`}
    >
      FT
    </span>
  );
}
