# Projekt-Kontext: Tech-Stack — Projekt Manager

Ausgefüllt gemäß Vorlage aus `dev-testing-skills/reference/tech-stack-template.md`.

## Schichten

| Ebene-1-Rolle | Konkreter Ort in diesem Repo |
|---|---|
| Shared Types / Schema | `packages/shared-types`; DB-Schema in `apps/api/src/db/schema.ts` |
| API-Routen (Validierung + Service-Aufruf) | `apps/api/src/routes` |
| Controller (falls eigene Schicht zwischen Routen und Services) | nicht vorhanden — Routen rufen Services direkt |
| Repositories (CRUD, Persistenz) | `apps/api/src/repositories` |
| Services (Business-Regeln, domänenübergreifend) | `apps/api/src/services` |
| Frontend-API-Client | `apps/web/src/api` (HTTP-Client `ky` über `apps/web/src/api/client.ts`) |
| Frontend-Seiten/Komponenten | `apps/web/src/pages`, `apps/web/src/components` |

Weitere Workspace-Pakete: `apps/mcp-server` (Projekt-Manager-MCP-Server), `apps/windows-importer`.

## State-Management (Frontend)

- Bibliothek: TanStack Query
- Zentrale Query-Keys: `apps/web/src/queries/queryKeys.ts`
- Zentrale/verteilte Invalidierung: zentral in `apps/web/src/queries/invalidation.ts`
- Verboten: `useState`+`useEffect` für Server-State — immer über TanStack-Query-Hooks

## UI-Komponenten

- Bevorzugte gemeinsame Komponenten: `ItemCard`, `FormModal`, `ItemRow` (`apps/web/src/components/ui/`)
- Komponentenbibliothek: eigenes UI-Kit auf `apps/web/src/components/ui/` (kein Radix)
- Label-/Übersetzungskonvention: zentrale Datei `apps/web/src/utils/domainLabels.ts` — keine Inline-Strings
- Design-Leitfaden-Datei: `docs/design-leitfaden.md`

## Datenbank

- Typ: MySQL (Aiven-gehostet in Produktion)
- ORM: Drizzle ORM (`drizzle-orm/mysql2`), Treiber `mysql2`
- Migrationsordner: `apps/api/src/db/migrations` (Config: `apps/api/drizzle.config.ts`)
- Connection-Pool-Limits: `connectionLimit 10`, `queueLimit 50` (`apps/api/src/db/client.ts`) — Sammel-Queries (`inArray`) statt Pro-Element-Queries verwenden
- Verbotene Pfade in Tests: keine produktive MySQL-Instanz; Tests erzeugen eine eigene, eindeutig benannte Test-Datenbank pro Lauf (siehe `tests/fixtures/api/db.ts`, `assertSafeTestDatabaseTarget`)

## Tests

- Testebenen und Ordner: `tests/unit/{api,web}`, `tests/integration/{api,web}`, `tests/browser/web` (Playwright E2E), Fixtures in `tests/fixtures`
- Testkommandos je Ebene:
  ```bash
  npm run test -w apps/api
  npm run test -w apps/web
  npm run e2e -w apps/web
  ```
  Root-Sammelkommando: `npm run test` (führt `scripts/run-tests.mjs` aus)
- Isolationsmechanismus: pro Testlauf eine eigene, eindeutig benannte MySQL-Datenbank über `tests/fixtures/api/db.ts` (`assertSafeTestDatabaseTarget` als Guard); E2E über `tests/fixtures/e2e/worker-db.ts` (Worker-DB)

## Domänen-Abdeckung (für test-quality-review)

| Domäne | Kern-Entitäten |
|---|---|
| Projektmanagement | projects, milestones, tasks |
| Dokumentation | features, useCases, wikiPages |
| Tickets | tickets, ticketRelations |
| Tags | projectTags, milestoneTags, taskTags, ticketTags |
| Notes | projectNotes, milestoneNotes, taskNotes, ticketNotes |
| Attachments | projectAttachments, milestoneAttachments, taskAttachments, ticketAttachments |
| Comments | projectComments, milestoneComments, taskComments, ticketComments |
| Auth & Rollen | Permissions, Session, Guards |
| Journal | journal entries, objectJournal |

## Analysewerkzeuge

- Graphify vorhanden: ja, `graphify-out/`
- Sonstige Analyse-Skripte: keine weiteren bekannt

## Auth & Rollen

- Permission-Mapping: lesende Endpunkte → `read`; erstellende/ändernde → `write`; Löschoperationen → `delete`; Admin-Endpunkte → domänenspezifische Admin-Permissions (z. B. `users:admin`, `roles:admin`); neue Domänen ergänzen den Permission-Katalog
- Öffentliche Ausnahmen: `/health`, `/api/health`, `/api/auth/*`

## Git-Kurzkommandos

- Hauptbranch (nicht direkt anfassen außer bei explizitem Nutzerwunsch): `main`
- `branch <name>` → von `main` abzweigen, Remote-Tracking einrichten, sofort pushen
- `save` → alle Änderungen stagen, sinnvoll committen, Branch pushen
- `savetowork` → save, in `work` mergen, Änderungen verifizieren, `work` pushen, Branch-Löschung erst nach expliziter Bestätigung

## Sonstige verbindliche Referenzdokumente

- Projektverfassung: `agents.md`
- Architektur-/Design-Leitfaden: `docs/architektur-leitfaden.md` (Datenmodell & Schichten), `docs/design-leitfaden.md` (UI/Design)
