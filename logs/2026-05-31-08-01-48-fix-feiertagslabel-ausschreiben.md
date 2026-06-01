# Log: Feiertagslabel ausschreiben

**Datum:** 31.05.26  
**Uhrzeit:** 08:01:48  
**Schritt:** Fix — Feiertagslabel ausschreiben  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Abkürzung `FT` wurde aus dem Kalender entfernt. Feiertagsbadges zeigen nun immer den ausgeschriebenen Feiertagsnamen, auch im Monatskalender. Als Fallback wird `Feiertag` verwendet, falls keine konkrete Bezeichnung geliefert wird.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/CalendarHolidayBadge.tsx` | geändert | Compact-Abkürzung entfernt und ausgeschriebenes Label verwendet |
| `apps/web/src/components/calendar/MonthCalendar.tsx` | geändert | Monatskalender nutzt ausgeschriebenes Feiertagslabel |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | geändert | Test prüft ausgeschriebenes Monatskalender-Feiertagslabel |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
