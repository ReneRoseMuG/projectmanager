# Log: Persönliche Planung Dashboard

**Datum:** 31.05.26  
**Uhrzeit:** 02:49:12  
**Schritt:** 1 — Persönliche Planung Dashboard-Refaktoring  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die persönliche Planung wurde um den Tab `Kalender` direkt neben der Übersicht erweitert; dieser Tab rendert den neuen Dashboard-Kontext `dayPlanCalendar` mit DayPlan-Owner. Der Aufgaben-Tab nutzt jetzt die etablierte `TaskListBoardView` mit Board/List-Umschaltung und öffnet neue Aufgaben über `TaskForm`; der bisherige Verknüpfen-Button wird dort nicht mehr angeboten. Die DayPlan-Übersicht nutzt im Widget-Header für Aufgaben, Notizen, Kommentare und nächste Termine einen einheitlichen Action-Bereich mit Icon-Only-Plusbutton und öffnet die bestehenden Create-Dialoge. Kalender- und Nächste-Termine-Widgets filtern im DayPlan-Kontext strikt auf Termine mit Owner `{ type: "dayPlan", id }`. Shared Types, API-Dashboard-Kontext, Systemtemplates und Widget-Katalog wurden um `dayPlanCalendar` erweitert; für `dayPlan` ist das Kalenderwidget als auswählbares Widget erlaubt.

Testleitplanken wurden angewendet: API-Integration nutzt die bestehende isolierte Test-App/Test-DB des Dashboard-Tests; Web-Unit-Tests prüfen echte Seiten-/Widget-Verdrahtung mit gemockten Datenhooks und jsdom-Isolation. Browser/E2E wurde nicht ergänzt, weil keine bestehende DayPlan-Browser-Testbasis gefunden wurde.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Dashboard-Kontext, erlaubte Widgets und Default-Layout für `dayPlanCalendar` ergänzt |
| `apps/api/src/db/schema.ts` | geändert | Dashboard-Kontextliste um `dayPlanCalendar` erweitert |
| `apps/api/src/services/dashboard.service.ts` | geändert | Systemtemplate für das DayPlan-Kalenderdashboard ergänzt |
| `apps/web/src/components/dashboard/widgetRegistry.tsx` | geändert | Label für `dayPlanCalendar` ergänzt |
| `apps/web/src/components/dashboard/DashboardView.tsx` | geändert | DayPlan-Datum an das Grid weitergereicht |
| `apps/web/src/components/dashboard/DashboardGrid.tsx` | geändert | DayPlan-Datum an Widgetkarten weitergereicht |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | DayPlan-Header-Aktionen und strikte DayPlan-Kalenderfilterung ergänzt |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Löschbarkeit als Prop steuerbar gemacht |
| `apps/web/src/pages/DayPlanPage.tsx` | geändert | Kalender-Tab ergänzt und Aufgaben-Tab auf `TaskListBoardView` umgestellt |
| `tests/integration/api/dashboard.test.ts` | geändert | API-Kontext- und Widget-Katalogtests für `dayPlanCalendar` ergänzt |
| `tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` | geändert | Widget-Aktionen und DayPlan-Kalenderfilter getestet |
| `tests/unit/web/pages/DayPlanPage.test.tsx` | neu | DayPlan-Tabs, Aufgabenansicht und Create-Flow getestet |
| `logs/2026-05-31-02-49-12-schritt-01-persönliche-planung-dashboard.md` | neu | Schritt-Log für diese Umsetzung |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Der vollständige API-Testlauf `npm run test -w apps/api` wurde zweimal durch das Tool-Timeout beendet, einmal nach 124 Sekunden und einmal nach 304 Sekunden, jeweils ohne verwertbare Vitest-Ausgabe. Der gezielte API-Test `npm run test -w apps/api -- ../../tests/integration/api/dashboard.test.ts` ist grün mit 7 bestandenen Tests.

Der vollständige Web-Testlauf `npm run test -w apps/web` lief durch, endete aber mit 15 fehlgeschlagenen Tests bei 568 bestandenen Tests in 92 Testdateien. Die Fehler liegen in bestehenden Bereichen außerhalb dieser Änderung: `ActionMenu`, mehrere Formular-/Sidebar-Tests, `FormSidebar`, `Section`, `WikiTree` und `ListBoardView`. Gemäß Testregel wurden diese Fehler nicht während dieses Auftrags gefixt. Die gezielten neuen/angepassten Web-Tests sind grün: `DashboardWidgets.test.tsx` mit 19 bestandenen Tests und `DayPlanPage.test.tsx` mit 2 bestandenen Tests.

## Offene Punkte / Folgeaufgaben

Die bestehenden Web-Testfehler sollten in einem separaten Folgeauftrag bewertet und behoben werden. Der vollständige API-Testlauf braucht eine separate Laufzeit-/Timeout-Analyse, weil der direkt betroffene Dashboard-Integrationstest stabil grün ist, der Gesamtlauf aber ohne Ausgabe hängen bleibt.
