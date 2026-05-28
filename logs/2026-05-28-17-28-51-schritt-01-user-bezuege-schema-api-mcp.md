# Log: User-Bezüge Schema, API und MCP

**Datum:** 28.05.26  
**Uhrzeit:** 17:28:51  
**Schritt:** 1 — Schema, Migration, Shared Types und API/MCP auf echte User-Bezüge umstellen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Arbeitsobjekte Project, Milestone, Feature, Use Case, Backlog Item, Task, Ticket und Event wurden im Schema um echte User-Bezüge für Verantwortlichkeit erweitert. Tasks nutzen nicht mehr das alte Textfeld `assignee`; Tickets nutzen für „Meldende Person“ und „Zuständig“ echte User-ID-Felder. Die Migration `0035_ms_25_user_responsibility.sql` ergänzt die neuen FK-Spalten, migriert bestehende Task-/Ticket-Textwerte bestmöglich gegen `users.full_name`, `users.name` oder `users.email` und entfernt danach die alten Textspalten. API-Services, Route-Schemas, Shared Types und MCP-Tools wurden auf `responsibleUserId`, `responsibleUser`, `reporterUserId` und `reporterUser` umgestellt. Der bestehende Drizzle-Generator war wegen CLI-/Meta-Format blockiert; die Migration wurde deshalb manuell angelegt und der bestehende Runner erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | User-FK-Spalten für Arbeitsobjekte ergänzt und alte Personen-Textfelder ersetzt |
| `apps/api/src/db/migrations/0035_ms_25_user_responsibility.sql` | neu | Migration mit FK-Spalten, Textwert-Mapping und Spaltenentfernung |
| `packages/shared-types/src/index.ts` | geändert | DTOs und Inputs auf User-ID plus User-Summary erweitert |
| `apps/api/src/services/*` | geändert | Mapping, Defaults, FK-Validierung und Audit-Felder angepasst |
| `apps/api/src/routes/*` | geändert | Request-Schemas auf neue User-ID-Felder erweitert |
| `apps/mcp-server/src/tools.ts` | geändert | MCP-Tool-Schemas und Payloads auf User-ID-Felder umgestellt |

## Probleme und Abweichungen

`npm run db:generate -w apps/api` scheitert mit „Unrecognized options for command 'generate:sqlite': --config“. `npx drizzle-kit generate --config=drizzle.config.ts` verlangte ein Meta-Format-Upgrade, `drizzle-kit up` brach mit „No snapshot was found“ ab und erzeugte kurzzeitig eine unerwartete Verzeichnisstruktur für die Legacy-Migration. Diese Werkzeug-Nebenwirkung wurde zurückgestellt; die bestehende Migrationsstruktur ist wiederhergestellt. Die neue Migration wurde manuell angelegt und `npm run db:migrate -w apps/api` lief anschließend erfolgreich.

## Offene Punkte / Folgeaufgaben

Die Web-Formulare, Karten/List-Items, Kalender-, Editor- und Testanpassungen folgen in den nächsten MS-25-Schritten.

## Testleitplanken

Der Testentwurfs-Skill wurde angewendet. Bisher geprüft: API-Build über `npm run db:migrate -w apps/api`, lokaler Migrationslauf mit echter Dev-SQLite-Konfiguration und MCP-TypeScript-Build über `npm run build -w apps/mcp-server`. Vollständige API-, MCP-, Web- und Browser-Tests folgen nach Abschluss aller Umsetzungsschritte.
