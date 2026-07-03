# Log: Termin-Uhrzeit im Widget + zentrale Zeitformatierung

**Datum:** 03.07.26  
**Uhrzeit:** 06:32:32  
**Schritt:** Feature — Vereinheitlichung der Datums-/Zeitformatierung (apps/web)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Auslöser war, dass das Dashboard-Widget „Nächste Termine" keine Uhrzeit zeigte. Ursache war kein fehlendes Feld, sondern dass `formatHumanDate` nur `dd.MM.yy` liefert und die Zeitformatierung über mehrere Komponenten verstreut war (Inline-`format()` in WeekCalendar und JournalPanel, `toLocaleString` in der Admin-Sync-Seite). Statt eines Punktfixes wurde die menschenlesbare Zeitformatierung in `apps/web/src/utils/date.ts` zentralisiert: neu `formatHumanTime`, `formatHumanDateTime` und `formatEventTimeRange`. Letzteres kapselt die `isAllDay`-Regel („Ganztägig" vs. „HH:mm - HH:mm") an genau einer Stelle, damit keine Terminansicht die Unterscheidung neu erfindet. Alle fachlichen Terminanzeigen nutzen jetzt diese Quelle: das Widget „Nächste Termine" zeigt Datum + Zeitspanne, die Monatskachel eine dezente Startzeit, die Wochenansicht wurde auf die extrahierte Funktion umgestellt (Verhalten unverändert), und das Journal nutzt `formatHumanDateTime`. Die Konvention wurde als neuer Abschnitt 8.23 im Design-Leitfaden verankert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/utils/date.ts` | geändert | Neue zentrale Funktionen: formatHumanTime, formatHumanDateTime, formatEventTimeRange (isAllDay-Kapselung) |
| `apps/web/src/components/calendar/UpcomingEvents.tsx` | geändert | Widget zeigt Datum + Zeitspanne (Ganztägig / HH:mm - HH:mm) |
| `apps/web/src/components/calendar/WeekCalendar.tsx` | geändert | calendarTimeLabel nutzt zentrale formatEventTimeRange (Verhalten identisch) |
| `apps/web/src/components/calendar/MonthCalendar.tsx` | geändert | Dezente Startzeit vor dem Termin-Titel (kein Präfix bei ganztägig) |
| `apps/web/src/components/journal/JournalPanel.tsx` | geändert | Lokale formatDateTime durch formatHumanDateTime ersetzt, verwaisten date-fns-Import entfernt |
| `tests/unit/web/utils/date.test.ts` | neu | Unit-Tests für die zentralen Formatierer inkl. isAllDay + Leer-/Randfälle |
| `docs/design-leitfaden.md` | geändert | Neuer Abschnitt 8.23 „Datums- und Zeitdarstellung" |

## Probleme und Abweichungen

- Ursprüngliche Annahme korrigiert: Die Wochenansicht hatte **keinen** Ganztag-Bug — `calendarTimeLabel` behandelte `isAllDay` bereits korrekt. Die Logik wurde nur zentralisiert (extrahiert), nicht im Verhalten verändert.
- Bewusst lokal belassen (keine fachliche Terminanzeige): Kalender-Navigations-Header (Monat/Woche) und der sekundengenaue Admin-Sync-Zeitstempel (`AttachmentSyncPage`) — eine Zentralisierung auf Minutengenauigkeit würde dort Information verlieren. Im Leitfaden-Abschnitt 8.23 als Ausnahme dokumentiert.

## Offene Punkte / Folgeaufgaben

- Nutzer-Entscheidung offen (Rückfrage abgebrochen): ob die beiden bewusst lokal belassenen Stellen doch vereinheitlicht werden.
- Noch kein Commit. Im Arbeitsbaum liegen zusätzlich ältere Wiki-Änderungen aus einem anderen Strang.

## Testleitplanken

- Angewendet: `test-entwurfsleitplanken`. Testebene: Unit (reine Formatierungsfunktionen, keine Mocks, zeitzonenlose ISO-Eingaben für Determinismus).
- Verifikation: TypeScript-Typecheck grün, 24 betroffene Unit-Tests grün (inkl. neuer `date.test.ts`), ESLint der geänderten Dateien sauber, Graphify aktualisiert.
