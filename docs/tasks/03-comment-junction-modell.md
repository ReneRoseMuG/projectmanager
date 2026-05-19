# Codex-Aufgabe: Comment-Junction-Modell

## Aufgabenbeschreibung
Stelle Comments auf das Zielmodell aus dem Architektur-Leitfaden um. Comments sind im Endzustand Support-Objekte mit n:m-Beziehungen zu Parent-Objekten. Polymorphe Felder wie `entity_type` und `entity_id` sowie `task_id` dürfen fachlich nicht mehr als Owner-Modell genutzt werden.

Comment-Responses verwenden künftig `owners: [...]`, damit mehrere Parent-Verknüpfungen korrekt abgebildet werden können.

## Scope
Betroffen sind:
- `apps/api/src/db/schema.ts`
- `apps/api/src/db/migrations/`
- `apps/api/src/services/comments.service.ts`
- Parent-Services, die aktuell Comment-Cascade manuell auslösen
- `apps/api/src/routes/comments.ts`
- Parent-Routes, sofern Comment-Routen dorthin verschoben oder explizit registriert werden müssen
- `packages/shared-types/src/index.ts`
- `apps/web/src/api/comments.ts`
- `apps/web/src/hooks/useEntityComments.ts`
- `apps/web/src/hooks/useTaskDetail.ts`
- `apps/web/src/queries/queryKeys.ts`
- `apps/web/src/queries/invalidation.ts`
- `apps/api/tests/integration/comments.test.ts`
- `apps/api/tests/integration/delete-cascade.test.ts`
- betroffene E2E-Tests unter `apps/web/e2e/`

Parent-Typen im Scope:
- Project
- Task
- Feature
- UseCase
- BacklogItem
- WikiPage
- Ticket

Abhängigkeiten:
- Aufgabe 01 abgeschlossen oder deren Bestandsaufnahme liegt vor.
- Aufgabe 02 abgeschlossen, falls `version` und Audit-Felder bereits vorausgesetzt werden.

Nicht im Scope:
- Attachment-Umbau.
- Vollständige Repository-Migration aller Domains.
- Entfernen alter Comment-Spalten; das erfolgt erst in Aufgabe 09 nach Verifikation.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lies zunächst den Architektur-Leitfaden vollständig:
`docs/architecture-leitfaden.md`

Lese dann alle betroffenen Dateien und erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| `schema.ts` | `comments` nutzt aktuell alte Owner-Felder | Comment-Junction-Tabellen existieren |
| `comments.service.ts` | `ensureEntityExists()` und manuelle Cascade-Funktionen vorhanden | Parent-spezifische Junction-Queries ohne polymorphe Owner-Logik |
| Parent-Services | Teilweise manuelle `deleteCommentsForEntity`-Aufrufe | DB-Kaskaden entfernen Junction-Einträge |
| `comments.ts` | Generische Entity-Routen über Entity-Type | Parent-Kontext wird explizit über Junction-Funktionen genutzt |
| Shared Types | `Comment` enthält alte Owner-Felder | `Comment` enthält `owners: CommentOwner[]` |
| Tests | Tests erwarten altes Owner-Modell | Tests prüfen n:m, Cascade und 404 |

Dokumentiere außerdem:
- Welche alten Service-Funktionen entfallen.
- Welche neuen Parent-spezifischen Funktionen entstehen.
- Welche Web-Hooks oder API-Clients alte DTO-Felder verwenden.

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Schema & Migration

- Ergänze Junction-Tabellen:
  - `project_comments`
  - `task_comments`
  - `feature_comments`
  - `use_case_comments`
  - `backlog_item_comments`
  - `wiki_page_comments`
  - `ticket_comments`
- Jede Junction-Tabelle erhält:
  - FK auf Parent mit `onDelete: "cascade"`
  - FK auf `comments.id` mit `onDelete: "cascade"`
  - Unique-Index auf Parent-ID und `comment_id`
  - keine Audit- oder Version-Felder
- Erzeuge eine Datenmigration:
  - Bestehende `comments.task_id`-Datensätze werden in `task_comments` übertragen.
  - Bestehende `comments.entity_type`/`entity_id`-Datensätze werden in die passende Junction-Tabelle übertragen.
  - Doppelte Links werden dedupliziert.
- Alte Spalten bleiben zunächst bestehen und werden erst in Aufgabe 09 entfernt.
- Führe Migration und Verifikation lokal aus.

---

## Schritt 3: Repository

