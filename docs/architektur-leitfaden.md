# Architektur-Leitfaden: Datenmodell & Schichtarchitektur

Dieses Dokument definiert die verbindlichen Regeln für Datenmodell, Beziehungsstruktur und Schichtarchitektur des Projekt Managers. Es dient Codex als Referenz für Bestandsaufnahmen und Refactoring-Aufgaben.

---

## 1. Objektklassifizierung

### Fachobjekte
Objekte mit eigenem fachlichem Lebenszyklus, Zustand und Geschäftsregeln. Ihre gegenseitigen Beziehungen werden durch dedizierte Junction-Tabellen mit DB-nativen FK-Constraints und Kaskaden abgebildet.

| Objekt | Tabelle |
|---|---|
| Project | `projects` |
| Task | `tasks` |
| Feature | `features` |
| UseCase | `use_cases` |
| Ticket | `tickets` |
| WikiPage | `wiki_pages` |
| BacklogItem | `backlog_items` |

### Support-Objekte
Objekte ohne eigenen fachlichen Lebenszyklus, die an beliebig viele Fachobjekte gebunden sein können. Auch ihre Beziehungen werden durch dedizierte Junction-Tabellen abgebildet — niemals durch polymorphe `entityType`/`entityId`-Felder und niemals durch nullable FKs mit CHECK-Constraints.

| Objekt | Tabelle | Beziehungsart |
|---|---|---|
| Comment | `comments` | n:m — ein Comment kann an mehreren Parents hängen |
| Attachment | `attachments` | n:m — ein Dokument kann an mehreren Parents hängen |
| Note | `notes` | n:m — eine Note kann an mehreren Parents hängen |
| Tag | `tags` | n:m — ein Tag kann an mehreren Parents hängen |

### Projektgebundene Begleitobjekte
Objekte mit eigenem versioniertem Lebenszyklus, die in strikter 1:1-Bindung zu genau einem Fachobjekt stehen. Sie werden über einen direkten `notNull`-FK auf den Parent mit `onDelete: "cascade"` plus Unique-Index auf der Parent-Spalte angebunden — **kein** Junction (da nicht n:m) und **kein** polymorpher Owner.

| Objekt | Tabelle | Beziehungsart |
|---|---|---|
| DiaryEntry | `diary_entries` | 1:1 zu Project — genau ein lebender, versionierter Eintrag je Projekt |

---

## 2. Beziehungsmodell

### Regel 1: Fachliche Beziehungen (Fachobjekt ↔ Fachobjekt)
Dedizierte Junction-Tabellen mit:
- FK auf beide Seiten mit `onDelete: "cascade"`
- `position: real` für die Sortierung innerhalb des Owners
- Unique-Index auf `(ownerId, objectId)`

Beispiele (bereits korrekt implementiert):
`project_tasks`, `feature_tasks`, `use_case_tasks`, `project_features`, `project_tickets`, `feature_tickets`, `use_case_tickets`, `task_tickets`

### Regel 2: Support-Objekte (Support ↔ Fachobjekt)
Für jeden Parent-Typ eines Support-Objekts eine eigene Junction-Tabelle:
- FK auf Parent mit `onDelete: "cascade"` → DB löscht den Junction-Eintrag automatisch
- FK auf Support-Objekt mit `onDelete: "cascade"` → DB löscht das Support-Objekt wenn kein Parent mehr existiert
- Kein `position`-Feld (Support-Objekte werden nach `createdAt` sortiert)

**Comment-Junction-Tabellen (vollständige Liste):**
`task_comments`, `project_comments`, `feature_comments`, `use_case_comments`, `backlog_item_comments`, `wiki_page_comments`, `ticket_comments`

**Attachment-Junction-Tabellen:**
`task_attachments`, `project_attachments`, `feature_attachments`, `ticket_attachments`

**Note-Junction-Tabellen:**
`task_notes`, `project_notes`, `ticket_notes`
*(bereits vorhanden — Benennung und FK-Semantik prüfen)*

**Tag-Junction-Tabellen:**
`task_tags`, `project_tags`, `ticket_tags`
*(bereits vorhanden — Benennung und FK-Semantik prüfen)*

