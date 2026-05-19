# Codex-Aufgabe: Repository-Migration Support und Infrastruktur

## Aufgabenbeschreibung
Migriere die verbleibenden Support- und Infrastrukturservices auf den Repository-Layer oder dokumentiere ausdrücklich, warum einzelne Drizzle-Zugriffe als Junction-, Admin- oder Infrastrukturzugriffe im Service verbleiben dürfen. Ziel ist, den breit gewählten Scope "alle Services" abzuschließen.

## Scope
Betroffen sind:
- `apps/api/src/repositories/comment.repository.ts`
- `apps/api/src/repositories/attachment.repository.ts`
- `apps/api/src/repositories/note.repository.ts`
- `apps/api/src/repositories/tag.repository.ts`
- optionale Repositories für `events`, `seed_runs` oder Admin-Objekte, falls sie nach Bestandsaufnahme als Entity-Repositories sinnvoll sind
- `apps/api/src/services/comments.service.ts`
- `apps/api/src/services/attachments.service.ts`
- `apps/api/src/services/attachment-preview.service.ts`
- `apps/api/src/services/notes.service.ts`
- `apps/api/src/services/tags.service.ts`
- `apps/api/src/services/events.service.ts`
- `apps/api/src/services/seed-data.service.ts`
- `apps/api/src/services/dump.service.ts`
- `apps/api/src/services/doc-links.service.ts`, soweit noch direkte CRUD-Zugriffe übrig sind
- `apps/api/src/routes/tags.ts`
- `apps/api/src/routes/notes.ts`
- `apps/api/src/routes/events.ts`
- `apps/api/src/routes/attachments.ts`
- `packages/shared-types/src/index.ts`
- zugehörige Web-API-Clients, Hooks, Query-Keys und Tests

Abhängigkeiten:
- Aufgabe 02 abgeschlossen.
- Aufgabe 05 abgeschlossen.
- Aufgabe 03 abgeschlossen für Comments.
- Aufgabe 04 abgeschlossen für Attachments.
- Aufgaben 06 und 07 abgeschlossen, damit Parent-Repositories verfügbar sind.

Nicht im Scope:
- Erneuter Umbau der bereits migrierten Kern-Domain-Services.
- Neue Support-Objekt-Typen.
- Authentifizierung oder echte User-Auswahl.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lies zunächst den Architektur-Leitfaden vollständig:
`docs/architecture-leitfaden.md`

Lese dann alle betroffenen Dateien und erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| Support-Services | Direkte Drizzle-Zugriffe | Entity-CRUD über Repositories, Junction im Service |
| Infrastrukturservices | Direkte Drizzle-Zugriffe für Admin-/Importflüsse | Geklärt: Repository oder dokumentierte Ausnahme |
| Routes | Updates ohne `expectedVersion`, falls updatefähig | Updates mit verpflichtender `expectedVersion` |
| Shared Types | DTOs teils ohne `version` oder neue Owner-Struktur | DTOs passend zum Zielmodell |
| Tests | Alte Annahmen zu Support-Objekten | CRUD, n:m, Cascade und Version-Konflikte abgesichert |

Dokumentiere außerdem:
- Alle verbleibenden direkten Drizzle-Zugriffe pro Service.
- Welche davon entfernt werden.
- Welche als erlaubte Junction- oder Admin-Ausnahme bleiben.
- Warum jede Ausnahme zulässig ist.

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Schema & Migration

Keine neue Schemaänderung, sofern Aufgaben 02, 03 und 04 vollständig sind.

Wenn Support-Tabellen `version`, Timestamps oder Junction-Tabellen fehlen, abbrechen und die vorgelagerte Aufgabe nachziehen.

---

## Schritt 3: Repository

- Implementiere oder erweitere:
  - `comment.repository.ts`
  - `attachment.repository.ts`
  - `note.repository.ts`
  - `tag.repository.ts`
