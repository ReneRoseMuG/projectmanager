import { format, isBefore, parseISO } from "date-fns";

export function formatHumanDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return format(parseISO(value), "dd.MM.yy");
}

export function isOverdue(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return isBefore(parseISO(value), new Date());
}

export function todayDateInput(): string {
  return format(new Date(), "yyyy-MM-dd");
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
