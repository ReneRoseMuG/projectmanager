# Audit: Lösch-Kaskadierung — Projekt Manager

Datum: 2026-05-17  
Geprüfte Dateien: `apps/api/src/db/schema.ts`, alle `apps/api/src/services/*.service.ts`

---

## Methodik

Für jede Entität wurde geprüft:
1. Was löscht die DB automatisch via `onDelete: cascade` / `set null` / `restrict`?
2. Was macht die Service-Funktion explizit?
3. Was bleibt übrig (Datenbank-Leichen, Dateisystem-Reste)?

---

## Gefundene Lücken

---

### 🔴 BUG 1 — Orphaned Comments (KRITISCH)

**Betrifft:** `deleteProject`, `deleteFeature`, `deleteUseCase`, `deleteBacklogItem`, `deleteWikiPage`, `deleteTicket`

**Problem:**  
Die `comments`-Tabelle verwendet ein duales Referenzmuster:
- `task_id` → FK mit `onDelete: cascade` (nur für Tasks)
- `entity_type` + `entity_id` → polymorphisch, **kein FK, kein Cascade**

Bei der Erstellung wird gesetzt: `taskId = entityType === "task" ? entityId : null`

Das bedeutet: Task-Kommentare werden korrekt via FK-Cascade gelöscht wenn der Task gelöscht wird ✅.  
Alle anderen Kommentare bleiben als Datenmüll in der DB:

| Gelöschte Entität | entityType der Kommentare | Wird gelöscht? |
|---|---|---|
| Task | `"task"` | ✅ via `task_id` FK |
| Project | `"project"` | ❌ **NEIN** |
| Feature | `"feature"` | ❌ **NEIN** |
| UseCase | `"useCase"` | ❌ **NEIN** |
| BacklogItem | `"backlogItem"` | ❌ **NEIN** |
| WikiPage | `"wikiPage"` | ❌ **NEIN** |
| Ticket | `"ticket"` | ❌ **NEIN** |

Außerdem: Wenn ein **Projekt** gelöscht wird, werden indirekt BacklogItems gelöscht — deren Kommentare (entityType="backlogItem") bleiben jedoch ebenfalls verwaist.

**Fix:** Vor dem Löschen der Entität explizit Kommentare löschen:

```ts
// In deleteProject:
database.delete(comments).where(and(eq(comments.entityType, "project"), eq(comments.entityId, id))).run();

// In deleteFeature:
database.delete(comments).where(and(eq(comments.entityType, "feature"), eq(comments.entityId, id))).run();
// Auch für UseCases der Feature:
const useCaseIds = database.select({ id: useCases.id }).from(useCases).where(eq(useCases.featureId, id)).all();
for (const uc of useCaseIds) {
  database.delete(comments).where(and(eq(comments.entityType, "useCase"), eq(comments.entityId, uc.id))).run();
}

// In deleteTicket (inkl. Sub-Tickets via Rekursion oder inArray):
database.delete(comments).where(and(eq(comments.entityType, "ticket"), eq(comments.entityId, id))).run();

// In deleteProject: auch BacklogItem-Kommentare der Projekt-BacklogItems vorab löschen
```

Alternativ: `entity_id` als echte FK-Spalte pro Entity-Typ aufsplitten oder einen DB-Trigger ergänzen.

---

### 🔴 BUG 2 — Orphaned Notes (KRITISCH)

**Betrifft:** `deleteProject`, `deleteTask`, `deleteTicket`

**Problem:**  
`notes` sind eigenständige Datensätze, die über Join-Tabellen (`project_notes`, `task_notes`, `ticket_notes`) mit Eltern verknüpft sind. Beide FK-Seiten dieser Join-Tabellen haben `onDelete: cascade`. Das bedeutet:

- Wird ein **Projekt** gelöscht → `project_notes`-Zeilen cascade-gelöscht ✅ — aber `notes`-Record bleibt ❌
- Wird ein **Task** gelöscht → `task_notes`-Zeilen cascade-gelöscht ✅ — aber `notes`-Record bleibt ❌  
- Wird ein **Ticket** gelöscht → `ticket_notes`-Zeilen cascade-gelöscht ✅ — aber `notes`-Record bleibt ❌

Bei `deleteProject` sind sogar drei Ebenen betroffen: die Projekt-Notes selbst, die Notes der Projekt-Tasks sowie die Notes der Projekt-Tickets.

`deleteTicketNote` (notes.service.ts) macht es richtig — es löscht zuerst den Join-Eintrag, dann die Note selbst. Diese Logik fehlt bei automatischen Kaskadierungen.

**Fix:** Vor dem Löschen der Elternentität die Note-IDs abfragen und explizit löschen:

```ts
// In deleteProject:
const projectNoteIds = database.select({ noteId: projectNotes.noteId }).from(projectNotes).where(eq(projectNotes.projectId, id)).all();
database.delete(notes).where(inArray(notes.id, projectNoteIds.map(n => n.noteId))).run();

// Analog für taskNotes (alle Tasks des Projekts) und ticketNotes (alle Tickets des Projekts)

// In deleteTask:
const taskNoteIds = database.select({ noteId: taskNotes.noteId }).from(taskNotes).where(eq(taskNotes.taskId, id)).all();
database.delete(notes).where(inArray(notes.id, taskNoteIds.map(n => n.noteId))).run();

// In deleteTicket:
const ticketNoteIds = database.select({ noteId: ticketNotes.noteId }).from(ticketNotes).where(eq(ticketNotes.ticketId, id)).all();
database.delete(notes).where(inArray(notes.id, ticketNoteIds.map(n => n.noteId))).run();
```

---

