# Log: TASK-49 App-Startseite

**Datum:** 24.05.26  
**Schritt:** Feature — TASK-49 App-Startseite  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die App hat nun eine echte Startseite unter `/` statt des bisherigen Redirects auf `/projects`. Dafür wurde der Dashboard-Kontext `home` in Shared Types, API-Schema, Dashboard-Service und Frontend-Registry ergänzt; beim ersten Dashboard-Aufruf wird ein System-Dashboard `Standard: Startseite` angelegt. Im Frontend rendert die neue `StartPage` ein Home-Dashboard und eine kompakte, read-only Kalender-Vorschau mit Permission-Gating für Dashboards, Events und Aufgaben. Die Sidebar enthält `Startseite` als ersten Eintrag mit exaktem Root-Aktivzustand, und `/dashboard` kann zwischen globalem Dashboard und Startseiten-Dashboard umschalten. Login- und Passwort-Setup-Redirects führen nun auf `/`.

Bei Tests wurden die Testentwurfsleitplanken angewendet. Abgedeckte Testebenen: API-Integration mit echter Temp-SQLite, Web-Unit/jsdom mit Komponenten- und Hook-Doubles sowie Browser/E2E mit echter App/API als geplante Abnahme. Bewiesen werden sollten der neue `home`-Kontext, das Root-Routing, die Sidebar-/Editor-Umschaltung und Permission-Gating.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Dashboard-Kontext `home`, erlaubte Widgets und Default-Layout ergänzt |
| `apps/api/src/db/schema.ts` | geändert | lokale Dashboard-Kontextliste um `home` erweitert |
| `apps/api/src/services/dashboard.service.ts` | geändert | Home-Systemdashboard und Service-Validierung ergänzt |
| `apps/web/src/pages/StartPage.tsx` | neu | Startseite mit PageHero, HomeDashboard und Kalender-Vorschau |
| `apps/web/src/App.tsx` | geändert | Root-Route, Redirects und Full-Bleed-Erkennung angepasst |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Startseiten-Navigation und exakter Root-Aktivzustand ergänzt |
| `apps/web/src/pages/DashboardPage.tsx` | geändert | Kontext-Umschaltung zwischen Dashboard und Startseite ergänzt |
| `apps/web/src/components/dashboard/DashboardView.tsx` | geändert | `HomeDashboard`-Export und headerloser GlobalDashboard-Einsatz ergänzt |
| `apps/web/src/components/dashboard/widgetRegistry.tsx` | geändert | Label für `home` ergänzt |
| `apps/web/src/components/calendar/CalendarView.tsx` | geändert | kompakter read-only Modus und optionale Handler ergänzt |
| `apps/web/src/components/calendar/UpcomingEvents.tsx` | geändert | optionales Öffnen für read-only Vorschau ergänzt |
| `apps/web/src/hooks/useEvents.ts` | geändert | optionales Query-`enabled` ergänzt |
| `apps/web/src/hooks/useCalendarTasks.ts` | geändert | optionales Query-`enabled` ergänzt |
| `apps/web/src/pages/LoginPage.tsx` | geändert | Default-Login-Ziel auf `/` angepasst |
| `apps/web/src/pages/SetupPasswordPage.tsx` | geändert | Ziel nach Passwort-Setup auf `/` angepasst |
| `tests/integration/api/dashboard.test.ts` | geändert | Integrationstest für Home-Dashboard-Kontext ergänzt |
| `tests/unit/web/components/layout/Sidebar.test.tsx` | geändert | Sidebar-Root-Link, Standalone-URL und Permission-Gating ergänzt |
| `tests/unit/web/pages/DashboardPage.test.tsx` | neu | Dashboard-Editor-Umschaltung getestet |
| `tests/unit/web/pages/StartPage.test.tsx` | neu | Startseiten-Rendering und Permission-Gating getestet |
| `tests/browser/web/domain-test-utils.ts` | geändert | Login-Erwartung auf neue Startseite angepasst |
| `tests/browser/web/start-page.spec.ts` | neu | E2E-Abnahme für Startseite und Home-Dashboard-Speichern ergänzt |

## Probleme und Abweichungen

Die TASK-49-spezifische API-Suite `dashboard.test.ts` ist grün. Der vollständige API-Testlauf ist jedoch nicht grün, weil ein bestehender Remote-SFTP-Dump-Test außerhalb von TASK-49 fehlschlägt: `remoteUpload.success` war `false` in `tests/integration/api/dumps-local.test.ts`. Der Browser-/E2E-Lauf konnte nicht starten, weil der Playwright-API-WebServer beim API-Build blockiert: `backup-sftp.service.ts` hat einen `BackupSftpClient.delete`-Typkonflikt, und `dump.service.ts` importiert fehlende `DumpIncrementalSync*` Shared Types. Diese Dump/SFTP- und Attachment-Watcher-Änderungen liegen im Arbeitsbaum, wurden für TASK-49 nicht bearbeitet und nicht korrigiert.

Ausgeführte Verifikation:

- `npm run build -w packages/shared-types` — grün.
- `npm run typecheck -w apps/api` — nach Shared-Types-Build grün.
- `npm run typecheck -w apps/web` — grün.
- `npm run test -w apps/api` — 372 grün, 1 rot, 0 übersprungen; roter Test außerhalb TASK-49 im Remote-SFTP-Dump-Bereich.
- `npm run test -w apps/web` — 443 grün, 0 rot, 0 übersprungen.
- `npm run e2e -w apps/web` — blockiert, 0 Browser-Tests ausgeführt; API-WebServer-Build exit 2.
- `npm run build -w apps/api` — rot; bestätigt den E2E-Blocker durch Dump/SFTP-Typfehler außerhalb von TASK-49.
- `npm run test -w apps/api -- ../../tests/integration/api/dashboard.test.ts` — 4 grün, 0 rot.

## Offene Punkte / Folgeaufgaben

- Dump/SFTP-Buildfehler und den Remote-SFTP-Dump-Test separat klären.
- Browser-/E2E-Abnahme für `tests/browser/web/start-page.spec.ts` erneut ausführen, sobald der API-WebServer wieder startet.
