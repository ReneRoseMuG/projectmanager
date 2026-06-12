# Bauplan: test-quality-review

## Zweck

Vollständige, reproduzierbare Qualitäts- und Abdeckungsanalyse des Projekt-Manager-Testbestands. Der Skill liest alle Testdateien, zählt Testfunktionen (nicht nur Dateien), prüft die Konformität mit der Teststrategie aus `agents.md` (Abschnitte 11 und 12), identifiziert Abdeckungslücken und Qualitätsmängel, und erzeugt am Ende einen strukturierten Bericht mit priorisierten Änderungsaufträgen.

## Trigger

Der Skill wird verwendet wenn der Nutzer formuliert: „Testanalyse", „Testbericht", „Testqualität prüfen", „Teststrategie-Konformität", „Testabdeckung prüfen", „Tests analysieren", „Qualitätsanalyse Tests" in Verbindung mit diesem Projekt.

## Referenzen

- `agents.md` Abschnitte 11 (Teststrategie) und 12 (Voller Testlauf)
- `.claude/skills/test-entwurfsleitplanken/SKILL.md`
- `tests/` — zentrale Testhierarchie

## Testhierarchie (Pflicht bekannt vor Analyse)

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
├── fixtures/       ← Test-Fixtures und Test-Helper
├── setup/          ← Test-Setups
└── .runtime/       ← generierte Testlaufdaten (ignoriert)
```

## Schritt 0 — Vorbereitung

### 0.1 Verzeichnis kartieren

Alle Testdateien unter `tests/` erfassen (`*.test.ts`, `*.spec.ts`).

### 0.2 Zählung

- Anzahl Testdateien pro Ebene (unit / integration / browser)
- Anzahl Testfunktionen (`it(` / `test(`) pro Ebene — nicht nur Dateizählung
- Ergebnis als Ausgangsbasis für den Bericht

## Schritt 1 — Teststrategie-Konformität (agents.md §11)

### 1.1 DB-Isolation in Unit-Tests

Prüfen ob Unit-Tests echte DB-Verbindungen (`drizzle`, `db.`, `mysql2`) verwenden.
Jeder Treffer ist ein Befund — Unit-Tests dürfen keine echte DB-Verbindung haben.

### 1.2 Produktions-DB-Zugriff

Prüfen ob Tests auf `apps/api/data/` schreiben oder lesen.
Jeder Treffer ist ein kritischer Befund.

### 1.3 Testdaten-Isolation

Prüfen ob Integrationstests eigene Temp-DB oder In-Memory-DB verwenden (via `tests/fixtures/`).
Direktzugriff auf produktive SQLite-Datei → Befund.

### 1.4 Pflicht-Kommentar in neuen Testdateien

Prüfen ob neue Testdateien den Pflichtkommentar enthalten:
```
Test Scope / Abgedeckte Regeln / Fehlerfälle / Ziel
```
Fehlender Kommentar → Befund (Niedrig).

### 1.5 Leere Tests und Skips

Prüfen auf `test.skip`, `it.skip`, `describe.skip` oder leere Testkörper ohne dokumentierten Blocker im Log.
Jeder undokumentierte Skip → Befund.

### 1.6 Berechtigungstests

Prüfen ob geschützte Routen und Workflows Berechtigungstests haben:
- Mindestens ein positiver Fall (mit Berechtigung)
- Mindestens ein negativer Fall (ohne Berechtigung)

Fehlende Berechtigungstests bei API-Routen → Befund (Hoch).

### 1.7 expectedVersion in Update-Tests

Prüfen ob Integrationstests für Update-Endpunkte versionierter Objekte `expectedVersion` explizit mitsenden.
Fehlend → Befund (Mittel).

## Schritt 2 — Domänen-Abdeckung

Prüfen ob alle drei Domänen und die Querschnittsinfrastruktur Integrationstests haben:

| Domäne | Kern-Entitäten | Abgedeckt? |
|---|---|---|
| Projektmanagement | projects, milestones, tasks | — |
| Dokumentation | features, useCases, wikiPages | — |
| Tickets | tickets, ticketRelations | — |
| Tags | projectTags, milestoneTags, taskTags, ticketTags | — |
| Notes | projectNotes, milestoneNotes, taskNotes, ticketNotes | — |
| Attachments | projectAttachments, milestoneAttachments etc. | — |
| Comments | projectComments, taskComments etc. | — |
| Auth & Rollen | Permissions, Session, Guards | — |
| Journal | journal entries, objectJournal | — |

Fehlende Domänen-Abdeckung → Befund (Hoch für Kerndomänen, Mittel für Infrastruktur).

## Schritt 3 — Dump- und Fixture-Vollständigkeit

### 3.1 truncateAll-Vollständigkeit

Prüfen ob `tests/fixtures/api/db.ts` → `truncateAll` alle aktuellen Anwendungstabellen aus `schema.ts` enthält.
Fehlende Tabelle → Befund (Hoch).

### 3.2 Dump-Roundtrip-Test

Prüfen ob `tests/integration/api/dumps-local.test.ts` für neue Tabellen repräsentative Seed-Daten enthält.
Fehlend → Befund (Mittel).

## Schritt 4 — Methodische Qualität

### 4.1 Zu schwache Assertions

Prüfen auf Assertions wie `toBeTruthy()`, `toBeDefined()` dort wo spezifische Werte prüfbar wären.
Befund: welche Stellen könnten auf konkrete Werte verschärft werden.

### 4.2 Mehrfach-Status-Erwartungen

Prüfen ob `expect([200, 201]).toContain(status)` statt eines konkreten Status verwendet wird.
Jeder Treffer → Befund (Mittel) — jede Route hat genau einen erwarteten Status.

### 4.3 Async/Await-Konsistenz

Prüfen ob `async/await` in Testfunktionen konsistent verwendet wird (kein gemischtes Promise-Callback-Muster).

## Schritt 5 — Dateisystem-Sicherheit

### 5.1 Schreibzugriffe auf Produktionspfade

Prüfen ob Tests auf Produktionsverzeichnisse schreiben:
- `apps/api/uploads/`
- `apps/api/content/`
- `apps/api/backups/`
- `apps/api/data/`

Jeder Treffer → Befund (Kritisch).

### 5.2 Temporäre Pfade korrekt

Prüfen ob temporäre Schreibzugriffe `os.tmpdir()` oder `tests/.runtime/` verwenden und Cleanup in `afterEach`/`afterAll` erfolgt.
Fehlender Cleanup → Befund (Mittel).

## Schritt 6 — Bericht erstellen

Markdown-Artefakt mit:

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

## Befunde nach Schweregrad

### Kritisch
...

### Hoch
...

### Mittel
...

### Niedrig
...

## Empfehlungen
...
```

## Schritt 7 — Änderungsaufträge

Pro Befund Hoch und Kritisch: einen eigenständigen Änderungsauftrag im Format der `docs/task-template.md` ausgeben.

Pro Befund Mittel: Zusammenfassung in einem gebündelten Auftrag.

Befunde Niedrig: in Gesamtliste ohne Einzelauftrag.

## Implementierungshinweise für den Skill-Bau

- Trigger-Beschreibung muss projektspezifisch sein (nicht MuGPlan)
- Testkommandos aus `agents.md` §12 verwenden
- Alle Grep-Pfade relativ zu `tests/` — nie absolute Pfade
- Bericht wird im Chat ausgegeben, nicht als Datei gespeichert
- Skill folgt Auftragsklasse 2 (reiner Report) — keine Codeänderungen
