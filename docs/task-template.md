# Codex-Aufgabe: [TITEL]

## Aufgabenbeschreibung
[Kurze Beschreibung was geändert werden soll und warum.]

## Scope
[Welche Dateien, Tabellen, Services, Routes sind betroffen.]

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lies zunächst den Architektur-Leitfaden vollständig:
`docs/architektur-leitfaden.md`

Lese dann alle betroffenen Dateien und erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| schema.ts | ... | ... |
| *.repository.ts | ... | ... |
| *.service.ts | ... | ... |
| *.ts (Route) | ... | ... |
| *.test.ts | ... | ... |

Dokumentiere außerdem:
- Welche Funktionen/Methoden entfallen
- Welche neu entstehen
- Welche bestehenden Tests angepasst werden müssen
- Welche neuen Tests geschrieben werden müssen

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Schema & Migration

- Neue Tabellen und Spalten in `apps/api/src/db/schema.ts` anlegen
- Migration via `drizzle-kit generate` erzeugen
- Datenmigration: bestehende Datensätze verlustfrei überführen
- Veraltete Spalten erst in einer separaten Migration droppen, nachdem die Datenmigration verifiziert ist

---

## Schritt 3: Repository

- `BaseRepository` in `apps/api/src/repositories/base.repository.ts` anlegen falls nicht vorhanden
- Konkrete Repositories für alle betroffenen Entities anlegen oder erweitern
- Standard-CRUD mit Version-Prüfung gemäß Leitfaden implementieren
- Domain-spezifische Abfragen in konkrete Repositories übernehmen

---

## Schritt 4: Service

- Drizzle-Direktzugriffe durch Repository-Aufrufe ersetzen
- Veraltete manuelle Cascade-Funktionen entfernen
- `VersionConflictError` als HTTP 409 weiterleiten

---

## Schritt 5: Route

- Betroffene Routen anpassen
- URL-Struktur bleibt erhalten (keine Breaking Changes an der API)
- `expectedVersion` aus Request-Body bei Update-Routen entgegennehmen

---

## Schritt 6: Tests (verpflichtend, vor Abnahme vollständig)

### 6a — Integration-Tests (Vitest + supertest, echte SQLite-DB)

Für jede geänderte oder neue Entität und Beziehung müssen folgende Szenarien als eigene `it()`-Blöcke vorhanden sein:

**CRUD:**
- Erstellen über Parent → Objekt in Liste des Parents sichtbar
- Lesen per ID → korrektes Objekt zurück
- Aktualisieren mit korrekter Version → Erfolg, Version inkrementiert, `updatedAt` aktualisiert
- Löschen → Objekt nicht mehr abrufbar
- 404 bei nicht existierendem Parent oder Objekt

**Kaskaden:**
- Parent löschen → abhängige Junction-Einträge automatisch entfernt
- Letzter Parent gelöscht → Objekt-Record gelöscht
- Cascade bei n:m: Parent A löschen, Parent B existiert noch → Objekt bleibt erhalten

**Optimistic Locking:**
- Update mit korrekter Version → HTTP 200, neue Version in Response
- Update mit veralteter Version → HTTP 409
- Zwei aufeinanderfolgende Updates: erstes erfolgreich, zweites mit ursprünglicher Version → HTTP 409

**Neue Tests ablegen in:**
`apps/api/tests/integration/[entität].test.ts`

Kaskaden-Szenarien zusätzlich in:
`apps/api/tests/integration/delete-cascade.test.ts`

### 6b — E2E-Tests (Playwright)

Für jede geänderte oder neue Beziehung müssen folgende Szenarien als eigene `test()`-Blöcke vorhanden sein:

**CRUD im Browser:**
- Objekt erstellen → erscheint sofort in der zugehörigen Liste/Tab ohne Reload
- Objekt bearbeiten → Änderung sofort sichtbar
- Objekt löschen → verschwindet sofort aus Liste/Tab

**n:m-Verknüpfungen:**
- Objekt an Parent A verknüpfen → in Tab von Parent A sichtbar
- Dasselbe Objekt an Parent B verknüpfen → in Tab von Parent B sichtbar, in Tab von Parent A weiterhin sichtbar
- Parent A löschen → Objekt in Tab von Parent B weiterhin vorhanden

**Board- und Listen-Effekte:**
- Statusänderung einer Task/eines Tickets → Board-Spalte aktualisiert sich ohne Reload
- Verknüpfte Teilmengen in Tabs (z.B. Tasks-Tab eines Features) spiegeln Änderungen sofort wider

**Neue Tests ablegen in:**
`apps/web/e2e/[entität].spec.ts`

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen wenn **alle** der folgenden Punkte erfüllt sind:

- [ ] Bestandsaufnahme dokumentiert und mit Auftraggeber abgestimmt
- [ ] Schema entspricht dem Leitfaden (keine polymorphen Felder, keine nullable-FK-with-CHECK)
- [ ] Alle betroffenen Entity-Tabellen haben `version`, `created_by`, `updated_by`, `created_at`, `updated_at`
- [ ] Repository-Klassen existieren und implementieren Standard-CRUD mit Version-Prüfung
- [ ] Kein Service greift direkt auf Drizzle zu (außer Junction-Operationen)
- [ ] Kein Service enthält manuelle Cascade-Aufrufe als FK-Ersatz
- [ ] Kein Service enthält `ensureEntityExists()`-Switches als FK-Ersatz
- [ ] Alle bestehenden Datensätze korrekt migriert, kein Datenverlust
- [ ] Alle neuen Integration-Tests vorhanden und grün (CRUD, Kaskaden, Optimistic Locking)
- [ ] `delete-cascade.test.ts` um neue Szenarien erweitert und grün
- [ ] Alle neuen E2E-Tests vorhanden und grün (CRUD im Browser, n:m-Verknüpfungen, Board-Effekte)
- [ ] Keine bestehenden Tests gebrochen (`vitest run` und `playwright test` vollständig grün)

---

## Referenz

- Architektur-Leitfaden: `docs/architektur-leitfaden.md`
- Schema: `apps/api/src/db/schema.ts`
- Repositories: `apps/api/src/repositories/`
- Services: `apps/api/src/services/`
- Routes: `apps/api/src/routes/`
- Integration-Tests: `apps/api/tests/integration/`
- E2E-Tests: `apps/web/e2e/`
