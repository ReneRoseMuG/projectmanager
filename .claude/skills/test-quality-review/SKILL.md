---
name: test-quality-review
description: >
  Vollständige Qualitäts- und Abdeckungsanalyse des Projekt-Manager-Testbestands.
  Liest alle Testdateien, zählt Testfunktionen (nicht nur Dateien), prüft
  Teststrategie-Konformität gemäß agents.md §11, identifiziert Abdeckungslücken
  und erzeugt einen priorisierten Markdown-Bericht mit Änderungsaufträgen.
  Auslöser: "Testanalyse", "Testbericht", "Testqualität prüfen",
  "Teststrategie-Konformität", "Testabdeckung prüfen", "Tests analysieren".
---

# Test Quality Review — Projekt Manager

Auftragsklasse 2 (reiner Report) — keine Codeänderungen.

## Testhierarchie

```
tests/
├── unit/           ← isolierte Logik, keine echte DB
│   ├── api/
│   └── web/
├── integration/    ← echte SQLite Temp-DB, echte Fastify-App
│   ├── api/
│   └── web/
├── browser/        ← Playwright E2E
│   └── web/
├── fixtures/       ← Test-Fixtures und Helper
├── setup/          ← Test-Setups
└── .runtime/       ← generierte Testlaufdaten (ignoriert)
```

## Schritt 0: Vorbereitung

Alle Testdateien unter `tests/` kartieren (`*.test.ts`, `*.spec.ts`).

Zählung pro Ebene:
- Anzahl Testdateien
- Anzahl Testfunktionen (`it(` / `test(`) — nicht nur Dateizählung

## Schritt 1: Teststrategie-Konformität (agents.md §11)

**1.1 DB-Isolation in Unit-Tests**
Prüfen ob Unit-Tests echte DB-Verbindungen verwenden (`drizzle`, `db.`, `mysql2`).
Jeder Treffer → Befund (Kritisch).

**1.2 Produktions-DB-Zugriff**
Prüfen ob Tests auf `apps/api/data/` zugreifen.
Jeder Treffer → Befund (Kritisch).

**1.3 Pflichtkommentar**
Prüfen ob Testdateien den Pflichtkommentar enthalten (Test Scope / Abgedeckte Regeln / Fehlerfälle / Ziel).
Fehlend → Befund (Niedrig).

**1.4 Leere Tests und undokumentierte Skips**
Prüfen auf `test.skip`, `it.skip`, `describe.skip` oder leere Testkörper ohne Log-Blocker.
Jeder Treffer → Befund (Mittel).

**1.5 Berechtigungstests**
Prüfen ob geschützte Routen Berechtigungstests haben (positiver Fall + negativer Fall).
Fehlend → Befund (Hoch).

**1.6 expectedVersion in Update-Tests**
Prüfen ob Integrationstests für Update-Endpunkte versionierter Objekte `expectedVersion` senden.
Fehlend → Befund (Mittel).

## Schritt 2: Domänen-Abdeckung

| Domäne | Kern-Entitäten | Abgedeckt? |
|---|---|---|
| Projektmanagement | projects, milestones, tasks | — |
| Dokumentation | features, useCases, wikiPages | — |
| Tickets | tickets, ticketRelations | — |
| Tags | projectTags, milestoneTags, taskTags, ticketTags | — |
| Notes | projectNotes, milestoneNotes, taskNotes, ticketNotes | — |
| Attachments | projectAttachments etc. | — |
| Comments | projectComments, taskComments etc. | — |
| Auth & Rollen | Permissions, Session, Guards | — |
| Journal | journal entries, objectJournal | — |

Fehlende Kerndomänen → Befund (Hoch). Fehlende Infrastruktur → Befund (Mittel).

## Schritt 3: Dump- und Fixture-Vollständigkeit

**3.1** `tests/fixtures/api/db.ts` → `truncateAll`: alle aktuellen Tabellen aus `schema.ts` enthalten?
Fehlende Tabelle → Befund (Hoch).

**3.2** `tests/integration/api/dumps-local.test.ts`: repräsentative Seed-Daten für neue Tabellen vorhanden?
Fehlend → Befund (Mittel).

## Schritt 4: Methodische Qualität

**4.1 Zu schwache Assertions**
`toBeTruthy()` / `toBeDefined()` wo spezifische Werte prüfbar wären → Befund (Niedrig).

**4.2 Mehrfach-Status-Erwartungen**
`expect([200, 201]).toContain(status)` statt konkretem Status → Befund (Mittel).

**4.3 Assertions abschwächen**
Prüfen ob neuere Tests gegenüber älteren Versionen abgeschwächte Assertions haben → Befund (Hoch).

## Schritt 5: Dateisystem-Sicherheit

Schreibzugriffe auf Produktionspfade (`apps/api/uploads/`, `apps/api/content/`, `apps/api/backups/`, `apps/api/data/`) → Befund (Kritisch).

Temporäre Schreibzugriffe ohne `os.tmpdir()` oder `tests/.runtime` und ohne Cleanup → Befund (Mittel).

## Schritt 6: Bericht

```markdown
# Test Quality Review — Projekt Manager
**Datum:** <DATUM>

## Kennzahlen
| Ebene | Dateien | Testfunktionen |
|---|---|---|
| Unit | N | N |
| Integration | N | N |
| Browser | N | N |
| Gesamt | N | N |

## Befunde
### Kritisch
### Hoch
### Mittel
### Niedrig

## Empfehlungen
```

## Schritt 7: Änderungsaufträge

- Pro Befund Kritisch/Hoch → eigenständiger Änderungsauftrag im Format `docs/task-template.md`
- Pro Befund Mittel → gebündelter Auftrag
- Befunde Niedrig → Gesamtliste ohne Einzelauftrag

Bauplan: `docs/skill-documentation/test-quality-review.md`
