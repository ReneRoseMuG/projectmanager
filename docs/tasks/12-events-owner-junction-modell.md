# Codex-Aufgabe: Events Owner-Junction-Modell

## Aufgabenbeschreibung

Passe die Calendar-Events an die neue Owner-/Junction-Architektur an. Im Ist-Zustand hängen Events direkt über nullable FK-Spalten `events.project_id` und `events.task_id` an Projekten und Tasks. Im Zielzustand enthält die Basistabelle `events` keine direkten Owner-Spalten mehr; Projekt- und Task-Bezüge laufen über n:m-Junction-Tabellen. Bestehende Event-Daten müssen verlustfrei migriert werden, Tests sind mitzuführen und neue Codepfade müssen durch Tests abgesichert werden.

Aktuell event-fähige Owner sind ausschließlich `project` und `task`. Neue Event-Träger wie Tickets, Features, Use Cases, Backlog-Items oder Wiki-Seiten sind nicht Teil dieser Aufgabe und dürfen nur nach separater fachlicher Entscheidung ergänzt werden.

Bestehendes Verhalten bleibt erhalten: ownerlose Events sind als globale Kalendertermine erlaubt. Das Löschen eines Parents entfernt nur die jeweilige Verknüpfung; der Event-Record bleibt bestehen, sofern er nicht explizit gelöscht wird.

## Scope

Betroffen sind:

- `apps/api/src/db/schema.ts`
- `apps/api/src/db/migrations/`
- `apps/api/src/services/events.service.ts`
- `apps/api/src/routes/events.ts`
- `apps/api/src/services/dump.service.ts`
- `apps/api/src/services/seed-data.service.ts`
- `packages/shared-types/src/index.ts`
- `apps/web/src/api/events.ts`
- `apps/web/src/hooks/useEvents.ts`
- `apps/web/src/queries/queryKeys.ts`
- `apps/web/src/queries/invalidation.ts`
- `apps/web/src/components/calendar/EventForm.tsx`
- `apps/web/src/components/calendar/CalendarView.tsx`
- `apps/web/src/components/calendar/UpcomingEvents.tsx`
- `apps/web/src/pages/CalendarPage.tsx`
- API-Integrationstests und Web-/E2E-Tests für Calendar-Events

Neue Zieltabellen:

- `project_events`
- `task_events`

Legacy-Spalten im Scope:

- `events.project_id`
- `events.task_id`

Nicht im Scope:

- Tickets, Features, Use Cases, Backlog-Items oder Wiki-Seiten event-fähig machen
- Kalender-Layout oder FullCalendar-Grundverhalten neu gestalten
- neue Kalender-Features wie Wiederholungen, Einladungen oder Erinnerungen einführen

---

## Schritt 1: Bestandsaufnahme

Lies gezielt die Architekturvorgaben zu Owner-/Junction-Modellen, Versionierung und Tests:

- `docs/architecture-leitfaden.md`
- `agents.md`, Abschnitte Domänenarchitektur, Migrationsstrategie, Teststrategie

Lese dann alle betroffenen Dateien und erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| `schema.ts` | `events` enthält `projectId` und `taskId` | `events` ohne Owner-Spalten, neue Junction-Tabellen |
| `events.service.ts` | validiert und schreibt direkte FK-Spalten | schreibt Basis-Event plus Owner-Links |
| `events.ts` Route | Body erlaubt `projectId` und `taskId` | Body erlaubt `owners: EventOwner[]`, keine direkten Owner-Felder |
| Shared Types | `Event` und `EventInput` enthalten direkte IDs | `Event` enthält `owners: EventOwner[]` |
| Web EventForm | je ein Select für Projekt und Aufgabe | Owner-Auswahl für mehrere Projekte und Tasks |
| Tests | prüfen direkte IDs | prüfen Owner-DTO, Junctions, Migration und UI-Flows |

Dokumentiere außerdem:

- alle Suchtreffer für `events.projectId`, `events.taskId`, `project_id`, `task_id` im Event-Kontext
- welche Funktionen entfallen oder umbenannt werden
- welche Servicefunktionen neu entstehen, z. B. `linkEventOwner`, `unlinkEventOwner`, `listEventOwners`
- welche Tests angepasst werden müssen
- welche neuen Tests geschrieben werden müssen

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Schema & Migration

- Ergänze `events` um Architekturfelder, sofern noch nicht vorhanden:
  - `version`
  - `created_by`
  - `updated_by`
  - `created_at`
  - `updated_at`
