# Schritt-Log: Integrationstestsuite API

**Datum:** 16.05.2026  
**Auftragsklasse:** 5  
**Status:** Rot - Testsuite umgesetzt, API-Contract-Abweichungen dokumentiert

## Durchgeführt

- Produktiven API-Code auf DB-Injection umgebaut:
  - `buildApp(injectedDb)` dekoriert Fastify mit `app.db`.
  - `src/types.ts` ergänzt den Fastify-Typ um `db`.
  - Routes geben `app.db` an Services weiter.
  - Services nutzen keinen direkten Import des globalen `db`-Singletons mehr.
- Testabhängigkeiten installiert:
  - `vitest`
  - `@vitest/coverage-v8`
  - `supertest`
  - `@types/supertest`
- Peer-Dependency bereinigt:
  - Der erste Install zog `@vitest/coverage-v8@4.1.6`, was zu `vitest@1.6.1` inkompatibel war.
  - Korrigiert auf `@vitest/coverage-v8@1.6.1`.
- `apps/api/vitest.config.ts` angelegt.
- `apps/api/package.json` um Testskripte erweitert.
- Testinfrastruktur unter `apps/api/tests/helpers/` angelegt.
- Acht Integrationstestdateien unter `apps/api/tests/integration/` angelegt.

## Migration / Isolation

- Jede Testdatei nutzt eine eigene In-Memory-SQLite-Datenbank.
- Die produktiven Drizzle-Migrationen werden beim Aufbau der Testdatenbank ausgeführt.
- `foreign_key_check` läuft nach der Migration ohne Fehler.
- Vor jedem Test wird die Datenbank über `truncateAll` bereinigt.

## Verifikation

- `npm run build -w apps/api`: erfolgreich.
- `npm run lint -w apps/api`: erfolgreich.
- `npm ls vitest @vitest/coverage-v8 -w apps/api`: erfolgreich nach Versionsangleichung.
- Bestehende Tests `src/app.integration.test.ts` und `src/services/helpers.test.ts`: 4 bestanden, 0 fehlgeschlagen.

## Testergebnisse pro Datei

| Datei | Ergebnis |
|---|---:|
| `projects.test.ts` | 13 bestanden, 2 fehlgeschlagen |
| `tasks.test.ts` | 11 bestanden, 2 fehlgeschlagen |
| `subtasks.test.ts` | 5 bestanden, 1 fehlgeschlagen |
| `comments.test.ts` | 4 bestanden, 2 fehlgeschlagen |
| `tags.test.ts` | 8 bestanden, 2 fehlgeschlagen |
| `notes.test.ts` | 9 bestanden, 1 fehlgeschlagen |
| `events.test.ts` | 9 bestanden, 2 fehlgeschlagen |
| `attachments.test.ts` | 5 bestanden, 1 fehlgeschlagen |

Vollständiger Lauf:

- `npm run test:integration -w apps/api`
- Ergebnis: 64 bestanden, 13 fehlgeschlagen, 77 insgesamt.

## Fehlgeschlagene Contract-Fälle

### DELETE-Statuscode

Mehrere erfolgreiche DELETE-Endpunkte antworten aktuell mit `200 OK` und `{ ok: true }`, während die Integrationstests gemäß Auftrag `204 No Content` erwarten.

Betroffene Bereiche:

- Projekte
- Tasks
- Comments
- Tags
- Notes
- Events
- Attachments

Fehlermuster:

```text
expected 204 "No Content", got 200 "OK"
```

### Kommentar-Reihenfolge

`GET /api/tasks/:id/comments` liefert aktuell den neuesten Kommentar zuerst. Der Test erwartet chronologische Reihenfolge von alt nach neu.

Fehlermuster:

```text
expected 'Zweiter' to be 'Erster'
```

### Subtask-Tiefe

Die API erlaubt aktuell das Anlegen eines Subtasks unter einem Subtask. Der Test erwartet eine Begrenzung auf Tiefe 1 und damit `400 Bad Request`.

Fehlermuster:

```text
expected 400 "Bad Request", got 201 "Created"
```

## Hinweis zum Per-Datei-Aufruf

Der im Auftrag genannte Aufruf

```bash
npm run test:integration -w apps/api -- --reporter=verbose projects.test.ts
```

führt wegen des Scripts `vitest run tests/integration` weiterhin alle Dateien im Ordner aus. Für die echte serielle Per-Datei-Auswertung wurde deshalb mit explizitem Dateipfad ausgeführt:

```bash
npm exec -w apps/api -- vitest run tests/integration/<datei>.test.ts --reporter=verbose
```

## Nicht verändert

- Keine fachlichen API-Fixes an DELETE-Statuscodes.
- Keine Änderung an Kommentar-Sortierung.
- Keine Änderung an Subtask-Tiefenregeln.

Diese Punkte sind bewusst offen dokumentiert, weil der Auftrag während der Testläufe keine eigenständigen API-Bugfixes vorsieht.
