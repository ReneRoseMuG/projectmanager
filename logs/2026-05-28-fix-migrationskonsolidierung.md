# Log: Migrationskonsolidierung

**Datum:** 28.05.26  
**Schritt:** Fix — Migrationskonsolidierung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die gelöschten Legacy-Migrationen `0000` bis `0027` wurden zu einer konsolidierten Baseline zusammengeführt. Die neue Baseline enthält die bisherigen SQL-Schritte mechanisch aus der letzten vorhandenen Git-Version und behält den ursprünglichen Zeitstempel der ersten Migration, damit bestehende Datenbanken mit bereits angewendeter `0000`-Migration nicht erneut initialisiert werden. Das Drizzle-Journal wurde auf die neue Baseline sowie die weiterhin vorhandenen Folgemigrationen `0028` bis `0033` reduziert. Dadurch verweist der Migrationslauf wieder ausschließlich auf vorhandene SQL-Dateien. Der API-Build, ein frischer isolierter Migrationslauf, der echte API-Migrationsbefehl und ein kurz kontrollierter `npm run dev`-Smoke-Start wurden erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/migrations/0000_consolidated_legacy_schema.sql` | neu | Konsolidierte Baseline für die entfernten Migrationen `0000` bis `0027` |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Journal auf Baseline plus `0028` bis `0033` reduziert |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Keine. Teilmigrierte Alt-Datenbanken, denen nur ein Teil der alten Migrationen `0000` bis `0027` fehlt, bleiben ein nicht automatisch lösbarer Sonderfall und wurden nicht stillschweigend repariert.

## Offene Punkte / Folgeaufgaben

Keine.

## Testleitplanken und Prüfung

Der Testentwurfs-Skill wurde für den isolierten Migrationscheck angewendet. Testebene: integrationsnaher Migrationscheck mit echter SQLite-Datei unter `tests/.runtime`. Geprüft wurde, dass eine frische Datenbank die konsolidierte Baseline und alle Folgemigrationen ohne Mocks erfolgreich ausführt. Zusätzlich wurde `npm run dev` kurz gestartet, bis Web, MCP und API sichtbar bereit waren, und danach wieder beendet.
