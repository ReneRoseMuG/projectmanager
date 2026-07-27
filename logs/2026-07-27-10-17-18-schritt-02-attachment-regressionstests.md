# Log: Attachment-Regressionstests

**Datum:** 27.07.26  
**Uhrzeit:** 10:17:18  
**Schritt:** 2 — Migration, Kaskaden und sichtbare Zähler absichern  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Ein neuer MySQL-Integrationstest erzeugt einen Legacy-Stand ohne Attachment-Fremdschlüssel sowie gültige und beidseitig verwaiste Junction-Zeilen. Er beweist Datenbereinigung, Erhalt gültiger Links, zwölf `CASCADE`-Constraints, Owner- und Attachment-Kaskaden sowie einen sicheren zweiten Migrationslauf. Der Task-Integrationstest bildet zusätzlich den gemeldeten Ablauf mit zwei Attachments nach und prüft nach dem endgültigen Löschen sowohl den Card-Counter als auch die Detail-Liste auf null. Der bestehende DMS-Test für künstlich verwaiste Owner-Links bleibt grün. Build und `git diff --check` wurden ebenfalls erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/integration/api/attachment-junction-fk-migration.test.ts` | neu | Reale MySQL-Migrations-, Wiederanlauf- und Kaskadenmatrix |
| `tests/integration/api/tasks.test.ts` | geändert | Regressionstest für Card-Counter und Detailanhänge |

## Probleme und Abweichungen

Der erste Testaufruf aus dem Repo-Root lud nicht die API-Testkonfiguration und wurde von MySQL mit fehlendem lokalem Testzugang abgewiesen; es wurden keine Daten verändert. Alle fachlich relevanten Läufe erfolgten anschließend korrekt über den API-Workspace. `delete-cascade.test.ts` wurde entgegen der ursprünglichen Dateiliste nicht erweitert, weil der neue datengetriebene Migrationstest bereits alle sechs Attachment-Junctions auf beiden Kaskadenseiten abdeckt und eine zweite Matrix dieselbe Logik dupliziert hätte.

## Offene Punkte / Folgeaufgaben

Keine.

## Testleitplanken

Angewendet wurde `test-entwurfsleitplanken`. Testebene ist Integration mit echter temporärer MySQL-Datenbank, echter Fastify-App und echtem temporärem Upload-Dateisystem. Es werden keine Mocks verwendet; produktive Dateien und produktive Testdaten bleiben unberührt.