### Verbotene Muster
- **Polymorphe Felder**: `entityType: text + entityId: integer` ohne FK sind verboten. Dieses Muster erzwingt manuelle Existenzprüfungen im Service und verhindert DB-native Kaskaden.
- **Nullable-FK mit CHECK**: `projectId?/taskId?/featureId?` mit `CHECK(genau einer gesetzt)` ist verboten. Dieses Muster verhindert n:m und ist nicht erweiterbar.
- **Manueller Cascade im Service**: `deleteCommentsForEntity()`, `deleteAttachmentsForIds()` o.ä. als Ersatz für DB-Kaskaden sind verboten, sobald die Junction-Tabellen existieren.

**Ausnahme (erlaubt):** Ein direkter, `notNull` Single-Parent-FK ist bei striktem 1:1 zulässig und fällt nicht unter das Polymorphie-/Nullable-FK-Verbot — Beispiel `diary_entries.project_id` (genau ein Tagebuch je Projekt, Unique-Index auf `project_id`, `onDelete: "cascade"`). Dieses Muster ist Projektgebundenen Begleitobjekten (§1) vorbehalten und ersetzt **nicht** die Junction-Regeln für Fach- und Support-Objekte.

---

## 3. Infrastrukturelle Querschnittsfelder

### users-Tabelle
Es gibt eine zentrale `users`-Tabelle als Basis für zukünftigen Multi-User-Support und Auditing. Die Authentifizierungs- und Autorisierungsfunktionalität ist bewusst noch nicht implementiert — die Tabelle existiert, damit FKs und Migrations sauber eingeführt werden können.

```
users
  id          integer  PK autoincrement
  name        text     NOT NULL
  email       text     NOT NULL UNIQUE
  version     integer  NOT NULL DEFAULT 1
  createdAt   text     NOT NULL DEFAULT now
  updatedAt   text     NOT NULL DEFAULT now
```

Die `users`-Tabelle bekommt kein `createdBy`/`updatedBy` (Bootstrap-Problem: der erste User kann sich nicht selbst referenzieren).

### Pflichtfelder auf allen Fach- und Support-Objekt-Tabellen
Jede Tabelle der Klassen Fachobjekte und Support-Objekte trägt einheitlich folgende Spalten:

| Spalte | Typ | Default | Bedeutung |
|---|---|---|---|
| `version` | `integer NOT NULL` | `1` | Optimistic Locking — wird bei jedem Update inkrementiert |
| `created_by` | `integer NULL` | `NULL` | FK → `users.id`, `onDelete: "set null"` |
| `updated_by` | `integer NULL` | `NULL` | FK → `users.id`, `onDelete: "set null"` |
| `created_at` | `text NOT NULL` | `datetime('now')` | Erstellungszeitpunkt |
| `updated_at` | `text NOT NULL` | `datetime('now')` | Letzter Änderungszeitpunkt |

**Junction-Tabellen** bekommen diese Spalten **nicht** — eine Verknüpfung wird gesetzt oder entfernt, nicht versioniert.

**Hinweis zum aktuellen Ist-Zustand:** `tags` hat weder `created_at` noch `updated_at`. `comments` hat kein `updated_at`. `attachments` hat kein `updated_at`. Keines der Objekte hat bisher `version`, `created_by` oder `updated_by`. Alle fehlenden Spalten sind durch Codex zu ergänzen und per Drizzle-Migration einzuspielen.

---

## 4. Schichtarchitektur

### Stack
```
Fastify Routes → Services → Repositories → Drizzle ORM → MySQL
```

### Repository-Layer
Zwischen Services und Drizzle gibt es eine Repository-Schicht in `apps/api/src/repositories/`. Jedes Fach- und Support-Objekt hat ein eigenes Repository.

**BaseRepository** stellt die gemeinsame Version-Prüflogik bereit:

```ts
// apps/api/src/repositories/base.repository.ts

export class VersionConflictError extends Error {
  constructor(readonly expected: number, readonly actual: number) {
    super(`Version conflict: expected ${expected}, actual ${actual}`);
  }
}

export function assertVersion(current: number, expected: number): void {
  if (current !== expected) throw new VersionConflictError(expected, current);
}
```

**Konkrete Repositories** implementieren die Standard-CRUD-Operationen:

```ts
// Schnittstelle jedes Entity-Repository
findById(db, id): Entity | undefined
findAll(db): Entity[]
create(db, data, userId?): Entity        // setzt version=1, createdBy/updatedBy=userId
update(db, id, expectedVersion, data, userId?): Entity  // prüft version, inkrementiert, setzt updatedBy/updatedAt
delete(db, id): void
```

Beim `update` prüft das Repository die Version vor dem Schreiben und wirft `VersionConflictError` (HTTP 409) bei Abweichung. Services fangen diesen Fehler ab und leiten ihn als 409-Response weiter.

