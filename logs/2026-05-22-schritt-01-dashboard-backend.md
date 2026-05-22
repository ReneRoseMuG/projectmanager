# Log: Dashboard Backend

**Datum:** 22.05.26  
**Schritt:** 1 — Dashboard Backend, Schema und Widgetdaten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Dashboard-Domäne wurde im Backend mit versionierten Tabellen für Dashboards, Widgets und Default-Zuordnungen umgesetzt. Es gibt Repository-, Service- und Route-Schichten für Listen, Detailabruf, Erstellen, Aktualisieren, Löschen und Default-Setzung. System-Standarddashboards werden lazy je Kontext erzeugt und lösen das Leser-Problem über globale Defaults ohne Editorzugriff. Zusätzlich wurden Widgetdaten-Endpunkte für Aufgaben, Tickets, Kommentare, Dateien, Journal- und Meilensteinübersichten ergänzt und in Rollen-/Permission-Logik, Dumps und Test-Fixtures aufgenommen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Dashboard-Typen, Widget-IDs, Defaults und Permission-Ressource ergänzt |
| `apps/api/src/db/schema.ts` | geändert | Tabellen `dashboards`, `dashboard_widgets`, `dashboard_defaults` ergänzt |
| `apps/api/src/db/migrations/0028_dashboard_builder.sql` | neu | Migration für Dashboard-Tabellen und Indizes |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration `0028_dashboard_builder` registriert |
| `apps/api/src/repositories/dashboard.repository.ts` | neu | Persistenzzugriffe für Dashboards, Widgets und Defaults |
| `apps/api/src/services/dashboard.service.ts` | neu | Businesslogik, Standarddashboard-Erzeugung, Rechte und Validierung |
| `apps/api/src/routes/dashboard.ts` | neu | Dashboard-API-Routen mit Schemas |
| `apps/api/src/routes/tasks.ts` | geändert | Widget-Endpunkte für Aufgabenstatistiken, aktuelle und überfällige Aufgaben |
| `apps/api/src/routes/tickets.ts` | geändert | Widget-Endpunkte für Ticketstatistiken und aktuelle Tickets |
| `apps/api/src/routes/comments.ts` | geändert | Recent-Comments-Endpunkt für Dashboard-Widgets |
| `apps/api/src/routes/attachments.ts` | geändert | Recent-Attachments-Endpunkt für Dashboard-Widgets |
| `apps/api/src/services/tasks.service.ts` | geändert | Aufgabenstatistiken und Dashboard-Tasklisten |
| `apps/api/src/services/tickets.service.ts` | geändert | Ticketstatistiken und Dashboard-Ticketlisten |
| `apps/api/src/services/comments.service.ts` | geändert | Kontextbezogene Kommentar-Aktivität |
| `apps/api/src/services/attachments.service.ts` | geändert | Kontextbezogene Datei-Aktivität |
| `apps/api/src/app.ts` | geändert | Dashboard-Routen registriert |
| `apps/api/src/plugins/auth.ts` | geändert | Dashboard-Ressource in Auth-Mapping aufgenommen |
| `apps/api/src/services/dump.service.ts` | geändert | Dashboard-Tabellen in Dump-Reihenfolge aufgenommen |
| `tests/fixtures/api/db.ts` | geändert | Dashboard-Tabellen in Test-Truncate aufgenommen |
| `tests/fixtures/api/app.ts` | geändert | Dashboard-Routen in Test-App registriert |

## Probleme und Abweichungen

`npm run db:generate -w apps/api` war wegen des vorhandenen Drizzle-Kit-Skriptformats nicht ausführbar. Die Migration wurde daher manuell als SQL-Datei ergänzt und anschließend über `npm run db:migrate -w apps/api` erfolgreich durch den regulären Migrator geprüft.

## Offene Punkte / Folgeaufgaben

Keine.
