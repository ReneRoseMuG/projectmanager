# Codex-Aufgabe: Tagebuch — Projekt-Aktivitätserzählung (Feature)

## Aufgabenbeschreibung

Es wird ein neues Feature **Tagebuch** eingeführt: pro Projekt eine fortlaufende, lesbare Erzählung der jüngsten Vorgänge des Projekts — aus Kommentaren, Meilensteinen, Aufgaben, Tickets und Notizen. Das Tagebuch ist eine **reine Erzählschicht über dem bestehenden Journal** (`journal`-Tabelle, `journal.service.ts`, MCP-Tool `report_activity`). Das Journal bleibt die Rohereignis-Quelle und wird **nicht** verändert.

Die Erzähltexte werden **nicht** von der App generiert, sondern von einem manuell in Cowork ausgelösten Skill, der Claude als Textgenerator nutzt und die Ergebnisse über neue MCP-Tools zurückschreibt. Diese Aufgabe umfasst die **App-Infrastruktur** (Schema, Migration, Backend-Schichten, MCP-Tools, Dashboard-Widget). Der Skill selbst ist ein separater Cowork-Deliverable und ist hier nur als Schnittstellenvertrag (Abschnitt „Skill — separat") beschrieben, nicht als Codeänderung im Repo.

**Begründung des Zuschnitts:** Der budgetschonende Zugriff auf „die letzten N aktualisierten Items" existiert bereits über `report_activity` (Parameter `from`/`to`, `limit` bis 100, Cursor `nextCursor`). Es wird daher **kein** neues Lese-/Aktivitätssystem gebaut. Neu ist allein die persistente, versionierte Erzählschicht plus deren Anzeige und Schreib-Tools.

## Scope

**Backend (`apps/api`):**
- Neue Tabelle `diaryEntries` (`apps/api/src/db/schema.ts`) + Migration
- Repository `apps/api/src/repositories/diary-entry.repository.ts` (neu)
- Service `apps/api/src/services/diary.service.ts` (neu)
- Route `apps/api/src/routes/diary.ts` (neu) + Registrierung im App-Bootstrap
- Permission-Ressource `diary` (read/write) im Auth-Katalog

**Shared Types (`packages/shared-types`):**
- DTOs `DiaryEntry`, `DiaryEntryInput`, `DiaryEntryUpdate`
- Ressource `diary` in `AUTH_RESOURCES`

**MCP-Server (`apps/mcp-server`):**
- Neue Tools `get_project_diary`, `create_diary_entry`, `update_diary_entry` (`apps/mcp-server/src/tools.ts`)
- Aktivitätslesen nutzt das **bestehende** `report_activity` — kein neues Read-Tool

**Frontend (`apps/web`):**
- `apps/web/src/api/diary.ts` (neu), Hook `apps/web/src/hooks/useDiary.ts` (neu)
- Eintrag in `queryKeys.ts` und `invalidation.ts`
- Tagebuch-Widget auf der Projekt-Detailseite, gekoppelt an `useHasPermission("diary","read")`

**Tests:** Integration (API), Frontend-Hook/Component, optional E2E gemäß Abschnitt Testhinweise.

---

## Bestätigte Architektur-Entscheidungen

Diese Entscheidungen sind mit dem Auftraggeber abgestimmt und gelten verbindlich:

1. **Speicherort:** eigene versionierte Tabelle `diaryEntries` (kein Wiki-Reuse).
2. **Gruppierung:** strikt **pro Projekt** — ein Strang je Projekt.
3. **Eintragsmodell:** **ein lebender, versionierter Eintrag pro Projekt**, den der Skill fortschreibt und in dem er thematisch verwandte Passagen anpasst — kein Stapel datierter Einzeleinträge. Historie über `version`.
4. **Träger-Bezug:** direkter `projectId`-FK, **bewusst ohne** polymorphen Owner und ohne Owner-Join-Tabellen, da ein Strang strikt zu genau einem Projekt gehört. Diese Abweichung vom generischen Owner-Join-Muster ist gewollt und im Code zu begründen.
5. **Widget-Umfang:** pro Projekt gefiltert (Projekt-Detailseite), zeigt den Eintrag des aktuellen Projekts. Der „Aktualisieren"-Button lädt nur neu; die Neugenerierung läuft ausschließlich über den Skill (die App ruft kein LLM auf).
6. **Content-Format:** `content` ist **HTML** (konsistent mit den übrigen description-/content-Feldern der App).

---

## Schritt 1: Bestandsaufnahme und Verifikation (vor jeder Änderung)

Zuerst `docs/architektur-leitfaden.md` (Datenmodell & Schichten) und die für Dashboards/Widgets relevanten Abschnitte aus `docs/design-leitfaden.md` lesen.

Dann eine Ist/Soll-Tabelle für alle betroffenen Dateien erstellen (Schema, Repository, Service, Route, Shared Types, MCP-Tools, Web-API/Hook/Widget, Tests).

**Verbindlich zu verifizieren (gegen den echten Stand, nicht raten):**

1. **`report_activity`-Ausgabeform:** Tool einmal real aufrufen und die tatsächliche Struktur prüfen (`groups`, `entries`, `contexts`, `nextCursor`, Zeitfelder). Davon hängt der Schnittstellenvertrag des Skills ab.
2. **Projekt-Zuordnung von Sub-Items:** Klären, ob die Journal-Kontexte (`journal.service.ts`, `JournalContext`/`makeJournalContext`) bei Sub-Items (Ticket/Task/Feature/Use Case) bereits einen Projekt-Kontext enthalten. Falls ja, ist die Gruppierung pro Projekt trivial. Falls nein, den günstigsten Weg bestimmen, das Projekt eines Items aufzulösen (z. B. über `get_reference_context`/`resolve_reference` oder die Projekt-Join-Tabellen). Ergebnis dokumentieren.
3. **Auth-Katalog:** Ort von `AUTH_RESOURCES`/`AUTH_ACTIONS` und der Validierung in `apps/api/src/services/roles.service.ts` (`validateResource`) bestätigen; festlegen, wo `diary` ergänzt wird. System-Rollen nutzen Wildcards (`admin: *`, `editor: read+write`, `reader: read`) — prüfen, dass `diary` damit automatisch abgedeckt ist und kein zusätzliches Seeding nötig ist.
4. **Test-Infrastruktur:** Aktuellen Test-Wurzelort und Fixture-Helfer bestätigen (`createTestDb()`, `truncateAll`/`truncateTables`, Dump-Registry) gemäß `agents.md` §7/§11. Bei Abweichung zwischen `docs/task-template.md` (alte Pfade) und `agents.md` gilt `agents.md`.

**Erst nach abgeschlossener Bestandsaufnahme mit der Implementierung beginnen.**

---

## Schritt 2: Schema & Migration

Neue Tabelle `diaryEntries` in `apps/api/src/db/schema.ts` nach dem Muster einer versionierten Entität (`wikiPages` als Vorlage):

- `id` (PK, autoincrement)
- `projectId` (FK → `projects.id`, `onDelete: "cascade"`, **notNull**)
- `title` (short text, notNull)
- `content` (longtext, HTML; nullable)
- `coveredUntil` (Zeitstempel-Text, ISO 8601; nullable) — Wasserstand: jüngstes vom Eintrag berücksichtigtes Journal-Ereignis
- `sourceCount` (int, default 0) — Anzahl bisher eingearbeiteter Ereignisse (informativ)
- `version` (int, notNull, default 1)
- `createdBy` / `updatedBy` (FK → `users.id`, `onDelete: "set null"`)
- `createdAt` / `updatedAt` (Zeitstempel-Text)
- **Unique-Index auf `projectId`** (genau ein lebender Eintrag pro Projekt)

Migration:
1. Schemaänderung vornehmen
2. `npm run db:generate -w apps/api` (bzw. `drizzle-kit generate`) → neue Migrationsdatei
3. `npm run db:migrate` → lokal anwenden, Erfolg prüfen
4. Tabelle in Dump-Registry und Test-Truncation eintragen (Reihenfolge: keine abhängigen Join-Tabellen vorhanden, daher nur `diary_entries`)
5. Commit enthält `schema.ts`, neue Migrationsdatei und `migrations/meta/*` gemeinsam

## Schritt 3: Shared Types

In `packages/shared-types`:
- `DiaryEntry` (`id`, `projectId`, `title`, `content?`, `coveredUntil?`, `sourceCount`, `version`, `createdAt`, `updatedAt`)
- `DiaryEntryInput` (`title`, `content?`, `coveredUntil?`, `sourceCount?`)
- `DiaryEntryUpdate = WithExpectedVersion<Partial<DiaryEntryInput>>`
- `diary` zu `AUTH_RESOURCES` hinzufügen

## Schritt 4: Repository

`apps/api/src/repositories/diary-entry.repository.ts` (Vorlage `wiki-page.repository.ts`):
- `findByProjectId(db, projectId)` — der eine Eintrag oder `undefined`
- `findById(db, id)`
- `create(db, data, userId)` — `version: 1`, Audit-Felder setzen
- `update(db, id, expectedVersion, data, userId)` — `assertVersion(current.version, expectedVersion)` → bei Mismatch `CONFLICT`; `version + 1`, `updatedBy`/`updatedAt` setzen
- `delete(db, id)`

## Schritt 5: Service

`apps/api/src/services/diary.service.ts`:
- `getProjectDiary(db, projectId)` → DTO oder `undefined`
- `upsertProjectDiary` bzw. getrennte `createProjectDiary` / `updateProjectDiary` (mit `expectedVersion`)
- Existenz des Projekts prüfen → `NOT_FOUND`, falls Projekt fehlt
- Mapping `DiaryEntryRecord` → `DiaryEntry`-DTO
- Keine eigene Persistenz im Service außerhalb des Repositories; keine Business-Logik in der Route
- Optional: Journal-Eintrag beim Erstellen/Aktualisieren über `recordJournalEntry` — **nur** falls dies das Tagebuch nicht selbst-rekursiv triggert. Standard: **kein** Journal-Eintrag fürs Tagebuch, um eine Rückkopplung (Tagebuch-Änderung erzeugt Journal-Ereignis, das wieder ins Tagebuch fließt) zu vermeiden. Diese Entscheidung im Code kommentieren.

## Schritt 6: Route & Permission

`apps/api/src/routes/diary.ts` (Vorlage `wiki.ts`), alle Routen authentifizierungspflichtig:
- `GET /projects/:projectId/diary` → Permission `diary:read`; liefert den Eintrag oder leeres/`null`-Ergebnis
- `POST /projects/:projectId/diary` → `diary:write`; Body = `DiaryEntryInput`; Fastify-Schema mit Pflichtfeld `title`
- `PATCH /diary/:id` → `diary:write`; Body = `DiaryEntryUpdate`; `expectedVersion` im Schema **erzwingen**; Versionskonflikt → `409 CONFLICT`
- `DELETE /diary/:id` → `diary:delete` (nur falls Löschen benötigt; sonst weglassen)

Route im App-Bootstrap registrieren (dort, wo die übrigen Routen registriert werden). Einheitliches Fehlerformat (§9). Permission-Prüfung über den bestehenden Guard-Mechanismus.

## Schritt 7: MCP-Tools

In `apps/mcp-server/src/tools.ts` neue Tools nach dem Muster `create_wiki_page` / `update_wiki_page` (`updateVersioned`-Helfer) im `createToolDefinitions()`-Array ergänzen:

- `get_project_diary` — Eingabe: `projectId` (oder Referenz wie `PROJ-3`); ruft `GET /projects/:id/diary`
- `create_diary_entry` — Eingabe: `projectId`, `title`, `content` (HTML), `coveredUntil?`, `sourceCount?`; ruft `POST /projects/:id/diary`
- `update_diary_entry` — Eingabe: `id`, optionale Felder; nutzt `updateVersioned` (lädt aktuelle `version`, sendet `expectedVersion`); ruft `PATCH /diary/:id`

Kein neues Auth nötig (API-Key im `ProjectManagerApiClient`). Aktivität liest der Skill über das vorhandene `report_activity`.

## Schritt 8: Frontend-Widget

- `apps/web/src/api/diary.ts`: `getProjectDiary(projectId)`, `regenerate` entfällt (keine App-seitige Generierung)
- `apps/web/src/hooks/useDiary.ts`: `useDiary(projectId)` mit Query auf den Projekt-Eintrag; `enabled` an `canReadDiary` koppeln
- `queryKeys.ts`: Block `diary` mit `root` und `byProject(projectId)`
- `invalidation.ts`: `invalidateDiary(queryClient, projectId)`
- Widget auf der Projekt-Detailseite nach dem bestehenden `WidgetShell`-Muster (Header-Icon, Titel „Tagebuch", Inhalt als gerenderter HTML-Erzähltext, `EmptyState` wenn kein Eintrag). „Aktualisieren"-Button = reines Refetch (`variant="ghost"`, Refresh-Icon), sichtbar nur bei `diary:read`.
- Verbindliche Design-Tokens beachten: `rounded-lg border border-line bg-white p-4 shadow-sm`; Texte `text-ink` / `text-steel-*`; keine rohen Tailwind-Farben (`text-slate-*`, `rounded-full` auf Cards etc.). HTML-Content sicher rendern (vorhandenes Render-/Sanitize-Muster der App für Wiki/Comment-Content wiederverwenden).

## Schritt 9: Skill — separat (nur Schnittstellenvertrag, keine Repo-Codeänderung)

Der Cowork-Skill „tagebuch" wird **nicht** in dieser Codex-Aufgabe implementiert. Er wird separat erstellt und muss folgenden Vertrag erfüllen, damit diese Infrastruktur passt:

1. Liest das Delta über `report_activity` (`from` = höchstes `coveredUntil` der betroffenen Projekte bzw. ein gewähltes Zeitfenster; `limit` ≤ 100; bei `nextCursor` paginieren).
2. Führt jedes Ereignis **deterministisch** auf sein Projekt zurück (Ergebnis aus Schritt 1.2) und gruppiert pro Projekt — kein LLM fürs Gruppieren.
3. Lädt je betroffenem Projekt den bestehenden Eintrag (`get_project_diary`), gibt Claude nur „bestehende Erzählung + neue Ereignisse dieses Projekts" und lässt den Text fortschreiben/anpassen.
4. Schreibt zurück: `create_diary_entry` (erstes Mal) bzw. `update_diary_entry` (mit `expectedVersion`); setzt `coveredUntil` auf den jüngsten verarbeiteten Zeitstempel.
5. Enthält **keine** hartcodierten Projektnamen, IDs oder Pfade; arbeitet generisch gegen den MCP.

---

## Regeln & Einschränkungen

- Alle neuen API-Routen sind authentifizierungspflichtig; keine öffentlichen Ausnahmen.
- `expectedVersion` bei Update strikt erzwingen; fehlend → `BAD_REQUEST`, Konflikt → `CONFLICT`.
- Keine Business-Logik in Route-Handlern; keine Drizzle-Direktzugriffe in Services außerhalb des Repositories.
- Keine spekulativen Felder oder Endpunkte über den beschriebenen Scope hinaus.
- Das Journal und bestehende Domänen bleiben unverändert.
- Code/Bezeichner Englisch; Logs und Nutzertexte Deutsch; echte Umlaute, UTF-8.
- Datumsformate: maschinenlesbar ISO 8601, menschenlesbar `dd.MM.yy`.

## Randfälle & Fehlerpfade

- Projekt existiert nicht → `404 NOT_FOUND` bei GET/POST.
- Zweiter `POST` für ein Projekt, das bereits einen Eintrag hat → Unique-Constraint; als `409 CONFLICT` behandeln (ein lebender Eintrag pro Projekt).
- `PATCH` mit veralteter `version` → `409 CONFLICT`.
- Projekt gelöscht → Eintrag wird per Cascade entfernt; Widget zeigt `EmptyState`.
- Leerer/zu langer `content`: kein Generierungslauf erzwingen; leeres Tagebuch ist ein gültiger Zustand.
- Zugriff ohne Session → `401 UNAUTHORIZED`; ohne `diary`-Permission (theoretisch via Custom-Rolle ohne Wildcard) → `403 FORBIDDEN`.

## Seiteneffekte

- Neue Tabelle erfordert Aktualisierung von Dump-Registry und Test-Truncation; sonst keine.
- Neuer Nav-/UI-Block nur auf der Projekt-Detailseite; keine globale Navigationsänderung.
- Keine Änderung an bestehenden Endpunkten, Query-Keys oder Invalidierungs-Scopes außer dem additiven `diary`-Block.

## Testhinweise

**Framework:** Vitest + Supertest (API-Integration, echte temporäre MySQL-Test-DB via `createTestDb()`); Vitest + Testing Library (Frontend); optional Playwright (E2E). Vor Test-Erstellung Skill `test-entwurfsleitplanken` anwenden.

**Pflicht-Testfälle API (`tests/integration/api/diary.test.ts`, Ablageort in Schritt 1.4 bestätigen):**
1. POST über Projekt → Eintrag per GET sichtbar, `version = 1`
2. GET ohne vorhandenen Eintrag → leeres/`null`-Ergebnis, kein 500
3. PATCH mit aktueller `version` → 200, `version` inkrementiert, `updatedAt` aktualisiert
4. PATCH mit veralteter `version` → 409
5. Zweiter POST für dasselbe Projekt → 409 (Unique)
6. POST/GET für nicht existierendes Projekt → 404
7. Cascade: Projekt löschen → Eintrag nicht mehr abrufbar
8. Auth-Negativfälle: ohne Session → 401; Reader-/Custom-Rolle ohne `diary:write` auf POST/PATCH → 403; positiver Schreibfall mit berechtigtem User

**Pflicht-Testfälle Frontend:**
9. `useDiary(projectId)` lädt und liefert Eintrag; Fehlerzustand über `toQueryError`
10. Widget rendert Erzähltext bzw. `EmptyState`; „Aktualisieren" löst Refetch aus; Button nur bei `diary:read` sichtbar

**Pflicht-Kommentarkopf** in jeder neuen Testdatei (Test Scope, Abgedeckte Regeln, Fehlerfälle, Ziel). Keine leeren Tests, keine `.skip` ohne dokumentierten Blocker.

## Abnahmekriterien

- [ ] Bestandsaufnahme inkl. der vier Verifikationspunkte dokumentiert
- [ ] `diaryEntries` mit `version`, `created_by`, `updated_by`, `created_at`, `updated_at`, Unique auf `projectId`; Migration generiert und lokal erfolgreich angewandt
- [ ] Tabelle in Dump-Registry und Test-Truncation eingetragen
- [ ] Repository mit CRUD + Versionsprüfung; Service ohne Drizzle-Direktzugriff; Route ohne Business-Logik
- [ ] Routen authentifizierungspflichtig, Permission-Mapping `read`/`write` korrekt, `expectedVersion` erzwungen
- [ ] Shared Types ergänzt; `diary` in `AUTH_RESOURCES`
- [ ] MCP-Tools `get_project_diary`, `create_diary_entry`, `update_diary_entry` vorhanden und kompilieren; `update_diary_entry` nutzt `expectedVersion`
- [ ] Widget auf Projekt-Detailseite gemäß Design-Leitfaden; Permission-Gating; „Aktualisieren" = Refetch
- [ ] Alle Pflicht-Testfälle vorhanden und grün; keine bestehenden Tests gebrochen
- [ ] Kein Scope über das Beschriebene hinaus; Journal unverändert
- [ ] Schritt-Logs gemäß `agents.md` §5 geschrieben

## Implementierungsreihenfolge

1. Bestandsaufnahme & Verifikation (Schritt 1)
2. Schema & Migration (Schritt 2)
3. Shared Types (Schritt 3)
4. Repository (Schritt 4)
5. Service (Schritt 5)
6. Route & Permission (Schritt 6)
7. API-Integrationstests (Testhinweise 1–8)
8. MCP-Tools (Schritt 7)
9. Frontend: API/Hook/Keys/Invalidation/Widget (Schritt 8)
10. Frontend-Tests (Testhinweise 9–10), optional E2E
11. Voller Testlauf, Schritt-Logs, Abnahmeprüfung

## Referenz

- Arbeitsanweisung: `agents.md` (§0, §3, §5, §6, §8, §9, §11, §14)
- Architektur: `docs/architektur-leitfaden.md` · Design: `docs/design-leitfaden.md`
- Vorlagen Backend: `apps/api/src/repositories/wiki-page.repository.ts`, `apps/api/src/services/wiki.service.ts`, `apps/api/src/routes/wiki.ts`
- Auth-Katalog: `apps/api/src/services/roles.service.ts`
- Journal: `apps/api/src/services/journal.service.ts`, MCP-Tool `report_activity`
- MCP-Vorlage: `apps/mcp-server/src/tools.ts` (`create_wiki_page`, `update_wiki_page`, `updateVersioned`)
- Frontend-Vorlage: `apps/web/src/components/dashboard/DashboardWidgets.tsx`, `apps/web/src/hooks/` (Beispiel `useDayPlan`)
