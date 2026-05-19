# Codex-Aufgabe: Attachment-Junction-Modell

## Aufgabenbeschreibung
Stelle Attachments auf das Zielmodell aus dem Architektur-Leitfaden um. Attachments sind im Endzustand Support-Objekte mit n:m-Beziehungen zu Parent-Objekten. Nullable Owner-Felder mit CHECK-Constraint werden fachlich nicht mehr verwendet.

Attachment-Responses verwenden künftig `owners: [...]`, damit ein Dokument an mehreren Parents hängen kann.

## Scope
Betroffen sind:
- `apps/api/src/db/schema.ts`
- `apps/api/src/db/migrations/`
- `apps/api/src/services/attachments.service.ts`
- `apps/api/src/services/attachment-preview.service.ts`
- Parent-Services, die Attachment-Cleanup manuell auslösen
- `apps/api/src/routes/attachments.ts`
- `apps/api/src/routes/tickets.ts`
- `packages/shared-types/src/index.ts`
- `apps/web/src/api/attachments.ts`
- `apps/web/src/api/tickets.ts`
- `apps/web/src/hooks/useAttachments.ts`
- `apps/web/src/hooks/useAttachmentPreview.ts`
- `apps/web/src/queries/queryKeys.ts`
- `apps/web/src/queries/invalidation.ts`
- `apps/api/tests/integration/attachments.test.ts`
- `apps/api/tests/integration/delete-cascade.test.ts`
- betroffene E2E-Tests unter `apps/web/e2e/`

Parent-Typen im Scope:
- Project
- Task
- Feature
- Ticket

Abhängigkeiten:
- Aufgabe 01 abgeschlossen oder deren Bestandsaufnahme liegt vor.
- Aufgabe 02 abgeschlossen, falls `version` und Audit-Felder bereits vorausgesetzt werden.

Nicht im Scope:
- Comment-Umbau.
- Vollständige Repository-Migration aller Domains.
- Entfernen alter Attachment-Owner-Spalten; das erfolgt erst in Aufgabe 09 nach Verifikation.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lies zunächst den Architektur-Leitfaden vollständig:
`docs/architecture-leitfaden.md`

Lese dann alle betroffenen Dateien und erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| `schema.ts` | `attachments` nutzt nullable Owner-Felder und CHECK-Constraint | Attachment-Junction-Tabellen existieren |
| `attachments.service.ts` | Queries filtern nach Owner-Spalten | Queries laufen über Junction-Tabellen |
| `attachment-preview.service.ts` | Preview liest Attachment-Datensatz direkt | Preview funktioniert ohne Owner-Spalten |
| Routes | Upload erfolgt parent-spezifisch | Upload und Link bestehender Attachments laufen parent-spezifisch |
| Shared Types | `Attachment` enthält alte Owner-Felder | `Attachment` enthält `owners: AttachmentOwner[]` |
| Tests | Tests erwarten genau einen Owner | Tests prüfen n:m, Cascade und Datei-Cleanup |

Dokumentiere außerdem:
- Welche Datei-Cleanup-Funktionen existieren.
- Welche Parent-Löschpfade Attachments berühren.
- Welche Web-Komponenten alte Owner-Felder verwenden.

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Schema & Migration

- Ergänze Junction-Tabellen:
  - `project_attachments`
  - `task_attachments`
  - `feature_attachments`
  - `ticket_attachments`
- Jede Junction-Tabelle erhält:
  - FK auf Parent mit `onDelete: "cascade"`
  - FK auf `attachments.id` mit `onDelete: "cascade"`
  - Unique-Index auf Parent-ID und `attachment_id`
  - keine Audit- oder Version-Felder
- Erzeuge eine Datenmigration:
  - Bestehende `project_id`, `task_id`, `feature_id` und `ticket_id` werden in die jeweilige Junction-Tabelle übertragen.
  - Doppelte Links werden dedupliziert.
- Alte Owner-Spalten und der alte CHECK-Constraint bleiben zunächst bestehen und werden erst in Aufgabe 09 entfernt.
- Führe Migration und Verifikation lokal aus.

---

## Schritt 3: Repository

Falls Aufgabe 05 noch nicht umgesetzt ist:
- Lege keine vollständige Repository-Schicht an.
- Halte die Attachment-Änderung service-nah, aber so, dass sie später in `attachment.repository.ts` verschoben werden kann.

Falls Aufgabe 05 bereits umgesetzt ist:
- Nutze `attachmentRepository` für CRUD auf `attachments`.
- Junction-Operationen dürfen vorerst im Service bleiben.