- Lege `projectEvents` und `taskEvents` in `schema.ts` an.
- Jede Junction-Tabelle enthält:
  - `seedRunId`
  - Parent-ID (`projectId` oder `taskId`)
  - `eventId`
  - eindeutigen Index auf Parent-ID + `eventId`
  - FK-Cascade auf Parent und Event
- Erzeuge eine Migration via `drizzle-kit generate`.
- Migriere bestehende Daten verlustfrei:
  - `events.project_id IS NOT NULL` → `project_events`
  - `events.task_id IS NOT NULL` → `task_events`
- Verifiziere vor dem Drop:
  - Anzahl alter Project-Links entspricht Anzahl neuer `project_events`
  - Anzahl alter Task-Links entspricht Anzahl neuer `task_events`
  - alle Event-Records bleiben erhalten
- Entferne `events.project_id` und `events.task_id` erst nach erfolgreicher Verifikation aus dem aktiven Schema und per separater Drop-/Rebuild-Migration.
- Führe `npm run db:migrate -w apps/api` aus und prüfe anschließend das reale DB-Schema.

---

## Schritt 3: Shared Types & API-Vertrag

- Ergänze:
  - `EventOwner = { type: "project" | "task"; id: number }`
  - `Event.owners: EventOwner[]`
- Entferne aus dem finalen DTO:
  - `Event.projectId`
  - `Event.taskId`
  - `EventInput.projectId`
  - `EventInput.taskId`
- `EventInput` und `EventUpdate` verwenden `owners?: EventOwner[]`.
- Update-Routen verlangen strikt `expectedVersion`.
- URL-Struktur bleibt erhalten:
  - `GET /events`
  - `POST /events`
  - `GET /events/:id`
  - `PATCH /events/:id`
  - `DELETE /events/:id`
- Ergänze bei Bedarf explizite Link-/Unlink-Routen, ohne die bestehenden URLs zu brechen:
  - `POST /projects/:id/events/:eventId`
  - `DELETE /projects/:id/events/:eventId`
  - `POST /tasks/:id/events/:eventId`
  - `DELETE /tasks/:id/events/:eventId`

---

## Schritt 4: Service, Seed, Dump

- `mapEvent` liefert immer `owners: [...]`.
- `createEvent` schreibt den Event-Record und die Owner-Junctions transaktional.
- `updateEvent` aktualisiert Basisfelder nur mit gültigem `expectedVersion` und inkrementiert `version`.
- Owner-Änderungen ersetzen oder verlinken Junction-Einträge kontrolliert.
- Global Events mit leerem `owners`-Array bleiben zulässig.
- Entferne direkte Servicezugriffe auf alte Owner-Spalten.
- Entferne `ensureLinkedEntities(projectId, taskId)` und ersetze es durch ownerbasierte, typsichere Validierung oder FK-gestützte Junction-Operationen.
- Ergänze neue Junction-Tabellen in Dump-/Seed-Registries.
- Seed-Daten mit Event-Ownern schreiben Basis-Event und Junction-Zeilen.
- Bestehende Import-/Seed-/Dump-Tests dürfen nicht mehr auf direkte Event-Owner-Spalten zugreifen.

---

## Schritt 5: Web/UI

- `apps/web/src/api/events.ts` sendet und liest nur noch `owners`.
- `useEvents` bleibt TanStack-Query-basiert und invalidiert weiter zentral über `invalidateEvents`.
- `queryKeys.events` bleibt zentrale Quelle für Event-Keys; falls ownerbezogene Event-Listen entstehen, dort ergänzen.
- `EventForm` unterstützt mehrere Projekt- und Task-Owner.
- Bestehende globale Events ohne Owner müssen weiter erstellbar sein.
- `CalendarView` und `UpcomingEvents` dürfen keine direkten `projectId`-/`taskId`-Felder mehr voraussetzen.
- Farblogik wird aus `event.color` oder aus `owners` abgeleitet; bei mehreren Ownern muss die Regel einfach und getestet sein.
- Keine neue Kalenderfunktion außerhalb des Owner-Refactorings einführen.

---

## Schritt 6: Tests (verpflichtend, vor Abnahme vollständig)

### 6a — API-Integrationstests

Aktualisiere und erweitere:

- `apps/api/tests/integration/events.test.ts`
- `apps/api/tests/integration/delete-cascade.test.ts`
- `apps/api/tests/integration/dumps-drive.test.ts`
- `apps/api/src/app.integration.test.ts`, falls Event-Fixtures betroffen sind

Pflichtfälle:

