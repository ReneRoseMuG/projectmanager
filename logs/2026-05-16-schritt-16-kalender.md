# Log: Kalender

**Datum:** 16.05.26  
**Schritt:** 16 — CalendarPage (FullCalendar, EventForm, Drag & Drop)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Kalenderseite wurde mit FullCalendar, deutscher Locale, Monats- und Wochenansicht umgesetzt. Termine werden aus der Events-API geladen, Aufgaben mit `dueDate` werden als ganztägige Kalenderereignisse ergänzt. Leere Tage öffnen ein Terminformular, vorhandene Termine können bearbeitet und gelöscht werden. Drag & Drop aktualisiert echte Termine über die API.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/CalendarPage.tsx` | neu | Kalenderseite |
| `apps/web/src/components/calendar/CalendarView.tsx` | neu | FullCalendar-Wrapper |
| `apps/web/src/components/calendar/EventForm.tsx` | neu | Terminformular |
| `apps/web/src/hooks/useEvents.ts` | neu | Termin-Datenlogik |
| `apps/web/src/hooks/useCalendarTasks.ts` | neu | Aufgaben für Kalender |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
