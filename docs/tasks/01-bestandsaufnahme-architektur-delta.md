# Codex-Aufgabe: Bestandsaufnahme Architektur-Delta

## Aufgabenbeschreibung
Erstelle vor dem Architektur-Refactoring eine vollständige, nachvollziehbare Bestandsaufnahme. Ziel ist eine Ist/Soll-Übersicht, aus der alle Folgeaufgaben sicher ableiten können, welche Tabellen, Services, Routes, Shared Types und Tests geändert werden müssen.

Diese Aufgabe ist eine reine Analyse- und Dokumentationsaufgabe. Es werden keine Schema-, Code- oder Migrationsänderungen umgesetzt.

## Scope
Betroffen sind:
- `docs/architecture-leitfaden.md`
- `docs/task-template.md`
- `apps/api/src/db/schema.ts`
- `apps/api/src/db/migrations/`
- `apps/api/src/repositories/`
- `apps/api/src/services/`
- `apps/api/src/routes/`
- `apps/api/tests/integration/`
- `apps/web/e2e/`
- `packages/shared-types/src/index.ts`
- betroffene Web-API-Clients, Hooks und Query-Keys unter `apps/web/src/`

Abhängigkeiten:
- Keine.

Nicht im Scope:
- Keine Umsetzung der späteren Refactoring-Schritte.
- Keine Migrationserzeugung.
- Keine Anpassung bestehender Tests.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lies zunächst den Architektur-Leitfaden vollständig:
`docs/architecture-leitfaden.md`

Lies dann das Template:
`docs/task-template.md`

Erstelle eine Ist/Soll-Tabelle mit mindestens diesen Bereichen:

| Bereich | Ist-Zustand | Soll-Zustand |
|---|---|---|
| Schema | Welche Tabellen/Felder entsprechen noch nicht dem Leitfaden? | Welche Tabellen/Felder müssen existieren? |
| Migrations | Welche Migrationen bilden den aktuellen Stand ab? | Welche neuen Migrationen werden später benötigt? |
| Repositories | Existiert ein Repository-Layer? | Welche Repository-Dateien und Methoden werden benötigt? |
| Services | Welche Services greifen direkt auf Drizzle zu? | Welche Services müssen auf Repositories umgestellt werden? |
| Routes | Welche Routen brauchen `expectedVersion` oder Parent-Kontext? | Welche API-Kontrakte gelten im Zielzustand? |
| Shared Types | Welche DTOs enthalten alte Owner-Felder oder keine Version? | Welche Typen brauchen `version`, `expectedVersion` oder `owners`? |
| Tests | Welche Tests decken alte Modelle ab? | Welche Tests müssen neu entstehen oder angepasst werden? |

Dokumentiere außerdem:
- Alle verbotenen Muster aus dem Leitfaden, die aktuell noch vorkommen.
- Alle Services mit direktem Drizzle-Zugriff.
- Alle Parent-Objekt/Child-Objekt-Beziehungen im Zielzustand.
- Die Abhängigkeiten zwischen den Folgeaufgaben.

**Beginne mit keiner Implementierung.**

---

## Schritt 2: Schema & Migration

Keine Schema- oder Migrationsänderung in dieser Aufgabe.

Dokumentiere nur:
- Welche Tabellen später neu angelegt werden müssen.
- Welche Spalten später ergänzt werden müssen.
- Welche alten Spalten später erst nach Verifikation entfernt werden dürfen.

---

## Schritt 3: Repository

Keine Repository-Implementierung in dieser Aufgabe.

Dokumentiere nur:
- Welche Repository-Dateien später benötigt werden.
- Welche Services welche Repository-Funktionen voraussichtlich brauchen.
- Wo Junction-Operationen vorerst im Service verbleiben dürfen.

---

## Schritt 4: Service

Keine Service-Anpassung in dieser Aufgabe.

Dokumentiere nur:
- Welche Service-Funktionen entfallen.
- Welche Service-Funktionen neu entstehen.
- Welche Funktionen weiterhin bestehen bleiben, aber intern anders implementiert werden müssen.

---

## Schritt 5: Route

Keine Route-Anpassung in dieser Aufgabe.

Dokumentiere nur:
- Welche Update-Routen später strikt `expectedVersion` entgegennehmen müssen.
- Welche Parent-Routen später Support-Objekte über Junction-Tabellen bedienen.
- Welche bestehenden URLs erhalten bleiben müssen.

---

## Schritt 6: Tests (verpflichtend, vor Abnahme vollständig)

Für diese Analyseaufgabe sind keine automatisierten Tests erforderlich.

Prüfe stattdessen manuell:
- Die Bestandsaufnahme nennt alle Tabellen aus dem Leitfaden.
- Die Bestandsaufnahme nennt alle Services mit direktem Drizzle-Zugriff.
- Die Bestandsaufnahme nennt alle betroffenen Integration- und E2E-Testdateien.
- Die Bestandsaufnahme enthält eine umsetzbare Reihenfolge für die Folgeaufgaben.

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen wenn alle folgenden Punkte erfüllt sind:

- [ ] Architektur-Leitfaden vollständig gelesen
- [ ] Template gelesen
- [ ] Ist/Soll-Tabelle für Schema, Repositories, Services, Routes, Shared Types und Tests erstellt
- [ ] Alle aktuellen Leitfaden-Abweichungen dokumentiert
- [ ] Alle direkten Drizzle-Zugriffe in Services erfasst
- [ ] Alle Zielbeziehungen Parent/Child dokumentiert
- [ ] Folgeaufgaben und Abhängigkeiten bestätigt
- [ ] Keine Code-, Schema- oder Migrationsänderungen vorgenommen

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Aufgaben-Template: `docs/task-template.md`
- Schema: `apps/api/src/db/schema.ts`
- Services: `apps/api/src/services/`
- Routes: `apps/api/src/routes/`
- Shared Types: `packages/shared-types/src/index.ts`
- Integration-Tests: `apps/api/tests/integration/`
- E2E-Tests: `apps/web/e2e/`
