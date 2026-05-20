# Log: Auth-Schema und Seed

**Datum:** 20.05.26  
**Schritt:** 2 — Schema, Migration, Seed und Konfiguration  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Datenmodell wurde um Rollen, Berechtigungen und die erweiterten Benutzerfelder ergänzt. Die neue Migration `0022_hot_pretty_boy.sql` wurde bewusst gegenüber der generierten Variante angepasst, damit `users.full_name` als SQLite-STORED-Generated-Column angelegt wird und bestehende Benutzer über eine sichere Tabellen-Rebuild-Migration erhalten bleiben. Systemrollen und Basisberechtigungen werden in der Migration und beim App-Start idempotent abgesichert. Die API-Konfiguration enthält jetzt Admin-Bootstrap- und Session-Werte, CORS erlaubt Credentials, und die Dump-/Test-Registry kennt die neuen Tabellen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Rollen, Permissions und erweiterte User-Spalten ergänzt |
| `apps/api/src/db/migrations/0022_hot_pretty_boy.sql` | neu | Auth-/Rollen-Migration mit User-Rebuild |
| `apps/api/src/db/migrations/meta/*` | geändert/neu | Drizzle-Metadaten für Migration 0022 |
| `apps/api/src/config.ts` | geändert | Admin- und Session-Konfiguration ergänzt |
| `apps/api/.env.example` | geändert | Neue Auth-ENV-Werte dokumentiert |
| `apps/api/src/services/auth.service.ts` | neu | Auth-Seed und Login-/Passwortlogik vorbereitet |
| `apps/api/src/services/dump.service.ts` | geändert | Dump-Format um Rollen und Rechte erweitert |
| `apps/api/tests/helpers/db.ts` | geändert | Test-Truncation und Auth-Testseed ergänzt |
| `packages/shared-types/src/index.ts` | geändert | Auth-, Rollen-, User- und Fehler-DTOs ergänzt |

## Probleme und Abweichungen

Die von Drizzle erzeugte SQL-Migration hätte `full_name` nur als normale Textspalte angelegt und `role_id NOT NULL` bei bestehenden Benutzern nicht sauber behandelt. Deshalb wurde die neu erzeugte Migration vor dem Anwenden manuell auf eine SQLite-Rebuild-Migration korrigiert.

## Offene Punkte / Folgeaufgaben

Die neuen Auth- und Admin-Routen sind angelegt, müssen aber noch vollständig mit Test-Fixtures, Frontend und E2E-Flows verbunden werden.
