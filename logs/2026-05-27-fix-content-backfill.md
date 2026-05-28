# Log: Content Backfill

**Datum:** 27.05.26  
**Schritt:** Fix — Content Backfill  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die lokale Datenbankmigration wurde seriell mit `npm run db:migrate` ausgeführt und erfolgreich abgeschlossen. Anschließend wurde `node scripts/migrate-content-to-db.mjs` gestartet, um bestehende HTML-Inhalte aus `content_path`-Dateien in die neuen DB-Spalten zu übernehmen. Das Script hat 40 Feature-Inhalte, 250 Use-Case-Inhalte und 0 Wiki-Seiten-Inhalte migriert. Für sieben Use Cases fehlen die referenzierten Inhaltsdateien; diese Datensätze konnten deshalb nicht befüllt werden. Das Script wurde mit Exit-Code 1 beendet, damit der Teilabschluss sichtbar bleibt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/data/taskmanager.sqlite` | geändert | Migration angewendet und vorhandene Feature-/Use-Case-Inhalte teilweise in die DB übernommen |
| `logs/2026-05-27-fix-content-backfill.md` | neu | Schritt-Log für die lokale Backfill-Ausführung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Folgende Use-Case-Dateien fehlen und wurden nicht migriert:

- `content/usecases/usecase-243.md`
- `content/usecases/usecase-244.md`
- `content/usecases/usecase-245.md`
- `content/usecases/usecase-246.md`
- `content/usecases/usecase-247.md`
- `content/usecases/usecase-248.md`
- `content/usecases/usecase-249.md`

## Offene Punkte / Folgeaufgaben

Die fehlenden sieben Use-Case-Inhalte müssen entweder aus einem alten Backup wiederhergestellt, manuell nachgepflegt oder fachlich als leer akzeptiert werden. Danach kann das Backfill-Script erneut laufen; es ist idempotent und bearbeitet nur Datensätze mit `content IS NULL`.