Falls Aufgabe 05 noch nicht umgesetzt ist:
- Lege keine vollständige Repository-Schicht an.
- Halte die Comment-Änderung service-nah, aber so, dass sie später ohne API-Bruch ins `comment.repository.ts` verschoben werden kann.

Falls Aufgabe 05 bereits umgesetzt ist:
- Nutze `commentRepository` für CRUD auf `comments`.
- Junction-Operationen dürfen vorerst im Service bleiben.

---

## Schritt 4: Service

- Ersetze polymorphe Owner-Queries durch Parent-spezifische Junction-Queries.
- Entferne fachliche Nutzung von `ensureEntityExists()`.
- Entferne `deleteCommentsForEntity()` und `deleteCommentsForEntities()` als manuelle Cascade-Ersatzfunktionen.
- Implementiere Parent-spezifische Funktionen:
  - `listProjectComments`
  - `createProjectComment`
  - `linkProjectComment`
  - entsprechende Funktionen für Task, Feature, UseCase, BacklogItem, WikiPage und Ticket
- Direct Delete per `deleteComment(db, id)` bleibt erlaubt und löscht den Comment-Datensatz.
- Ein Comment darf mit mehreren Parents verknüpft sein.
- Responses enthalten `owners: [...]`.

---

## Schritt 5: Route

- Bestehende Parent-URLs bleiben erhalten, z. B.:
  - `GET /projects/:id/comments`
  - `POST /projects/:id/comments`
  - `DELETE /comments/:id`
- Ergänze bei Bedarf Link-Routen für bestehende Comments:
  - `POST /projects/:id/comments/:commentId`
  - entsprechende Parent-Pfade für alle Comment-Parents
- Parent-Routes prüfen nicht manuell per `entityType`, sondern rufen Parent-spezifische Service-Funktionen auf.
- API-Response-Typen werden auf `owners: [...]` angepasst.

---

## Schritt 6: Tests (verpflichtend, vor Abnahme vollständig)

### 6a — Integration-Tests

Ergänze oder aktualisiere Tests in:
- `apps/api/tests/integration/comments.test.ts`
- `apps/api/tests/integration/delete-cascade.test.ts`

Pflichtfälle:
- Comment über jeden Parent-Typ erstellen.
- Comment in Liste des jeweiligen Parents sichtbar.
- Bestehenden Comment mit zweitem Parent verknüpfen.
- Comment ist danach in beiden Parent-Listen sichtbar.
- Direkter Delete über `/comments/:id` entfernt Comment und alle Junction-Einträge.
- Nicht existierender Parent liefert 404.
- Parent löschen entfernt Junction-Eintrag automatisch.
- Wenn letzter Parent entfernt wurde, ist das erwartete Verhalten dokumentiert und getestet.
- Alte Comment-Daten werden korrekt in Junction-Tabellen migriert.

### 6b — E2E-Tests

Ergänze E2E-Abdeckung dort, wo Comments im Browser sichtbar bearbeitet werden:
- Comment an Parent erstellen und ohne Reload sichtbar sehen.
- Comment entfernen und ohne Reload verschwinden sehen.
- Verknüpfte Comment-Zähler oder Tabs aktualisieren sich korrekt.

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen wenn alle folgenden Punkte erfüllt sind:

- [ ] Alle sieben Comment-Junction-Tabellen existieren
- [ ] Bestehende Comment-Daten wurden verlustfrei in Junction-Tabellen übertragen
- [ ] Services nutzen keine polymorphen Comment-Owner-Queries mehr
- [ ] `ensureEntityExists()` wurde aus der Comment-Logik entfernt
- [ ] Manuelle Comment-Cascade-Funktionen wurden entfernt
- [ ] Parent-Services löschen Comments nicht mehr manuell als FK-Ersatz
- [ ] Comment-Responses enthalten `owners: [...]`
- [ ] Web-API und Hooks verwenden die neuen DTOs
- [ ] Integration-Tests für CRUD, n:m und Cascade sind grün
- [ ] Relevante E2E-Tests sind grün oder Blocker sind dokumentiert
- [ ] Alte Spalten wurden noch nicht gedroppt

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Schema: `apps/api/src/db/schema.ts`
- Comment-Service: `apps/api/src/services/comments.service.ts`
- Comment-Routes: `apps/api/src/routes/comments.ts`
- Shared Types: `packages/shared-types/src/index.ts`
- Web API: `apps/web/src/api/comments.ts`
- Integration-Tests: `apps/api/tests/integration/comments.test.ts`
- Cascade-Tests: `apps/api/tests/integration/delete-cascade.test.ts`