### 🟠 BUG 3 — Physische Attachment-Dateien bleiben auf dem Dateisystem (HOCH)

**Betrifft:** `deleteProject`, `deleteTask`, `deleteTicket`, `deleteFeature`

**Problem:**  
`deleteAttachment()` in `attachments.service.ts` macht es richtig: DB-Record löschen → `fs.rm()` → `removeAttachmentPreviews()`. Wenn jedoch eine Elternentität gelöscht wird, werden die `attachments`-DB-Records über `onDelete: cascade` entfernt, aber **die physischen Dateien im Upload-Verzeichnis und deren Previews bleiben zurück**.

Betroffene Cascade-Pfade:
- `deleteProject` → tasks cascade → attachments cascade (Dateien bleiben)
- `deleteProject` → tickets cascade → attachments cascade (Dateien bleiben)
- `deleteProject` → attachments cascade direkt (Dateien bleiben)
- `deleteTask` → attachments cascade (Dateien bleiben)
- `deleteTicket` → attachments cascade (Dateien bleiben)
- `deleteFeature` → attachments cascade (Dateien bleiben)

**Fix:** Vor dem DB-Delete alle Attachment-Filenames abfragen und Dateien + Previews löschen:

```ts
// Hilfsfunktion (kann in attachments.service.ts ergänzt werden):
export async function deleteAttachmentsForEntity(
  database: DbClient,
  condition: SQL
): Promise<void> {
  const records = database.select({ id: attachments.id, filename: attachments.filename })
    .from(attachments).where(condition).all();
  for (const rec of records) {
    const diskPath = path.join(config.uploadDir, rec.filename);
    await fs.rm(diskPath, { force: true });
    await removeAttachmentPreviews(rec.id);
  }
}

// In deleteProject (vor database.delete(projects)):
await deleteAttachmentsForEntity(database, eq(attachments.projectId, id));
// Auch für alle Task- und Ticket-Attachments des Projekts
```

---

### 🟡 BUG 4 — `setFeatureRelations` löscht nur ausgehende Relationen (MITTEL)

**Betrifft:** `doc-links.service.ts` → `setFeatureRelations`

**Problem:**  
Beim "Reset" einer Feature's Relationen werden nur Einträge gelöscht, wo die Feature als `source_feature_id` steht:

```ts
// Zeile 336:
tx.delete(featureRelations).where(eq(featureRelations.sourceFeatureId, featureId)).run();
```

Eingehende Relationen anderer Features (wo diese Feature `target_feature_id` ist) bleiben bestehen. Wenn Feature A "depends_on" Feature B hat und man `setFeatureRelations(B, [])` aufruft, bleibt die Relation A→B in der DB erhalten.

**Hinweis:** Beim eigentlichen `deleteFeature` ist dies kein Problem, da das Schema für `featureRelations` auf **beiden Seiten** `onDelete: cascade` definiert hat. Das Problem betrifft nur den "Ersetzen"-Workflow.

**Fix:** In `setFeatureRelations` auch eingehende Relationen löschen:

```ts
database.transaction((tx) => {
  tx.delete(featureRelations).where(
    or(
      eq(featureRelations.sourceFeatureId, featureId),
      eq(featureRelations.targetFeatureId, featureId)
    )
  ).run();
  // ... dann neu einfügen
});
```

---

## Gesamtübersicht: Lösch-Vollständigkeit je Service-Funktion

| Service-Funktion | DB-Cascade OK | Comments OK | Notes OK | Dateisystem OK |
|---|---|---|---|---|
| `deleteProject` | ✅ | ❌ project, backlogItem | ❌ project/task/ticket-Notes | ❌ Dateien bleiben |
| `deleteTask` | ✅ | ✅ (via taskId-FK) | ❌ task-Notes | ❌ Dateien bleiben |
| `deleteFeature` | ✅ | ❌ feature, useCase | — (keine Feature-Notes) | ❌ Dateien bleiben |
| `deleteUseCase` | ✅ | ❌ useCase | — | ✅ |
| `deleteTicket` | ✅ | ❌ ticket | ❌ ticket-Notes | ❌ Dateien bleiben |
| `deleteBacklogItem` | ✅ | ❌ backlogItem | — | — |
| `deleteWikiPage` | ✅ | ❌ wikiPage | — | ✅ |
| `deleteNote` | ✅ | — | ✅ | — |
| `deleteTag` | ✅ | — | — | — |
| `deleteEvent` | ✅ | — | — | — |
| `deleteAttachment` | ✅ | — | — | ✅ |

---

## Was korrekt funktioniert (Positivbefunde)

- **Join-Tabellen für Tags** (`project_tags`, `task_tags`, `ticket_tags`): alle mit `onDelete: cascade` — werden sauber gelöscht ✅
- **Sub-Tasks / Sub-Tickets**: `parentId` mit `onDelete: cascade` → rekursiv korrekt ✅
- **featureRelations beim Feature-Delete**: beide Seiten (source + target) haben cascade ✅
- **taskFeatures, taskUseCases, projectFeatures**: alle Join-Tabellen mit cascade korrekt definiert ✅
- **useCases beim Feature-Delete**: cascade + Content-Datei-Bereinigung ✅
- **wikiPages parentId**: `onDelete: restrict` verhindert korrekterweise das Löschen von Seiten mit Kindern ✅
- **deleteTicketNote**: löscht korrekt zuerst Join-Eintrag, dann Note ✅
- **backlogItems.featureId / useCaseId**: `onDelete: set null` — korrekt, BacklogItems bleiben erhalten ✅
- **events.projectId / taskId**: `onDelete: set null` — Events bleiben erhalten, Referenz wird genullt ✅
