# Log: Node 24 SQLite Binding

**Datum:** 16.05.26  
**Schritt:** Fix / Feature  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Node-Blocker wurde fachlich auf die unveränderbare lokale Node-24-Umgebung ausgerichtet. Die alte `better-sqlite3`-Version `^9.6.0` wurde im API-Workspace auf `^12.10.0` aktualisiert, weil diese Version laut npm Node `24.x` unterstützt. Die Repo-Konfiguration wurde angepasst: `.nvmrc` verweist jetzt auf Node 24, und das Root-`engines`-Feld erlaubt `20.x || 22.x || 24.x`. Nach der Installation lädt das native SQLite-Binding unter `v24.12.0` erfolgreich. Die Datenbankmigration, Build und Lint laufen fehlerfrei.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `.nvmrc` | geändert | Node-Version von `20` auf `24` angepasst |
| `package.json` | geändert | Node-Engine auf `20.x || 22.x || 24.x` erweitert |
| `apps/api/package.json` | geändert | `better-sqlite3` auf `^12.10.0` aktualisiert |
| `package-lock.json` | geändert | Lockfile nach Dependency-Aktualisierung erneuert |
| `logs/2026-05-16-fix-node24-sqlite-binding.md` | neu | Schritt-Log für den Node-24-Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der volle API-Testlauf erreicht jetzt die fachlichen Assertions und scheitert nicht mehr am nativen Node-Binding. Es bleiben 13 bestehende fachliche Testfehler offen: überwiegend DELETE-Endpunkte mit Status `200` statt erwartetem `204` sowie ein Subtask-Tiefenfall mit `201` statt erwartetem `400`. Diese Fehler wurden nicht im Rahmen dieses Fixes korrigiert, weil der Auftrag auf den Node-24-Blocker begrenzt war.

## Offene Punkte / Folgeaufgaben

Die 13 verbleibenden fachlichen API-Testfehler sollten in einem separaten Folgeauftrag bereinigt werden.