- Event ohne Owner erstellen → `owners: []`
- Event mit Project-Owner erstellen → Eintrag in `project_events`, Response mit Owner
- Event mit Task-Owner erstellen → Eintrag in `task_events`, Response mit Owner
- Event mit Project- und Task-Owner erstellen → beide Junctions vorhanden
- Event an zweiten Project-Owner verknüpfen → beide Project-Owner bleiben erhalten
- Event von einem Owner lösen → Event bleibt bestehen
- Project löschen → `project_events` wird bereinigt, Event bleibt bestehen
- Task löschen → `task_events` wird bereinigt, Event bleibt bestehen
- Event löschen → alle Junction-Zeilen werden per FK-Cascade entfernt
- Migration überführt bestehende `project_id`-/`task_id`-Daten vollständig
- Response enthält keine direkten `projectId`-/`taskId`-DTO-Felder mehr
- Update mit korrekter `expectedVersion` → HTTP 200, Version inkrementiert
- Update ohne `expectedVersion` → HTTP 400
- Update mit veralteter `expectedVersion` → HTTP 409
- nicht existierender Owner → HTTP 404 oder klar dokumentiertes FK-Fehlerformat

### 6b — Web- und Komponenten-Tests

Aktualisiere oder ergänze:

- EventForm-Test für mehrere Project-/Task-Owner
- CalendarView-Test ohne direkte `projectId`-/`taskId`-Annahmen
- Hook-/Mutationstest für Event-Create, Event-Update und Owner-Änderung
- Fixture-Bereinigung: Event-Testdaten nutzen nur noch `owners`

### 6c — E2E-Tests

Aktualisiere oder ergänze:

- `apps/web/e2e/calendar.spec.ts` oder passende Event-Spec

Pflichtfälle:

- globalen Termin ohne Owner erstellen
- Termin mit Projekt-Owner erstellen und nach Speichern sichtbar sehen
- Termin mit Task-Owner erstellen und nach Speichern sichtbar sehen
- Termin mit mehreren Ownern bearbeiten
- Termin löschen und aus Kalender/Upcoming-Liste entfernt sehen

### 6d — Serieller Testlauf

Nach Umsetzung seriell ausführen und Ergebnis dokumentieren:

- `npm run build -w packages/shared-types`
- `npm run db:migrate -w apps/api`
- `npm run test -w apps/api`
- `npm run test -w apps/web`
- `npm run build -w apps/web`
- `npm run e2e -w apps/web`

Fehlschläge während des Testlaufs nicht ad hoc reparieren. Erst den Lauf vollständig beenden, Fehler gruppieren und danach gezielt beauftragt oder geplant beheben.

---

## Abnahmekriterien

- [ ] Bestandsaufnahme mit Ist/Soll-Tabelle liegt vor
- [ ] `events` enthält keine direkten Owner-Spalten mehr
- [ ] `project_events` und `task_events` existieren mit FK-Cascade und Unique-Indizes
- [ ] bestehende Event-Owner wurden verlustfrei in Junction-Tabellen migriert
- [ ] `Event` und `EventInput` enthalten keine `projectId`-/`taskId`-DTO-Felder mehr
- [ ] `Event` liefert `owners: EventOwner[]`
- [ ] globale Events ohne Owner funktionieren weiterhin
- [ ] Event-Updates verlangen strikt `expectedVersion`
- [ ] API-Tests decken CRUD, Owner-Junctions, Cascade-Unlink und Optimistic Locking ab
- [ ] Web-Tests decken Event-DTOs und Owner-Auswahl ab
- [ ] E2E-Tests decken globale und ownerbasierte Events ab
- [ ] Dump-/Seed-Registries enthalten die neuen Junction-Tabellen
- [ ] keine aktiven Suchtreffer auf `events.projectId`, `events.taskId`, `events.project_id` oder `events.task_id` außerhalb historischer Migrationen/Logs
- [ ] vollständiger serieller Testlauf ist grün oder Blocker sind konkret dokumentiert
- [ ] Schritt-Log wurde geschrieben und `logs/README.md` aktualisiert

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Schema: `apps/api/src/db/schema.ts`
- Events-Service: `apps/api/src/services/events.service.ts`
- Events-Route: `apps/api/src/routes/events.ts`
- Shared Types: `packages/shared-types/src/index.ts`
- Web API: `apps/web/src/api/events.ts`
- Web Hook: `apps/web/src/hooks/useEvents.ts`
- EventForm: `apps/web/src/components/calendar/EventForm.tsx`
- CalendarView: `apps/web/src/components/calendar/CalendarView.tsx`
- Integration-Tests: `apps/api/tests/integration/events.test.ts`
- Cascade-Tests: `apps/api/tests/integration/delete-cascade.test.ts`
- E2E-Tests: `apps/web/e2e/`
