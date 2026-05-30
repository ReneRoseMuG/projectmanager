# Log: MS-20 Day-Plans Backend

**Datum:** 27.05.26  
**Schritt:** 1 — MS-20 Day-Plans Backend  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die neue Domäne `dayPlans` wurde im gemeinsamen Typkatalog, im API-Schema, im Permission-Mapping und im Journal ergänzt. Für Tagespläne wurden die Tabellen `day_plans`, `day_plan_tasks` und `day_plan_events` samt Migration angelegt und lokal migriert. Die API bietet geschützte Endpunkte zum Lesen/Anlegen pro Datum, Aktualisieren mit `expectedVersion`, Erstellen/Verknüpfen/Lösen von Aufgaben sowie Erstellen/Verknüpfen/Lösen von Terminen. Events und Tasks berücksichtigen Tagesplan-Verknüpfungen in Owner- und Delete-Blocker-Logik. Der Dump-Service und die Test-Fixtures kennen die neuen Tabellen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | `dayPlans`, `dayPlan` und DayPlan-DTOs ergänzt |
| `apps/api/src/db/schema.ts` | geändert | Day-Plan-Tabellen und Junctions ergänzt |
| `apps/api/src/db/migrations/0031_day_plans.sql` | neu | Migration für Tagespläne, Aufgaben- und Event-Junctions |
| `apps/api/src/repositories/day-plan.repository.ts` | neu | Persistenzzugriffe für Tagespläne |
| `apps/api/src/services/day-plan.service.ts` | neu | Business-Logik, Versionierung, Journal und Verknüpfungen |
| `apps/api/src/routes/day-plans.ts` | neu | Fastify-Routen mit Schemas |
| `apps/api/src/app.ts` | geändert | Day-Plan-Routen registriert |
| `apps/api/src/plugins/auth.ts` | geändert | `/day-plans` auf Ressource `dayPlans` gemappt |
| `apps/api/src/services/events.service.ts` | geändert | DayPlan-Owner für Events unterstützt |
| `apps/api/src/routes/events.ts` | geändert | `dayPlan` als Event-Owner im Schema erlaubt |
| `apps/api/src/services/tasks.service.ts` | geändert | Delete-Blocker für Tagesplan-Aufgaben ergänzt |
| `apps/api/src/services/journal.service.ts` | geändert | Journal-Label für Tagespläne ergänzt |
| `apps/api/src/services/dump.service.ts` | geändert | Dump-Tabellenvertrag um Day-Plan-Tabellen erweitert |
| `tests/fixtures/api/app.ts` | geändert | Day-Plan-Routen in Test-App registriert |
| `tests/fixtures/api/db.ts` | geändert | Truncate-Liste um Day-Plan-Tabellen erweitert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
