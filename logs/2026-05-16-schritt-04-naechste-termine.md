# Log: Nächste Termine

**Datum:** 16.05.26  
**Schritt:** 4 — „Nächste Termine“-Liste unter dem Kalender  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Unter der Kalenderansicht wird nun eine kompakte Liste der nächsten Termine angezeigt. Die neue Komponente verwendet die bereits durch `useEvents()` geladenen Events, sortiert sie nach `startTime`, filtert vergangene Termine aus und zeigt maximal vier Einträge. Ein Klick auf einen Eintrag öffnet den bestehenden Termin-Dialog. Die Datumsanzeige nutzt `formatHumanDate` im Format `dd.MM.yy`. Nach der Änderung wurde der Web-Build erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/UpcomingEvents.tsx` | neu | Liste der nächsten vier Termine |
| `apps/web/src/pages/CalendarPage.tsx` | geändert | Upcoming-Events unter Kalender eingebunden |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
