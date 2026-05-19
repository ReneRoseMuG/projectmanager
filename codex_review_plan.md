# Log-Analyse Projekt Manager — 18.–19. Mai 2026

Analysierte Quellen: `logs/2026-05-18-*.md`, `logs/2026-05-19-*.md`  
Abgleich gegen: `apps/api/src/services/events.service.ts`, `apps/api/tests/integration/delete-cascade.test.ts`, `apps/api/src/repositories/`, `apps/api/src/db/migrations/`

---

## Kontext

Das Projekt hat am 18./19. Mai ein umfassendes Architektur-Refactoring durchlaufen (Schritte 01–12 plus Fix-Aufgaben): `users`-Tabelle, Versions- und Audit-Felder auf allen Entitäten, Repository-Layer, `expectedVersion` auf allen PATCH-Routen, Comment- und Attachment-Junction-Modell sowie Event-Junction-Modell. Gesamtbilanz im Abnahme-Gate (Schritt 10): **497 Tests, 467 grün, 30 rot** — davon wurden 28 per Fix-Aufgaben behoben. Offen verbleiben 2 rote Tests.

---

## 🔴 Kritische Befunde

### 1. `delete-cascade.test.ts` — Offene Rote Tests vs. aktueller Dateistand: Widerspruch

**Logs:** Schritt 10 meldet 2 rote Cascade-Tests nach dem Abnahme-Gate. Der Folge-Fix `fix-test-fixtures-expected-version` benennt explizit als offenen Punkt: „Die beiden Legacy-Cascade-Tests müssen auf Junction-basierte Comment-Erzeugung umgestellt oder als Altmodell-Test entfernt werden."

**Codebase:** Die aktuelle `delete-cascade.test.ts` verwendet **durchgehend** `postComment(app, "projects", project.id)` usw. — also API-basierte Kommentarerzeugung, die korrekt in die Junction-Tabellen schreibt. Kein direkter DB-Insert in `comments` ohne Junction-Eintrag ist sichtbar.

**Inkonsistenz:** Entweder wurden die Tests in Schritt 09 (`apps/api/tests/integration/*.test.ts geändert`) oder in Schritt 12 (Kalender-Refactoring, `domain-test-utils.ts` geändert) still mitfixiert — aber kein Log dokumentiert explizit, dass die 2 Cascade-Tests grün geworden sind. Der aktuelle Dateistand schaut korrekt aus. Es fehlt aber ein abschließender Testlauf-Nachweis.

**Empfehlung:** Einmalig `npm run test -w apps/api -- tests/integration/delete-cascade.test.ts` ausführen und Ergebnis loggen. Falls grün: offenen Punkt in Schritt 10 als erledigt markieren. Falls immer noch rot: konkreten Fehlertext dokumentieren.

---

### 2. `events.service.ts` — `milestoneEvents` nicht im Schritt-12-Log dokumentiert

**Log Schritt 12:** Beschreibt die Migration als Überführung von direkten `project_id`/`task_id`-Spalten zu `project_events` und `task_events`. Das Log nennt ausschließlich Project- und Task-Owner. Die Abschlussaussage lautet: „Neue Event-Träger wie Tickets, Features, Use Cases, Backlog-Items oder Wiki-Seiten wurden bewusst nicht ergänzt."

**Codebase:** `events.service.ts` importiert und verwendet `milestoneEvents`, `milestones` aus dem Schema — inklusive vollständiger `ensureMilestoneExists`-Prüfung, `listEventOwners` für Milestone-Owner und `insertEventOwner` für den Milestone-Typ. `milestone.repository.ts` existiert ebenfalls.

**Inkonsistenz:** Milestone-Events wurden implementiert, aber nicht in Schritt 12 dokumentiert. Sie wurden wahrscheinlich im Rahmen von `2026-05-19-feature-meilensteine.md` eingebaut, was der Konventions-Log nicht in Schritt 12 erwähnt. Das bedeutet:

- Die `events`-Tabelle hat möglicherweise eine `milestone_events`-Junction, die in der Dump-Registry nicht eingetragen ist (Schritt 12 ergänzte nur `project_events` und `task_events`).
- `truncateAll` im Test-Helper leert `milestone_events` möglicherweise nicht.

**Empfehlung:** `dump.service.ts` auf `milestone_events` prüfen. `truncateAll` auf `milestone_events` prüfen.

---

## 🟠 Strukturelle Schwachstellen

### 3. `truncateAll` — Junction-Tabellen nach Schritt 12 unvollständig

**Log `fix-test-fixtures-expected-version`:** „der Test-DB-Helper leert nun auch die neuen Comment- und Attachment-Junction-Tabellen" — das wurde korrekt ergänzt.

**Schritt 12** fügte anschließend weitere Junction-Tabellen hinzu: `project_events`, `task_events` und (nicht dokumentiert) `milestone_events`. Der `fix-test-fixtures`-Log entstand VOR Schritt 12.

**Risiko:** Tests, die Events anlegen, könnten durch vorige Testläufe erzeugte Junction-Einträge verunreinigt werden, wenn `truncateAll` diese nicht enthält. Schritt 12 erwähnt `domain-test-utils.ts geändert` — das deutet darauf hin, dass E2E-Fixtures ergänzt wurden, aber nicht zwingend `truncateAll` im API-Test-Helper.