Domain-spezifische Abfragen (`findByProject`, `findByFeature`, `findByStatus` usw.) gehören ebenfalls ins konkrete Repository, nicht in den Service.

**Repositories leben in:** `apps/api/src/repositories/{entity}.repository.ts`

**Vollständige Liste der anzulegenden Repositories:**
`project`, `task`, `feature`, `use-case`, `ticket`, `wiki-page`, `backlog-item`, `comment`, `note`, `tag`, `attachment`

### Services
Services enthalten Geschäftslogik und orchestrieren Repository-Aufrufe. Sie greifen nicht mehr direkt auf Drizzle zu, sondern ausschließlich über Repositories. Junction-Tabellen-Operationen (Verknüpfungen setzen/lösen) bleiben vorerst im Service, bis ein eigener Junction-Layer sinnvoll wird.

### Routes: pro Parent-Objekt, verschachtelte URLs
Jeder Fachobjekt-Router registriert Routen für alle seine zugehörigen Support-Objekte und Relationen. Die URL-Struktur folgt dem Parent:

```
GET    /projects/:id/comments
POST   /projects/:id/comments
GET    /tasks/:id/attachments
POST   /tasks/:id/attachments
DELETE /attachments/:id
DELETE /comments/:id
```

Ein Router für ein Support-Objekt (`comments.ts`, `attachments.ts`) enthält keine eigene CRUD-Basis-Route — er stellt nur Zugriff über den Parent bereit. Direktes Löschen per `:id` ist erlaubt.

### Benennungskonvention

```ts
// Repository-Methoden
projectRepository.findById(db, id)
projectRepository.create(db, data, userId?)
projectRepository.update(db, id, expectedVersion, data, userId?)

// Service-Funktionen (weiterhin funktionsbasiert)
listTaskComments(db, taskId)
createTaskComment(db, taskId, input, userId?)
deleteComment(db, id)
```

---

## 5. Ist-Zustand und bekannter Änderungsbedarf

Codex führt vor jeder Refactoring-Aufgabe eine Bestandsaufnahme durch und dokumentiert die Delta-Liste. Die folgenden Punkte sind bereits identifiziert:

**Schema (`apps/api/src/db/schema.ts`):**
- `users`-Tabelle fehlt vollständig — anlegen
- `version`, `created_by`, `updated_by` fehlen auf allen Entity-Tabellen — ergänzen
- `updated_at` fehlt auf `comments`, `tags`, `attachments` — ergänzen
- `created_at` fehlt auf `tags` — ergänzen
- `comments`: Felder `entityType`, `entityId`, `taskId` müssen durch Junction-Tabellen ersetzt werden
- `attachments`: Felder `projectId?`, `taskId?`, `featureId?`, `ticketId?` + CHECK-Constraint müssen durch Junction-Tabellen ersetzt werden

**Repositories (`apps/api/src/repositories/`):**
- Verzeichnis und alle Repository-Dateien fehlen vollständig — anlegen

**Services:**
- `comments.service.ts`: `ensureEntityExists()`-Switch entfernen, `deleteCommentsForEntity()` / `deleteCommentsForEntities()` entfernen, Junction-basierte Implementierung, Repository-Aufrufe einführen
- `attachments.service.ts`: nullable FK Queries durch Junction-Queries ersetzen, n:m-fähige Datei-Cleanup-Logik, Repository-Aufrufe einführen
- Alle übrigen Services: Drizzle-Direktzugriffe schrittweise durch Repository-Aufrufe ersetzen
- Alle Parent-Services (projects, tasks, features, tickets, use-cases, backlog, wiki), die aktuell `deleteCommentsForEntity()` oder `deleteAttachmentsForIds()` aufrufen: diese Aufrufe entfernen

**Routes:**
- `comments.ts`, `attachments.ts`: Routen-Registrierung anpassen, Parent-Kontext explizit übergeben

**Migrations:**
- `users`-Tabelle anlegen
- Neue Pflichtfelder (`version`, `created_by`, `updated_by`, fehlende Timestamps) auf alle Entity-Tabellen
- Neue Junction-Tabellen für Comment und Attachment
- Datenmigration: bestehende Datensätze in neue Junction-Tabellen überführen, dann veraltete Spalten droppen

---

## 6. Standard-Refactoring-Aufgabe

Jede Refactoring-Aufgabe, die aus diesem Leitfaden entsteht, folgt diesem Schema:

### Schritt 1: Bestandsaufnahme
Codex liest alle betroffenen Dateien (Schema, Repositories, Services, Routes, Tests) und erstellt eine Ist/Soll-Tabelle: welche Funktionen existieren, welche müssen geändert werden, welche müssen neu erstellt werden, welche fallen weg.

### Schritt 2: Schema & Migration
- Neue Tabellen und Spalten in `schema.ts` anlegen
- Migration via `drizzle-kit generate` erzeugen
- Datenmigration für bestehende Datensätze (keine Datenverluste)
- Veraltete Spalten in separater Migration droppen (nach Verifikation)

### Schritt 3: Repository-Implementierung
- `BaseRepository` mit `VersionConflictError` und `assertVersion` anlegen
- Konkrete Repositories für alle betroffenen Entities anlegen
- Standard-CRUD mit Version-Logik implementieren
- Domain-spezifische Abfragen in konkrete Repositories übernehmen

### Schritt 4: Service-Anpassung
- Drizzle-Direktzugriffe durch Repository-Aufrufe ersetzen
- Junction-basierte Queries für Comment und Attachment implementieren
- Veraltete manuelle Cascade-Funktionen entfernen
- `VersionConflictError` als HTTP 409 weiterleiten

### Schritt 5: Route-Anpassung
- Parent-Router registrieren die neuen Service-Funktionen
- URL-Struktur bleibt erhalten (keine Breaking Changes an der API)
- `expectedVersion` aus Request-Body bei Update-Routen entgegennehmen

### Abnahmekriterien
- [ ] `users`-Tabelle existiert
- [ ] Alle Entity-Tabellen haben `version`, `created_by`, `updated_by`, `created_at`, `updated_at`
- [ ] Schema entspricht dem Leitfaden (keine polymorphen Felder, keine nullable-FK-with-CHECK)
- [ ] Alle Repository-Klassen existieren und implementieren Standard-CRUD mit Version-Prüfung
- [ ] Kein Service greift direkt auf Drizzle zu (außer Junction-Operationen, solange kein Junction-Layer existiert)
- [ ] Kein Service enthält manuelle Cascade-Aufrufe als FK-Ersatz
- [ ] Kein Service enthält `ensureEntityExists()`-Switches als FK-Ersatz
- [ ] Alle bestehenden Datensätze sind korrekt migriert
- [ ] Alle Integration-Tests grün
- [ ] Alle E2E-Tests grün

---

## 7. Test-Regime

### Integration-Tests (Vitest + supertest, echte MySQL-DB)
Für jede neue oder geänderte Beziehung:

**CRUD:**
- Support-Objekt über Parent erstellen → in Liste des Parents sichtbar
- Support-Objekt über zweiten Parent verknüpfen → in Liste beider Parents sichtbar (n:m)
- Support-Objekt direkt löschen → aus allen Parent-Listen verschwunden, Datensatz gelöscht
- 404 bei nicht existierendem Parent

**Kaskaden:**
- Parent löschen → Junction-Eintrag automatisch entfernt
- Letzter Parent gelöscht → Support-Objekt-Record gelöscht (bei Attachment: Datei gelöscht)
- Attachment: wenn ein Parent gelöscht wird, aber ein zweiter noch existiert → Datei bleibt erhalten

**Optimistic Locking:**
- Update mit korrekter Version → erfolgreich, Version inkrementiert
- Update mit veralteter Version → HTTP 409
- Gleichzeitiges Update desselben Datensatzes → zweites Update liefert 409

**Regression:**
- `delete-cascade.test.ts` erweitern um alle neuen Junction-Beziehungen

### E2E-Tests (Playwright)
Für jede geänderte oder neue Beziehung:

**Attachment (n:m):**
- Dokument an Task A hochladen → in Task-A-Tab sichtbar
- Dasselbe Dokument an Task B verknüpfen → in Task-B-Tab sichtbar, in Task-A-Tab weiterhin sichtbar
- Task A löschen → Attachment in Task-B-Tab weiterhin sichtbar

**Comment:**
- Comment an Task erstellen → in Comment-Tab sichtbar, Zähler aktualisiert
- Parent (Task) löschen → Comment verschwindet, kein Orphan in der DB

**Allgemein:**
- CRUD-Operationen auf Listen und Boards: Hinzufügen/Entfernen von verknüpften Objekten aktualisiert die Ansicht ohne Reload
- Verknüpfte Teilmengen in Tabs (z.B. Tasks-Tab eines Features) spiegeln Änderungen sofort wider
