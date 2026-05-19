# Codex-Aufgabe: Cleanup und Drop Legacy-Spalten

## Aufgabenbeschreibung
Entferne erst nach erfolgreicher Verifikation die veralteten Comment- und Attachment-Owner-Spalten sowie letzte manuelle Cascade-Reste. Ziel ist ein sauberes Schema ohne polymorphe Felder, ohne nullable Owner-Felder mit CHECK-Constraint und ohne Service-Cascades als Ersatz für DB-native FKs.

Diese Aufgabe darf erst ausgeführt werden, wenn die neuen Junction-Modelle produktiv genutzt und getestet sind.

## Scope
Betroffen sind:
- `apps/api/src/db/schema.ts`
- `apps/api/src/db/migrations/`
- `apps/api/src/services/comments.service.ts`
- `apps/api/src/services/attachments.service.ts`
- alle Parent-Services mit alten Cascade-Aufrufen
- `packages/shared-types/src/index.ts`
- Web-API-Clients und Hooks mit alten Owner-Feldern
- Integration- und E2E-Tests mit alten DTO-Erwartungen

Legacy-Spalten im Scope:
- `comments.task_id`
- `comments.entity_type`
- `comments.entity_id`
- `attachments.project_id`
- `attachments.task_id`
- `attachments.feature_id`
- `attachments.ticket_id`
- CHECK-Constraint `attachments_exactly_one_owner`

Abhängigkeiten:
- Aufgabe 03 abgeschlossen und verifiziert.
- Aufgabe 04 abgeschlossen und verifiziert.
- Aufgabe 08 abgeschlossen oder alle Support-Services sind kompatibel.

Nicht im Scope:
- Neue Junction-Tabellen anlegen.
- Neue n:m-Features einführen.
- Repository-Grundlagen ändern.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lies zunächst den Architektur-Leitfaden vollständig:
`docs/architecture-leitfaden.md`

Lese dann alle betroffenen Dateien und erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| `schema.ts` | Legacy-Spalten eventuell noch vorhanden | Legacy-Spalten entfernt |
| Migrations | Daten bereits in Junction-Tabellen übertragen | Drop-Migration ohne Datenverlust |
| Services | Eventuell letzte alte Owner-Zugriffe | Nur Junction-Zugriffe |
| Shared Types | Eventuell alte Owner-Felder in DTOs | Nur `owners: [...]` |
| Tests | Eventuell alte Spaltenerwartungen | Tests prüfen Zielmodell |

Dokumentiere außerdem:
- Ergebnis einer Datenverifikation: Anzahl alter Links entspricht Anzahl neuer Junction-Links.
- Alle Suchtreffer für alte Spaltennamen.
- Alle Suchtreffer für `entityType`, `entityId`, `taskId` im Comment-Kontext.
- Alle Suchtreffer für alte Attachment-Owner-Felder im Attachment-Kontext.

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme und Verifikation.**

---

## Schritt 2: Schema & Migration

- Entferne die Legacy-Spalten aus `schema.ts`.
- Entferne den alten Attachment-CHECK-Constraint aus `schema.ts`.
- Erzeuge eine separate Drop-Migration mit `npm run db:generate -w apps/api`.
- Prüfe die Migration manuell auf SQLite-Table-Rebuild und Datenverlustfreiheit.
- Führe vor dem Drop eine Verifikationsabfrage aus, die bestätigt:
  - alle alten Comment-Owner wurden in Junction-Tabellen übertragen
  - alle alten Attachment-Owner wurden in Junction-Tabellen übertragen
- Führe `npm run db:migrate -w apps/api` aus.

---

## Schritt 3: Repository

- Entferne jede Repository-Logik, die noch alte Owner-Spalten liest oder schreibt.
- Repositories arbeiten nur mit Support-Objekt-Datensätzen selbst.
- Junction-Operationen bleiben im Service, sofern kein Junction-Layer existiert.

---

## Schritt 4: Service

- Entferne letzte direkte Zugriffe auf alte Comment- und Attachment-Owner-Spalten.
- Entferne letzte manuelle Cascade-Aufrufe, die durch DB-FKs ersetzt wurden.
- Entferne tote Hilfsfunktionen, die nur für Legacy-Owner existierten.
- Datei-Cleanup nutzt ausschließlich Junction-Zustand.

---

## Schritt 5: Route

- Entferne Route-Kompatibilitätslogik, die alte Owner-Felder in Responses erzeugt.
- API-Responses bleiben bei `owners: [...]`.
- Bestehende URLs bleiben erhalten.
- Keine neuen URLs in dieser Aufgabe.

---

## Schritt 6: Tests (verpflichtend, vor Abnahme vollständig)

### 6a — Integration-Tests

Aktualisiere:
- `apps/api/tests/integration/comments.test.ts`
- `apps/api/tests/integration/attachments.test.ts`
- `apps/api/tests/integration/delete-cascade.test.ts`
- alle Tests, die alte DTO-Felder erwarten

Pflichtfälle:
- Datenmigration vor Drop ist nachweislich vollständig.
- Nach Drop funktionieren Comment-CRUD und Attachment-CRUD.
- n:m-Verknüpfungen funktionieren weiterhin.
- Parent-Cascade entfernt Junction-Einträge.
- Direkter Delete entfernt Support-Objekt und Links.
- Kein Test liest alte Owner-Spalten.

### 6b — E2E-Tests

Führe relevante Comment- und Attachment-E2E-Tests erneut aus:
- Comment-Flows funktionieren ohne Reload.
- Attachment-Flows inklusive Preview funktionieren ohne Reload.
- n:m-Fälle bleiben grün.

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen wenn alle folgenden Punkte erfüllt sind:

- [ ] Legacy-Spalten wurden aus `schema.ts` entfernt
- [ ] Separate Drop-Migration wurde erzeugt
- [ ] Drop-Migration läuft erfolgreich
- [ ] Keine Datenverluste bei Comments oder Attachments
- [ ] Keine Service-Zugriffe auf alte Owner-Spalten
- [ ] Keine Shared-Type-DTOs mit alten Owner-Feldern
- [ ] Keine Tests mit alten Owner-Spaltenerwartungen
- [ ] Comment- und Attachment-Integration-Tests sind grün
- [ ] Cascade-Tests sind grün
- [ ] Relevante E2E-Tests sind grün oder Blocker sind dokumentiert

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Schema: `apps/api/src/db/schema.ts`
- Migrations: `apps/api/src/db/migrations/`
- Comment-Service: `apps/api/src/services/comments.service.ts`
- Attachment-Service: `apps/api/src/services/attachments.service.ts`
- Shared Types: `packages/shared-types/src/index.ts`
- Integration-Tests: `apps/api/tests/integration/`
- E2E-Tests: `apps/web/e2e/`