**Empfehlung:** `apps/api/tests/helpers/db.ts` öffnen und prüfen, ob `project_events`, `task_events`, `milestone_events` in `truncateAll` stehen.

---

### 4. `created_by` / `updated_by` — Audit-Felder ohne Auth-Kontext

**Log Schritt 02:** `created_by` und `updated_by` wurden auf allen Fach- und Supportobjekten ergänzt. Die `users`-Tabelle existiert.

**Codebase-Beobachtung:** Das Projekt hat kein sichtbares Auth-Middleware-System (kein Login, kein JWT, keine Session). `events.service.ts` schreibt keine `created_by`/`updated_by`-Werte — das Insert enthält nur `title`, `description`, `startTime`, `endTime`, `isAllDay`, `color`, `createdAt`, `updatedAt`. Gleiches gilt vermutlich für alle anderen Services.

**Risiko:** Wenn `created_by` und `updated_by` `NOT NULL` sind, schlägt jedes Insert fehl sobald kein User-Context vorhanden ist. Falls sie `NULL`-fähig sind, sind Audit-Felder dauerhaft leer und damit wertlos.

**Empfehlung:** In `schema.ts` prüfen, ob `created_by`/`updated_by` nullable sind. Falls nicht null: entweder nullable machen oder einen Default-System-User einführen.

---

### 5. Schritt 10 Abnahme-Gate — Status ⚠️ nie auf ✅ gesetzt

**Beobachtung:** `schritt-10-test-und-abnahme-gate.md` hat Status `⚠️ Teilweise abgeschlossen`. Nach diesem Log wurden vier Fix-Aufgaben ausgeführt, die die Blocker beheben sollten:
- `fix-test-fixtures-expected-version` ✅ — 27 Tests
- `fix-dump-registry-new-tables` ✅ — 1 Test (Dump-Contract)
- `fix-milestone-web-tests` ✅ — Web-Tests
- `schritt-12-events-owner-junction-modell` ✅

**Inkonsistenz:** Kein Log schließt das Abnahme-Gate explizit ab. Es gibt keinen finalen Testlauf über alle 497+ Tests nach Schritt 12. Damit ist unklar, ob das Gate nach dem Events-Refactoring (das Schema, Services, Tests und E2E änderte) wieder grün läuft.

**Empfehlung:** Vollständigen Gate-Lauf nach Schritt 12 ausführen: Migration + alle API-Tests + Web-Tests + E2E. Ergebnis als separaten Log dokumentieren.

---

## 🟡 Kleinere Inkonsistenzen

### 6. Snapshot-Kollision in Migration 0012 — nicht in Migrationsdatei, aber im Snapshot korrigiert

**Log Schritt 02:** „Der erste `drizzle-kit generate`-Lauf meldete eine Snapshot-Kollision, weil `0012_snapshot.json` auf den Null-Parent statt auf `0011` zeigte. Das wurde in den Meta-Daten korrigiert."

Die SQL-Migrationsdatei `0012` wurde dabei bewusst nicht umgeschrieben. Das ist korrekt für laufende Datenbanken, aber historische Drizzle-Regenerierungen könnten wieder einen inkorrekten Snapshot erzeugen. Falls die Migrationshistorie irgendwann neu aufgebaut wird, sollte dieser manuelle Eingriff dokumentiert bleiben.

---

### 7. `agents.md` wurde in Schritt 09 und Schritt 12 beide Male geändert — letzter Stand unklar

Beide Logs melden `agents.md geändert`. Schritt-09 ergänzte Regeln für neue Domänen, Junction-Owner und Dump-Registry. Schritt-12 aktualisierte die Calendar-Architektur. Da Schritt 12 zuletzt lief, ist sein Inhalt der aktuell gültige — aber es ist nicht dokumentiert, ob Schritt 12 die Regeln aus Schritt 09 vollständig erhalten hat. Bei einer so zentralen Datei empfiehlt sich ein kurzer Review.

---

## Zusammenfassung

| # | Problem | Schwere | Handlungsbedarf |
|---|---------|---------|----------------|
| 1 | Cascade-Tests laut Log rot, Dateistand sieht korrekt aus | 🔴 Unklar | Testlauf mit Nachweis |
| 2 | `milestone_events` in Service, aber nicht in Schritt-12-Log | 🔴 Inkonsistenz | Dump-Registry + `truncateAll` prüfen |
| 3 | `truncateAll` nach Schritt 12 möglicherweise unvollständig | 🟠 Hoch | `helpers/db.ts` prüfen |
| 4 | `created_by`/`updated_by` — keine Werte in Services | 🟠 Hoch | Schema-Nullability und Befüllungsstrategie klären |
| 5 | Abnahme-Gate nie final geschlossen | 🟠 Hoch | Vollständiger Gate-Lauf nach Schritt 12 |
| 6 | Snapshot-Kollision Mig. 0012 nur im Snapshot, nicht in SQL | 🟡 Mittel | Dokumentation sichern |
| 7 | `agents.md` doppelt geändert, Konsistenz ungeprüft | 🟡 Mittel | Einmaliger Review |

**Sofortiger Codex-Auftrag empfohlen für:** Befunde 2 und 3 (Dump-Registry + `truncateAll` auf `milestone_events`), gefolgt von einem vollständigen Gate-Lauf für Befund 5.
