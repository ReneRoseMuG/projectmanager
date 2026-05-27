# Log: MS-20 Tests und Abnahme

**Datum:** 27.05.26  
**Schritt:** 3 — MS-20 Tests und Abnahme  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Testentwurfs-Skill `projekt-manager-test-entwurfsleitplanken` wurde angewendet. Testebenen waren API-Integration, Web-Unit und Browser/E2E; bewiesen werden sollten Tagesplan-Berechtigungen, Versionierung, echte DB-Relationen, Wochenkalender-Datumslogik, Event-Owner-Erhalt und sichtbare Kalender-Hauptflows. Neue API-Integrationstests decken authentifizierten Zugriff, Reader-Write-Forbidden, Datumvalidierung, Versionskonflikte, Aufgaben-Verknüpfungen und Event-Verknüpfungen mit echten SQLite-Testdaten ab. Web-Unit-Tests sichern die Wochenkalender-Hilfslogik und den Erhalt unsichtbarer DayPlan-Owner in EventForm. Die lokale API-Migration, API-Build, Web-Typecheck und Web-Build wurden erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/integration/api/day-plans.test.ts` | neu | Integrationstests für Tagesplan-API, Permissions und Relationen |
| `tests/integration/api/dumps-local.test.ts` | geändert | Dump-Testdaten um DayPlan-Tabellen ergänzt |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | neu | Unit-Tests für Wochenkalender-Logik |
| `tests/unit/web/components/calendar/EventForm.test.tsx` | geändert | Test für erhaltene DayPlan-Owner ergänzt |
| `tests/unit/web/components/calendar/CalendarView.test.tsx` | gelöscht | Veralteter FullCalendar-Test durch WeekCalendar-Test ersetzt |

## Probleme und Abweichungen

`npm run test -w apps/api -- tests/integration/api/day-plans.test.ts` war grün: 5 Tests bestanden.  
`npm run test -w apps/web -- tests/unit/web/components/calendar/WeekCalendar.test.tsx tests/unit/web/components/calendar/EventForm.test.tsx` war grün: 7 Tests bestanden.  
`npm run test -w apps/api -- tests/integration/api/day-plans.test.ts tests/integration/api/dumps-local.test.ts` hatte 25 grüne und 3 rote Tests; die roten Fälle betreffen bestehende Dump-Roundtrip-Erwartungen zur Standardadmin-Behandlung (`admin@local` wird exportiert, Admin-Referenzen werden nicht neutralisiert, lokaler Standardadmin wird beim Import überschrieben). Der DayPlan-Test und der Dump-Tabellenvertrag waren in diesem Lauf grün.  
`npm run e2e -w apps/web -- calendar.spec.ts` hatte 5 grüne und 1 roten Test. Der rote Deep-Link-Test scheitert an einem Testfehler: `form.getByDisplayValue` ist kein Playwright-Locator-API.

## Offene Punkte / Folgeaufgaben

Die bestehenden Dump-Roundtrip-Fehler zur Standardadmin-Behandlung müssen in einem separaten Folgeauftrag bewertet werden. Der Kalender-Deep-Link-E2E-Test braucht eine Testkorrektur auf eine gültige Playwright-Abfrage.

## Testleitplanken

Angewendet wurden echte Fastify-App- und SQLite-Integrationstests mit isolierter Testdatenbank sowie Web-Unit-Tests ohne DB/Dateisystem. Browser/E2E lief über isolierte Playwright-Testserver. Mocks wurden nur in bestehenden Web-Unit-Testgrenzen verwendet; API-Tests nutzen echte Auth-, Rollen-, Service- und Repository-Pfade.
