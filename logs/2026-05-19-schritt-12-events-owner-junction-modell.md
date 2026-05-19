# Log: Events Owner-Junction-Modell

**Datum:** 19.05.26  
**Schritt:** 12 — Events Owner-Junction-Modell  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Calendar-Events wurden vom direkten Owner-FK-Modell auf ownerbasierte Junction-Tabellen umgestellt. Die Basistabelle `events` enthält jetzt `version`, `created_by`, `updated_by`, `created_at` und `updated_at`, aber keine `project_id`-/`task_id`-Spalten mehr. Bestehende Event-Bezüge werden in `project_events` und `task_events` migriert; globale Events ohne Owner bleiben erlaubt. API und Shared Types liefern für Events nun `owners: [...]`, und Event-Updates verlangen `expectedVersion`. Web-Formular, Kalenderdarstellung, Seed-Daten, Dump-Registries sowie API-, Komponenten- und E2E-Tests wurden auf das neue Modell angepasst.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | `events` bereinigt, `project_events` und `task_events` ergänzt |
| `apps/api/src/db/migrations/0017_steep_gambit.sql` | neu | Event-Junction-Tabellen, Pflichtfelder und Backfill |
| `apps/api/src/db/migrations/0018_eager_riptide.sql` | neu | SQLite-Rebuild von `events` ohne Legacy-Spalten |
| `apps/api/src/routes/events.ts` | geändert | Event-Payloads auf `owners` und `expectedVersion` umgestellt |
| `apps/api/src/services/events.service.ts` | geändert | Owner-Junction-Logik, Mapping und versionierte Updates |
| `apps/api/src/services/dump.service.ts` | geändert | neue Event-Junction-Tabellen registriert |
| `apps/api/src/services/seed-data.service.ts` | geändert | Seed-Events und Cleanup auf Junctions umgestellt |
| `packages/shared-types/src/index.ts` | geändert | `EventOwner`, `Event.owners`, versionierter `EventUpdate` |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Mehrfachauswahl für Projekt- und Task-Owner |
| `apps/web/src/components/calendar/CalendarView.tsx` | geändert | Farblogik liest Owner statt direkter Event-Felder |
| `apps/web/src/pages/CalendarPage.tsx` | geändert | Event-Updates senden `expectedVersion` |
| `apps/api/tests/integration/events.test.ts` | geändert | Owner-Junction-, Versionierungs- und Cascade-Fälle ergänzt |
| `apps/web/src/components/calendar/__tests__/EventForm.test.tsx` | neu | Formular-Payload und Vorauswahl für Owner getestet |
| `apps/web/src/components/calendar/__tests__/CalendarView.test.tsx` | neu | Kalenderdarstellung ohne Legacy-Felder getestet |
| `apps/web/e2e/calendar.spec.ts` | neu | globale, ownerbasierte, Multi-Owner- und Delete-Flows getestet |
| `apps/web/e2e/domain-test-utils.ts` | geändert | Event-Fixtures für E2E ergänzt |
| `agents.md` | geändert | Calendar-Architektur auf Event-Junctions aktualisiert |

## Probleme und Abweichungen

Die erste Migration schlug zunächst fehl, weil Drizzle einen automatisch generierten SQLite-Kommentar als leeres Statement ausgeführt hat. Der Kommentar wurde aus der Migration entfernt; anschließend lief `npm run db:migrate -w apps/api` erfolgreich. Der erste Web-Testlauf hatte einen Fehler im neuen EventForm-Test, weil `FormModal` per Portal außerhalb des Render-Containers liegt; der Test wurde auf `document` korrigiert. Der erste E2E-Lauf hatte einen Fehler im neuen Calendar-Spec-Helper, weil ein Locator versehentlich als Promise zurückgegeben wurde; nach Korrektur war der vollständige E2E-Lauf grün.

## Offene Punkte / Folgeaufgaben

Keine. Neue Event-Träger wie Tickets, Features, Use Cases, Backlog-Items oder Wiki-Seiten wurden bewusst nicht ergänzt und bleiben eine separate fachliche Entscheidung.
