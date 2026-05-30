# Log: MS-20 Tagesplan und Wochenkalender UI

**Datum:** 27.05.26  
**Schritt:** 2 — MS-20 Tagesplan und Wochenkalender UI  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Web-App hat eine neue Tagesplan-Seite unter `/day-plan` erhalten, inklusive Datumsnavigation, Tagesstatus, Tagesnotizen, Aufgabenliste und Terminliste. Aufgaben und Termine können direkt für den gewählten Tag angelegt, aktualisiert oder aus dem Tagesplan gelöst werden. Die Kalenderseite nutzt statt der bisherigen FullCalendar-Monatsansicht eine eigene Wochenansicht mit kompakten Termin-Karten, Kontextfarben und Drag-and-drop-Verschiebung auf Tages-Spalten. Die globale Navigation, Routenberechtigung, Query-Keys und Invalidierung wurden um `dayPlans` erweitert. EventForm bewahrt unsichtbare DayPlan-Owner beim Bearbeiten, damit Tagesplan-Zuordnungen nicht versehentlich verloren gehen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/api/day-plans.ts` | neu | API-Funktionen für Tagespläne |
| `apps/web/src/hooks/useDayPlan.ts` | neu | TanStack-Query-Hook mit Mutations für Tagespläne |
| `apps/web/src/pages/DayPlanPage.tsx` | neu | Tagesplan-Arbeitsansicht |
| `apps/web/src/components/calendar/WeekCalendar.tsx` | neu | Wochenkalender mit DnD und Hilfsfunktionen |
| `apps/web/src/components/calendar/WeekEventTile.tsx` | neu | Kompakte Termin-Karte für die Wochenansicht |
| `apps/web/src/pages/CalendarPage.tsx` | geändert | Kalenderseite auf Wochenansicht umgestellt |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | DayPlan-Owner beim Speichern erhalten |
| `apps/web/src/App.tsx` | geändert | Route `/day-plan` und Full-Bleed-Erkennung ergänzt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Navigationseintrag Tagesplan ergänzt |
| `apps/web/src/components/journal/JournalPanel.tsx` | geändert | Journal-Label für DayPlan ergänzt |
| `apps/web/src/queries/queryKeys.ts` | geändert | Query-Keys für Tagespläne ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | DayPlan-Invalidierung in relevante Domänen eingebunden |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