- Prüfe für `events`, `seed_runs`, Dumps und Admin-Objekte, ob ein Repository nach Leitfaden sinnvoll ist.
- Standard-CRUD für Support-Objekte läuft über Repositories.
- Junction-Operationen bleiben vorerst im Service.
- Admin-/Seed-/Dump-Operationen dürfen direkte DB-Orchestrierung behalten, wenn sie ausdrücklich dokumentiert und getestet sind.

---

## Schritt 4: Service

- Ersetze Standard-CRUD-Drizzle-Zugriffe durch Repository-Aufrufe.
- Belasse Junction-Operationen im Service, sofern kein Junction-Layer existiert.
- Support-Services setzen und prüfen `version` bei Updates.
- Tag-, Note-, Comment- und Attachment-Responses enthalten `version`, soweit sie updatefähig sind.
- Infrastrukturservices dürfen weiterhin transaktionale Orchestrierung enthalten, aber keine vermeidbaren Entity-CRUD-Duplikate.
- Services übersetzen `VersionConflictError` in 409.

---

## Schritt 5: Route

- Update-Routen für Tags, Notes, Events und andere updatefähige Support-/Infrastruktur-Objekte verlangen strikt `expectedVersion`.
- Fehlende `expectedVersion` liefert 400.
- Veraltete `expectedVersion` liefert 409.
- Bestehende URLs bleiben erhalten.
- Web-API-Clients und Hooks senden `expectedVersion` bei Updates mit.

---

## Schritt 6: Tests (verpflichtend, vor Abnahme vollständig)

### 6a — Integration-Tests

Aktualisiere:
- `apps/api/tests/integration/tags.test.ts`
- `apps/api/tests/integration/notes.test.ts`
- `apps/api/tests/integration/comments.test.ts`
- `apps/api/tests/integration/attachments.test.ts`
- `apps/api/tests/integration/events.test.ts`
- `apps/api/tests/integration/seed-data.test.ts`
- `apps/api/tests/integration/dumps-drive.test.ts`
- `apps/api/tests/integration/delete-cascade.test.ts`

Pflichtfälle:
- Updatefähige Support-Objekte prüfen `expectedVersion`.
- Veraltete Versionen liefern 409.
- n:m- und Cascade-Fälle aus Comment/Attachment-Aufgaben bleiben grün.
- Seed-Data- und Dump-Flows bleiben grün.
- Jede dokumentierte direkte Drizzle-Ausnahme ist durch einen Test oder eine klare Begründung abgesichert.

### 6b — E2E-Tests

Aktualisiere relevante E2E-Flows:
- Tags bearbeiten.
- Notes bearbeiten.
- Attachments nutzen.
- Comments nutzen.
- Kalender-/Event-Flows, falls sichtbar.

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen wenn alle folgenden Punkte erfüllt sind:

- [ ] Support-Repositories für Comments, Attachments, Notes und Tags existieren
- [ ] Standard-CRUD der Support-Objekte läuft über Repositories
- [ ] Alle verbleibenden direkten Drizzle-Zugriffe sind als Junction-, Admin- oder Infrastruktur-Ausnahme dokumentiert
- [ ] Updatefähige Support- und Infrastruktur-Routes verlangen `expectedVersion`
- [ ] Veraltete Versionen liefern 409
- [ ] Responses enthalten die erforderliche `version`
- [ ] Seed-, Dump- und Import-Flows bleiben funktionsfähig
- [ ] Integration-Tests sind grün
- [ ] Relevante E2E-Tests sind grün oder Blocker sind dokumentiert

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Base Repository: `apps/api/src/repositories/base.repository.ts`
- Services: `apps/api/src/services/`
- Routes: `apps/api/src/routes/`
- Shared Types: `packages/shared-types/src/index.ts`
- Integration-Tests: `apps/api/tests/integration/`
- E2E-Tests: `apps/web/e2e/`
