# Log: Settings-System

**Datum:** 21.05.26  
**Schritt:** 1 — Settings-System implementieren  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Das Settings-System wurde als Registry-first Feature umgesetzt. Die zentrale Registry und die zugehörigen Shared Types liegen im Shared-Package, damit API und Web keine Setting-Typen duplizieren. Die API persistiert Scope-Werte in `settings_values`, löst Settings serverseitig in der Reihenfolge `USER > ROLE > GLOBAL > DEFAULT` auf und erzwingt Validierung, Authentifizierung, Berechtigungen und Optimistic Locking über `expectedVersion`. Für Web wurden API-Funktionen, Query Keys, Invalidierung, ein SettingsProvider, Hooks und die Seite „Präferenzen“ ergänzt. Die Board-ViewModes für Tasks und Tickets verwenden nun Settings statt lokaler ViewMode-Persistenz. Dump, Restore-nahe Fixtures, `truncateAll` und die relevanten Tests wurden um `settings_values` erweitert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Settings-Typen, Registry und Permission-Resource ergänzt |
| `apps/api/src/db/schema.ts` | geändert | Tabelle `settings_values` mit Versionierung, Auditfeldern und Unique Constraint ergänzt |
| `apps/api/src/db/migrations/0023_settings_values.sql` | neu | Migration für `settings_values` angelegt |
| `apps/api/src/db/migrations/meta/0023_snapshot.json` | neu | Drizzle-Snapshot für Migration 0023 ergänzt |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration 0023 in den Journal-Index aufgenommen |
| `apps/api/src/repositories/settings.repository.ts` | neu | Persistenzzugriffe und Version-Checks für Settings ergänzt |
| `apps/api/src/services/settings.service.ts` | neu | Scope-Auflösung, Validierung und Berechtigungslogik ergänzt |
| `apps/api/src/routes/settings.ts` | neu | Settings-Endpunkte für Resolve, Set und Reset ergänzt |
| `apps/api/src/plugins/auth.ts` | geändert | Auth-Guard-Mapping für `/api/settings` ergänzt |
| `apps/api/src/app.ts` | geändert | Settings-Routen registriert |
| `apps/api/src/services/dump.service.ts` | geändert | Dump-Formatversion und Tabelle `settings_values` ergänzt |
| `tests/fixtures/api/app.ts` | geändert | Settings-Routen in der Test-App registriert |
| `tests/fixtures/api/db.ts` | geändert | `truncateAll` um `settings_values` ergänzt |
| `tests/integration/api/dumps-local.test.ts` | geändert | Dump-Roundtrip-Fixture um Settings-Wert ergänzt |
| `apps/web/src/api/settings.ts` | neu | Web-API-Funktionen für Settings ergänzt |
| `apps/web/src/providers/SettingsProvider.tsx` | neu | TanStack-Query-basierter Settings-Kontext ergänzt |
| `apps/web/src/hooks/useSettings.ts` | neu | `useSettings` und `useSetting` ergänzt |
| `apps/web/src/pages/SettingsPreferencesPage.tsx` | neu | Präferenzen-Seite mit USER- und Admin-GLOBAL-Controls ergänzt |
| `apps/web/src/App.tsx` | geändert | SettingsProvider und Route `/settings/preferences` eingebunden |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Navigationseintrag „Präferenzen“ ergänzt |
| `apps/web/src/hooks/useViewMode.ts` | geändert | ViewMode-Persistenz auf Settings umgestellt |
| `apps/web/src/pages/TicketsPage.tsx` | geändert | Ticket-Board-ViewMode an Settings-Key angebunden |
| `apps/web/src/components/tickets/OwnerTicketBoard.tsx` | geändert | Owner-Ticket-Board an Settings-Key angebunden |
| `apps/web/src/queries/queryKeys.ts` | geändert | Settings Query Keys ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | Settings-Invalidierung ergänzt |
| `tests/integration/api/settings.test.ts` | neu | API-Integrationstests für Settings ergänzt |
| `tests/unit/web/pages/SettingsPreferencesPage.test.tsx` | neu | Web-Unit-Tests für Präferenzen ergänzt |
| `tests/browser/web/settings.spec.ts` | neu | Browser-Test für persönliche ViewMode-Präferenz ergänzt |
| `tests/integration/web/queries/invalidation.integration.test.ts` | geändert | Settings-Invalidierung in Query-Tests ergänzt |

## Probleme und Abweichungen

`drizzle-kit generate` konnte wegen des bestehenden alten Migrationsordner-Formats keine neue Migration erzeugen. Die zwischenzeitliche automatische Formatkonvertierung wurde vollständig zurückgenommen; die Migration wurde stattdessen im vorhandenen Repo-Format manuell ergänzt und `npm run db:migrate -w apps/api` lief anschließend erfolgreich. Der erste E2E-Lauf hat einen Konfliktfall im SettingsProvider sichtbar gemacht, bei dem `expectedVersion` nach der optimistischen Cache-Aktualisierung berechnet wurde; das wurde korrigiert und der vollständige E2E-Lauf war danach grün.

Die vollständige API-Test-Suite ist weiterhin rot, weil `tests/integration/api/app.integration.test.ts` den Drizzle-Migrator direkt gegen das alte Migrationsformat ausführt. Die neuen Settings-Integrationstests selbst laufen grün. Die vollständige Web-Test-Suite ist weiterhin rot durch bestehende tldraw/RichText-Testfehler (`CSS.supports`, Preview- und Object-URL-Erwartungen). Der gezielte Test der neuen Settings-Seite läuft grün. Der bereits vorhandene Dirty Tree wurde nicht bereinigt und fremde Änderungen wurden nicht zurückgesetzt.

## Offene Punkte / Folgeaufgaben

Die API-Testinfrastruktur sollte in einem separaten Auftrag so angepasst werden, dass direkte Drizzle-Migrationen mit dem vorhandenen Migrationsformat funktionieren oder die Tests denselben Migrationspfad wie die App verwenden. Die bestehenden tldraw/RichText-Testfehler sollten separat behoben werden. ROLE-Scope ist im Backend vorbereitet; in der UI werden aktuell nur USER und GLOBAL für die ersten Registry-Einträge angeboten, weil die ersten realen Settings keine ROLE-Scope-Freigabe besitzen.