---

## Schritt 4: Service

- Ersetze nullable Owner-Spalten-Queries durch Junction-Queries.
- Implementiere Parent-spezifische List-, Upload- und Link-Funktionen.
- Ein Attachment darf mit mehreren Parents verknüpft sein.
- Datei-Cleanup-Regel:
  - Wird nur ein Parent entfernt und es existieren weitere Parent-Links, bleibt die Datei erhalten.
  - Wird das Attachment direkt gelöscht, werden alle Links und die Datei entfernt.
  - Wird der letzte Parent-Link entfernt, wird das Verhalten explizit implementiert und getestet.
- `attachment-preview.service.ts` darf für Preview weiterhin den Attachment-Datensatz per ID lesen, aber nicht auf alte Owner-Felder angewiesen sein.
- Responses enthalten `owners: [...]`.

---

## Schritt 5: Route

- Bestehende Parent-URLs bleiben erhalten, z. B.:
  - `GET /projects/:id/attachments`
  - `POST /projects/:id/attachments`
  - `DELETE /attachments/:id`
  - `GET /attachments/:id/preview`
- Ergänze bei Bedarf Link-Routen für bestehende Attachments:
  - `POST /projects/:id/attachments/:attachmentId`
  - entsprechende Parent-Pfade für Task, Feature und Ticket
- Ticket-Attachment-Routen bleiben funktional und nutzen das gleiche DTO-Zielbild.
- API-Response-Typen werden auf `owners: [...]` angepasst.

---

## Schritt 6: Tests (verpflichtend, vor Abnahme vollständig)

### 6a — Integration-Tests

Ergänze oder aktualisiere Tests in:
- `apps/api/tests/integration/attachments.test.ts`
- `apps/api/tests/integration/delete-cascade.test.ts`

Pflichtfälle:
- Attachment über jeden Parent-Typ hochladen.
- Attachment in Liste des jeweiligen Parents sichtbar.
- Bestehendes Attachment mit zweitem Parent verknüpfen.
- Attachment ist danach in beiden Parent-Listen sichtbar.
- Parent A löschen, Parent B existiert noch: Attachment-Datensatz und Datei bleiben erhalten.
- Direkter Delete über `/attachments/:id` entfernt Attachment, Junction-Einträge und Datei.
- Nicht existierender Parent liefert 404.
- Alte Attachment-Daten werden korrekt in Junction-Tabellen migriert.
- Preview funktioniert weiterhin über `/attachments/:id/preview`.

### 6b — E2E-Tests

Ergänze E2E-Abdeckung dort, wo Attachments im Browser sichtbar bearbeitet werden:
- Datei an Parent hochladen und ohne Reload sichtbar sehen.
- Attachment löschen und ohne Reload verschwinden sehen.
- Attachment an zweiten Parent verknüpfen und in beiden Tabs sichtbar sehen.
- Parent A löschen, Attachment bei Parent B bleibt sichtbar.

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen wenn alle folgenden Punkte erfüllt sind:

- [ ] Alle vier Attachment-Junction-Tabellen existieren
- [ ] Bestehende Attachment-Daten wurden verlustfrei in Junction-Tabellen übertragen
- [ ] Services nutzen keine nullable Attachment-Owner-Spalten mehr
- [ ] Datei-Cleanup berücksichtigt mehrere Parent-Links
- [ ] Attachment-Preview funktioniert weiterhin
- [ ] Attachment-Responses enthalten `owners: [...]`
- [ ] Web-API und Hooks verwenden die neuen DTOs
- [ ] Integration-Tests für CRUD, n:m, Cascade, Cleanup und Preview sind grün
- [ ] Relevante E2E-Tests sind grün oder Blocker sind dokumentiert
- [ ] Alte Owner-Spalten und alter CHECK-Constraint wurden noch nicht gedroppt

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Schema: `apps/api/src/db/schema.ts`
- Attachment-Service: `apps/api/src/services/attachments.service.ts`
- Preview-Service: `apps/api/src/services/attachment-preview.service.ts`
- Attachment-Routes: `apps/api/src/routes/attachments.ts`
- Ticket-Routes: `apps/api/src/routes/tickets.ts`
- Shared Types: `packages/shared-types/src/index.ts`
- Web API: `apps/web/src/api/attachments.ts`
- Integration-Tests: `apps/api/tests/integration/attachments.test.ts`
- Cascade-Tests: `apps/api/tests/integration/delete-cascade.test.ts`
