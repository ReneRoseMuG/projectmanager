import Holidays from "date-holidays";

const holidayCache = new Map<string, Holidays>();

function holidayClient(state?: string): Holidays {
  const normalizedState = state?.trim().toUpperCase();
  const key = normalizedState ?? "DE";
  const cached = holidayCache.get(key);
  if (cached) {
    return cached;
  }

  const client = normalizedState
    ? new Holidays("DE", normalizedState, { languages: ["de"], types: ["public"] })
    : new Holidays("DE", { languages: ["de"], types: ["public"] });
  holidayCache.set(key, client);
  return client;
}

/** Returns national German holiday names for a date, plus optional state-specific names. */
export function getGermanHolidaysForDate(dateKey: string, states: string[] = []): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return [];
  }

  const names = new Set<string>();
  const clients = [holidayClient(), ...states.map((state) => holidayClient(state))];
  for (const client of clients) {
    const holidays = client.isHoliday(dateKey);
    if (!holidays) {
      continue;
    }
    for (const holiday of holidays) {
      names.add(holiday.name);
    }
  }
  return [...names];
}
