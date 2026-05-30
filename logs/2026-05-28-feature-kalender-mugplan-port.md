# Log: Kalender MuGPlan Port

**Datum:** 28.05.26  
**Schritt:** Feature — Kalender-Übernahme aus MuGPlan  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Kalender wurde um Task-orientierte Wochen- und Monatsdarstellungen im Design-System des Projekt Managers erweitert. Die Wochenansicht nutzt jetzt Dreizonenkacheln für fällige Tasks, sortiert Tasks nach Statuspriorität und zeigt Feiertags-Badges in den Tagesköpfen. Die Kalenderseite bietet im Kalender-Dashboard-Kontext eine Umschaltung zwischen Woche und Monat; Task-Klicks öffnen die Task-Detailseite mit Rücksprung zur Kalenderseite. Task-Drag-and-drop speichert geänderte `dueDate`-Werte über die bestehende Task-Update-API mit `expectedVersion` und zentraler Query-Invalidierung. Zusätzlich wurde `date-holidays` als direkte Web-Dependency ergänzt und ein clientseitiger Feiertagslookup für nationale deutsche Feiertage eingebaut.

Die Testentwurfsleitplanken wurden angewendet. Betroffene Testebenen sind Web-Unit/Component-Tests mit echten DTOs ohne DB/FS sowie Browser/E2E mit echter UI/API in isolierter Playwright-Testumgebung. Bewiesen werden sollten Statusfarbe, Feiertagslookup, Task-Sortierung, Monatszuordnung, Task-Detailnavigation und persistentes Task-DnD.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/WeekTaskTile.tsx` | neu | Dreizonenkachel für fällige Tasks im Wochenkalender |
| `apps/web/src/components/calendar/MonthCalendar.tsx` | neu | Monatsansicht mit Tageszellen, Task-Balken und Task-DnD |
| `apps/web/src/components/calendar/MonthTaskBar.tsx` | neu | Kompakter Monatsbalken für Tasks |
| `apps/web/src/components/calendar/CalendarHolidayBadge.tsx` | neu | Feiertags-Badge auf Basis des deutschen Feiertagslookups |
| `apps/web/src/lib/task-status-color.ts` | neu | Statusfarbe aus PM-Design-Tokens |
| `apps/web/src/lib/german-holidays.ts` | neu | Clientseitiger Feiertagslookup mit `date-holidays` |
| `apps/web/src/lib/task-calendar.ts` | neu | Kalender-Sortierung für Tasks |
| `apps/web/src/components/calendar/WeekCalendar.tsx` | geändert | Task-Kachel, Sortierung, Feiertags-Badge und Task-DnD ergänzt |
| `apps/web/src/components/calendar/CalendarDashboardProvider.tsx` | geändert | Task-Rechte, Task-Laden und `moveTask` ergänzt |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | Woche/Monat-Umschaltung im Kalender-Kontext verdrahtet |
| `apps/web/src/hooks/useCalendarTasks.ts` | geändert | Task-Update-Mutation mit zentraler Invalidierung ergänzt |
| `apps/web/package.json`, `package-lock.json` | geändert | `date-holidays` als direkte Web-Dependency ergänzt |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | geändert | Unit-/Component-Abdeckung für neue Kalenderlogik ergänzt |
| `tests/browser/web/calendar.spec.ts`, `tests/browser/web/domain-test-utils.ts` | geändert | Browser-Szenario für Task-Anzeige, Monatsumschaltung, Detailnavigation und DnD ergänzt |

## Probleme und Abweichungen

Der vollständige Web-Testlauf ist nicht grün: `npm run test -w apps/web` scheitert in `FeatureForm.test.tsx` bei der Erwartung `data-image-upload="disabled"`, erhält aber `enabled`. Dieser Fehler liegt außerhalb des Kalender-Scopes und wurde gemäß Regel gegen spekulative Regression-Fixes nicht verändert.

Der repo-weite Web-Lint ist nicht grün: `npm run lint -w apps/web` scheitert in `apps/web/src/hooks/useStatusCascadeWorkflow.tsx` an `_statusSortOrder` als ungenutzter Variable. Dieser Befund liegt außerhalb des Kalender-Scopes und wurde nicht verändert.

Der vollständige E2E-Lauf hat zuerst nach fünf Minuten ohne verwertbare Zusammenfassung getimeoutet. Der gezielte Lauf `npm run e2e -w apps/web -- calendar.spec.ts` startet, aber alle Kalender-Tests laufen in den 30-Sekunden-Testtimeout, weil der bestehende `authenticatedGoto`-Helper auf der Login-Seite hängen bleibt; der Snapshot zeigt nur den Ein-Klick-Login-Button „Als Rene anmelden“ statt der erwarteten E-Mail/Passwort-Felder. Dieser Auth-Testhelper-Drift blockiert die Browser-Abnahme und wurde nicht im Kalenderauftrag repariert.

## Offene Punkte / Folgeaufgaben

- Bestehenden `FeatureForm`-Unit-Test oder zugehörige Upload-Logik separat klären.
- Repo-weiten Lint-Fehler in `useStatusCascadeWorkflow.tsx` separat beheben.
- Browser-Testauthentifizierung an den aktuellen Ein-Klick-Login anpassen und danach `calendar.spec.ts` erneut laufen lassen.
- Nach Behebung der Blocker den vollständigen Web-Testlauf, Web-Lint und E2E-Lauf erneut ausführen.
