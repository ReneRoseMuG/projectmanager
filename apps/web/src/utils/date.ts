import { format, isBefore, parseISO } from "date-fns";

export function formatHumanDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return format(parseISO(value), "dd.MM.yy");
}

export function formatHumanTime(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return format(parseISO(value), "HH:mm");
}

export function formatHumanDateTime(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return format(parseISO(value), "dd.MM.yy HH:mm");
}

/**
 * Menschenlesbare Zeitspanne eines Termins. Kapselt die isAllDay-Regel an
 * einer Stelle, damit alle Terminansichten (Widget, Wochen-/Monatsansicht)
 * dieselbe Darstellung nutzen.
 */
export function formatEventTimeRange(startTime: string, endTime: string, isAllDay: boolean): string {
  if (isAllDay) {
    return "Ganztägig";
  }
  return `${format(parseISO(startTime), "HH:mm")} - ${format(parseISO(endTime), "HH:mm")}`;
}

export function isOverdue(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return isBefore(parseISO(value), new Date());
}

export function toDateInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

export function toDateTimeLocalInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.slice(0, 16);
}

export function fromDateTimeLocalInput(value: string): string {
  return new Date(value).toISOString();
}
