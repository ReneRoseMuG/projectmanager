# Log: MS-32 Zentrale Kalenderkomponente

**Datum:** 31.05.26  
**Uhrzeit:** 04:58:23  
**Schritt:** Feature — MS-32 Zentrale Kalenderkomponente  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Kalender rendert im Dashboard-System jetzt über eine zentrale `CalendarWidgetView`, die intern zwischen Wochen- und Monatsansicht umschaltet. Die Seite „Kalender“ bleibt ein Dashboard-Host; `DashboardWidgetCard` nutzt für `widgetId === "calendar"` nun denselben zentralen Kalenderpfad für interaktive und kompakte/read-only Kontexte. Der alte produktive FullCalendar-Pfad wurde entfernt: `CalendarView.tsx`, FullCalendar-Styles und FullCalendar-Dependencies sind nicht mehr referenziert. Die Monatsansicht zeigt jetzt neben fälligen Aufgaben auch Termine nach Startdatum, damit beim Entfernen der alten Monatsansicht keine Termindarstellung verloren geht. Feiertagsmarker nutzen die vorhandene clientseitige Feiertagsquelle und wurden auf Projekt-Manager-Tokens mit `crimson`, `steel`, `shell`, `line`, `ink` und `white` statt MuGPlan-Raw-Farben umgestellt.

Testleitplanken wurden angewendet. Testebene: Web-Unit/Component mit jsdom. Bewiesenes Verhalten: zentrale Kalenderkomponente schaltet Woche/Monat ohne Datenverlust, read-only blendet Create-Aktionen aus, Monatskalender rendert Termine, Dashboard-Widget nutzt den zentralen Kalenderpfad und filtert DayPlan-Termine strikt. Es wurden keine DB-, API- oder Dateisystemdaten verwendet; Kalender- und Dashboard-Imports werden in den betroffenen Unit-Tests nur dort gemockt, wo die Widget-Verdrahtung selbst Gegenstand des Tests ist.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/CalendarWidgetView.tsx` | neu | Zentrale Kalender-Widget-Komponente mit Woche/Monat, Workspace-Hülle und einheitlichen Props |
| `apps/web/src/components/calendar/WeekCalendar.tsx` | geändert | Kontrollierte Datumssteuerung, eingebetteter Modus und tokenkonforme Feiertagsflächen ergänzt |
| `apps/web/src/components/calendar/MonthCalendar.tsx` | geändert | Kontrollierte Datumssteuerung, KW-Spalte, Terminbalken und Create-Trigger je Tag ergänzt |
| `apps/web/src/components/calendar/CalendarHolidayBadge.tsx` | geändert | Feiertagslabel auf `crimson`/Token-Stil und kompakte Anzeige umgestellt |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | Kalender-Widget auf zentrale Komponente umgestellt; alter `CalendarView`-Pfad entfernt |
| `apps/web/src/components/calendar/CalendarView.tsx` | gelöscht | Alter FullCalendar-Renderer entfernt |
| `apps/web/src/styles.css` | geändert | FullCalendar-spezifische globale Styles entfernt |
| `apps/web/package.json` | geändert | FullCalendar-Abhängigkeiten entfernt |
| `package-lock.json` | geändert | FullCalendar- und Preact-Pakete aus Lockfile entfernt |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | geändert | Zentrale Kalenderkomponente und Monats-Termine abgesichert |
| `tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` | geändert | Dashboard-Kalenderpfad auf zentrale Komponente und DayPlan-Filter geprüft |

## Probleme und Abweichungen

Der fokussierte Testlauf ist grün: `npm run test -w apps/web -- tests/unit/web/components/calendar/WeekCalendar.test.tsx tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` mit 31 bestandenen Tests in 2 Dateien.

`npm run typecheck -w apps/web` ist blockiert durch bestehende Fehler außerhalb des Kalender-Scopes in `src/hooks/useStatusCascadeWorkflow.tsx` (`Promise<Milestone|Task|Ticket>` wird an `Promise<void>`-Erwartungen übergeben). Diese Datei wurde in diesem Auftrag nicht verändert.

Der vollständige Web-Testlauf `npm run test -w apps/web` ist nicht grün: 572 Tests bestanden, 16 Tests fehlgeschlagen, 13 Testdateien fehlgeschlagen. Die Fehler liegen in bestehenden Bereichen außerhalb dieses Kalenderauftrags: `FormSidebar`, `WikiTree`, `ActionMenu`, `ListBoardView`, mehrere Formular-/Sidebar-Tests, `Section` und `atoms`. Gemäß Testregel wurden diese Fremdfehler nicht während des Kalenderauftrags repariert.

## Offene Punkte / Folgeaufgaben

Die bestehenden Typecheck- und Web-Testfehler außerhalb des Kalender-Scopes müssen in separaten Folgeaufträgen bereinigt werden. Eine Browser-/E2E-Abnahme wurde nicht ergänzt, weil der Auftrag auf Web-Unit/Component-Tests geplant war und die bestehenden Fremdfehler bereits die vollständige Web-Abnahme blockieren.
