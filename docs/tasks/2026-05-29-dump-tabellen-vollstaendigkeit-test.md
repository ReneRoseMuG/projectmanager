# Codex-Auftrag: Dump-Vollständigkeit automatisch prüfen

## Kontext

Der Dump-Service (`apps/api/src/services/dump.service.ts`) pflegt ein statisches Array
`DUMP_TABLES`, das alle zu sichernden SQLite-Tabellen auflistet. Bei einer manuellen Prüfung
(2026-05-29) wurde festgestellt:

- Alle Tabellen aus den Migrationen 0033–0036 sind im Array korrekt erfasst.
- Es existiert jedoch **kein automatisierter Test**, der sicherstellt, dass nach einer
  künftigen Migration nicht versehentlich eine Tabelle im Dump-Array vergessen wird.
- Die Datei `apps/api/data/last-backup-manifest.json` stammt aus der Zeit vor diesen
  Migrationen; sie ist kein Fehler, zeigt aber, dass ältere Backups neuere Tabellen nicht
  enthalten — die Restore-Logik muss das korrekt handhaben.

## Aufgaben

### 1. Unit-Test: DUMP_TABLES vs. Live-Schema

Füge in `tests/unit/` (oder einem passenden Unterordner) einen neuen Test hinzu, der:

1. Eine In-Memory-SQLite-Datenbank anlegt und alle Migrationen aus
   `apps/api/src/db/migrations/` in Reihenfolge ausführt.
2. Alle tatsächlichen Tabellennamen per `SELECT name FROM sqlite_master WHERE type='table'`
   liest, dabei interne Tabellen herausfiltert:
   - Präfix `__new_` (temporäre Umbenennungstabellen)
   - `sqlite_*` (SQLite-Systemtabellen)
   - `seed_runs`, `seed_run_items` (Seeding-Systemtabellen, absichtlich vom Dump ausgeschlossen)
   - `_drizzle_migrations` (falls vorhanden)
3. Diese Live-Tabellen mit `DUMP_TABLES.map(t => t.tableName)` vergleicht.
4. Den Test **fehlschlägt**, wenn eine Live-Tabelle nicht in `DUMP_TABLES` enthalten ist,
   mit einer klaren Fehlermeldung wie:
   `Tabelle "xyz" existiert im Schema, fehlt aber in DUMP_TABLES`
5. Den Test ebenso **fehlschlägt**, wenn ein Eintrag in `DUMP_TABLES` auf eine Tabelle
   verweist, die im Schema nicht existiert (verwaister Eintrag).

**Wichtig:** Der Test soll in der normalen Test-Pipeline laufen (kein separater Schritt
nötig). Verwende denselben Mechanismus wie andere Unit-Tests (Vitest).

### 2. Restore-Robustheit bei alten Backups

Untersuche in `dump.service.ts` die Import/Apply-Logik (Funktion, die eine ZIP-Datei
einliest und Tabellen wiederherstellt):

- Prüfe, ob fehlende Tabellenschlüssel im Backup-JSON (z. B. ein Backup vor Migration 0034
  enthält kein `wikiPageNotes`) **stillschweigend übersprungen** oder als Fehler behandelt
  werden.
- Erwartetes Verhalten: Fehlende Schlüssel werden mit einer Warnung übersprungen (kein
  Abbruch), vorhandene Zeilen werden normal importiert.
- Falls die aktuelle Implementierung bei fehlenden Schlüsseln abbricht oder wirft, korrigiere
  das entsprechend.

### 3. Dokumentation der Ausschlüsse

Füge direkt über `DUMP_TABLES` in `dump.service.ts` einen Kommentar ein, der erklärt,
welche Tabellen absichtlich **nicht** gesichert werden und warum:

```typescript
/**
 * Tabellen, die absichtlich vom Dump ausgeschlossen sind:
 * - seed_runs / seed_run_items: reine Seeding-Metadaten, nicht produktionsrelevant
 *
 * Beim Hinzufügen einer neuen Migration: Tabelle hier eintragen oder bewusst ausschließen.
 * Der Unit-Test "dump-table-coverage" schlägt fehl, wenn eine Tabelle vergessen wird.
 */
```

## Nicht im Scope

- Keine Änderungen am Backup-Format oder an `DUMP_FORMAT_VERSION`.
- Keine Änderungen an der SFTP- oder lokalen Backup-Logik.
- Keine neuen API-Endpunkte.

## Akzeptanzkriterien

- [ ] `pnpm test` läuft durch, inklusive des neuen Tabellen-Coverage-Tests.
- [ ] Der Test schlägt fehl, wenn testweise ein Eintrag aus `DUMP_TABLES` entfernt wird.
- [ ] Restore-Logik verarbeitet alte Backups (fehlende Schlüssel) ohne Exception.
- [ ] Kommentar über `DUMP_TABLES` ist vorhanden.
