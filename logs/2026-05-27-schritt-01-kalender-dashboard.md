# Log: Kalender-Dashboard und WeekEventTile-Design

**Datum:** 27.05.26  
**Schritt:** 1 — Kalender-Dashboard und WeekEventTile-Design  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Kalenderkacheln wurden visuell an die Aufgabendatei angepasst: farbiger 4-px-Linksrand, 10-%-Tint per `color-mix`, entfernte Dot-Farbe, korrekte semantische Fallbackfarben und Avatar für Aufgaben-Assignees. Die Kontextauflösung berücksichtigt Aufgaben, Meilensteine und neutrale Standardfarben so, dass Aufgaben orange und Meilensteine violett erscheinen, solange keine echte Nutzerfarbe gesetzt wurde. Zusätzlich wurde der neue Dashboard-Kontext `calendar` in Shared Types, API-Service, Widget-Registry und Frontend-Rendering ergänzt. Die Kalenderseite nutzt jetzt einen `CalendarDashboardProvider` und rendert `/calendar` als anpassbares Dashboard mit voll interaktivem Wochenkalender. Testleitplanken wurden angewendet: Unit-Tests prüfen DTO-/Rendering-Logik, API-Integration prüft den neuen Dashboard-Kontext, Browser/E2E prüft echte Kalenderflüsse mit isolierten Testdaten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/WeekEventTile.tsx` | geändert | Kachel mit Akzentrand, Tint und Assignee-Avatar |
| `apps/web/src/components/calendar/WeekCalendar.tsx` | geändert | Kontextfarben, Aufgaben-Assignee und neutrale Defaultfarben |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Delete-Aktion über Berechtigung steuerbar |
| `apps/web/src/components/calendar/CalendarDashboardProvider.tsx` | neu | Zentrale Kalenderdaten, Mutationen, Deep-Link und EventForm für Dashboard-Kontext |
| `apps/web/src/pages/CalendarPage.tsx` | geändert | Kalenderseite als Dashboard-Seite mit Hero und Kalender-Provider |
| `apps/web/src/components/dashboard/DashboardGrid.tsx` | geändert | Dashboard-Kontext an Widgetkarten weitergegeben |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | Interaktives Kalender-Widget im Kalender-Kontext ergänzt |
| `apps/web/src/components/dashboard/widgetRegistry.tsx` | geändert | Label für Kalender-Kontext ergänzt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Kalender-Navigation berücksichtigt Events- und Dashboard-Leserecht |
| `packages/shared-types/src/index.ts` | geändert | `calendar` als Dashboard-Kontext, erlaubte Widgets und Default-Layout ergänzt |
| `apps/api/src/db/schema.ts` | geändert | Dashboard-Kontext-Enum um `calendar` ergänzt |
| `apps/api/src/services/dashboard.service.ts` | geändert | Systemtemplate und Validierung für Kalender-Dashboard ergänzt |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | geändert | Kontextfarben, Assignee und Tile-Rendering abgesichert |
| `tests/unit/web/components/dashboard/DashboardBuilder.test.tsx` | geändert | Kalender-Dashboard-Defaultlayout abgesichert |
| `tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` | geändert | Interaktives Kalender-Widget im Kalender-Kontext abgesichert |
| `tests/integration/api/dashboard.test.ts` | geändert | Kalender-Dashboard-Kontext und Widget-Katalog abgesichert |
| `tests/browser/web/calendar.spec.ts` | geändert | Kalender-Dashboard und Task-Avatar/-Farbe im E2E abgesichert |
| `tests/browser/web/domain-test-utils.ts` | geändert | E2E-Task-Fixture um Assignee erweitert |

## Probleme und Abweichungen

Der vollständige Testlauf ist nicht grün. `npm run test -w apps/api` lief vollständig durch, bleibt aber mit 9 bestehenden Fehlern in Auth-, Dump- und Notification-Tests rot. `npm run test -w apps/web` lief vollständig durch, bleibt aber mit 3 bestehenden Fehlern rot: Sidebar-Placeholder-Erwartung und Invalidation-Erwartung zu `eventsList`. `npm run e2e -w apps/web` lief vollständig durch; alle 6 Kalender-Tests sind grün, der Vollauf bleibt mit 5 nicht kalenderbezogenen Browser-Fehlern rot: Dashboard-Speichern, Feature-Projekte-Tab, Projekt-Feature-Relation, Neben-Collections und Feature-Detail-Rücksprung. Während der Vorbereitung mussten die lokalen Node-Abhängigkeiten mit `npm ci --ignore-scripts` und `npm rebuild better-sqlite3` wieder lauffähig gemacht werden, nachdem `npm ci` am `esbuild`-Postinstall scheiterte.

## Offene Punkte / Folgeaufgaben

Die bestehenden roten API-, Web- und Browser-Tests müssen in separaten Folgeaufträgen bewertet und behoben werden. Der Kalender-spezifische Fokus ist abgesichert durch `npm run typecheck -w apps/web`, die gezielten Web-Unit-Tests und `npm run e2e -w apps/web -- tests/browser/web/calendar.spec.ts`.
