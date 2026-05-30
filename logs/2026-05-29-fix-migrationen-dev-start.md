# Log: Migrationen und Dev-Start

**Datum:** 29.05.26  
**Uhrzeit:** 05:35:18  
**Schritt:** Fix — Migrationen nachholen und Dev-Start prüfen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der aktuelle Migrationsstand wurde über das bestehende Legacy-SQL-/Journalformat geprüft und lokal angewendet. `npm run db:migrate` lief erfolgreich durch, inklusive Shared-Types-Build, API-Build, Kopieren der Migrationen nach `dist` und Ausführung des API-Migrators. Anschließend wurde das Migrationsjournal gegen die lokale Dev-Datenbank abgeglichen; es gibt keine ausstehenden Journal-Einträge, und der neueste angewendete Zeitstempel gehört zu `0036_wiki_page_notes`. Danach wurde `npm run dev` als Smoke-Start ausgeführt. API-Health und Web-Root antworteten jeweils mit HTTP 200, anschließend wurde der gestartete Prozessbaum wieder beendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/data/taskmanager.sqlite` | lokal geändert | Dev-Datenbank auf den aktuellen Migrationsstand gebracht |
| `logs/2026-05-29-fix-migrationen-dev-start.md` | neu | Schritt-Log für Migration und Dev-Start |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Keine. Beim Dev-Start wurden bestehende Laufzeitwarnungen ausgegeben: MCP HTTP Auth ist für den lokalen Tunnel deaktiviert, und Node meldet eine Deprecation-Warnung zu `util._extend`. Beide Warnungen blockierten den Start nicht.

## Offene Punkte / Folgeaufgaben

Keine.
