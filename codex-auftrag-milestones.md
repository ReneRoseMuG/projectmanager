# Codex-Auftrag: Milestones — Neue Entität ins Datenmodell integrieren

## Ziel

Das Datenmodell wird um eine neue Entität `Milestone` erweitert. Meilensteine gehören zu einem Projekt (1:n) und erhalten dieselben n:m-Beziehungen wie Projekte: Tasks, Notes, Comments, Attachments, Tickets, Features und Tags.

---

## Kontext

- **Betroffene Schicht:** `schema.ts`, `shared-types/index.ts`, sowie alle daraus ableitbaren Repository- und Service-Dateien
- **Leitprinzip:** Alle bestehenden Entitäten folgen dem gleichen Muster. Milestones schließen sich nahtlos daran an — ohne Ausnahmen oder Abkürzungen.
- **Achtung:** Zum Zeitpunkt dieses Auftrags läuft ein Cleanup von Legacy-Spalten, insbesondere in den `comments`- und `attachments`-Tabellen. Codex soll den **aktuellen Zustand der Codebase** als Referenz nehmen und keine alten Muster übernehmen, die bereits entfernt wurden.

---

## Aufgabe

### 1. Neue Tabelle `milestones`

Neue Tabelle nach dem etablierten Muster anlegen. Pflichtfelder orientieren sich an `projects`. Statuswerte: vorhandene `PROJECT_STATUSES` wiederverwenden.

Die Zugehörigkeit zu einem Projekt wird über eine direkte FK-Spalte `project_id` auf der `milestones`-Tabelle abgebildet (1:n).

### 2. Junction-Tabellen

Für jede der folgenden Beziehungen eine eigene Junction-Tabelle anlegen — strikt analog zu den `project_*`-Tabellen:

- `milestone_tasks`
- `milestone_notes`
- `milestone_comments`
- `milestone_attachments`
- `milestone_tickets`
- `milestone_features`
- `milestone_tags`

Alle Junction-Tabellen folgen dem bestehenden Muster (Unique-Index, `onDelete: cascade`, `seedRunId` etc.).

### 3. Anpassungen an bestehenden Strukturen

- `events`-Tabelle: optionale FK-Spalte `milestone_id` ergänzen (analog zu `project_id` und `task_id`)
- `shared-types/index.ts`: Typen, Input- und Update-Interfaces für `Milestone` anlegen — vollständig analog zu `Project`

### 4. Migration

Eine neue Drizzle-Migration für alle Schemaänderungen erstellen.

---

## Regeln & Einschränkungen

- Kein Erfinden neuer Muster — ausschließlich das in der Codebase vorhandene Schema-Muster verwenden
- Kein direkter Zugriff auf verwandte Entitäten außerhalb von Junction-Tabellen
- `PROJECT_STATUSES` wird für Milestones wiederverwendet — kein neuer Status-Typ
- Die `events`-Verknüpfung ist optional (`set null` bei Delete)
- Den aktuellen (bereinigten) Stand von `comments` und `attachments` als Referenz nehmen

---

## Seiteneffekte

- Die `events`-Tabelle bekommt eine neue optionale Spalte — `EventInput` und `EventUpdate` in shared-types entsprechend anpassen

---

## Testhinweise

- Prüfen, ob ein Milestone einem Projekt zugeordnet werden kann
- Prüfen, ob alle Junction-Tabellen korrekt mit `cascade`-Delete arbeiten
- Prüfen, ob `milestone` als `CommentEntityType` korrekt akzeptiert wird
- Prüfen, ob ein Attachment mit Owner-Typ `milestone` korrekt gespeichert und abgerufen werden kann
- Prüfen, ob ein Event optional einem Milestone zugeordnet werden kann
