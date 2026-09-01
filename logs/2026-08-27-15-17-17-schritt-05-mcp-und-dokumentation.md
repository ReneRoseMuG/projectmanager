# Log: MCP und Dokumentation

**Datum:** 27.08.26  
**Uhrzeit:** 15:17:17  
**Schritt:** 5 — MCP, Dokumentation und Fixtures  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die MCP-Uploadwerkzeuge akzeptieren keine `libraryVisibility` mehr und erzeugen ausschließlich Parent-Anhänge. Für vorhandene DMS-Dokumente wurden getrennte Werkzeuge zum Lesen, Verknüpfen und Entknüpfen von Parent-Relationen ergänzt. Der Design-Leitfaden beschreibt die drei Dateiquellen, die ownerlokalen Parent-Ordner, die DMS-Kennzeichnung und die getrennte `documents`-Berechtigung verbindlich. Eine vollständige Aufgabendatei dokumentiert Ziel, Migration, Randfälle, Seiteneffekte, detaillierte Testmatrix und Abnahmekriterien. Die Testdatenbank-Bereinigung kennt sämtliche neuen Tabellen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/tools.ts` | geändert | Parent-Uploads getrennt und explizite DMS-Linktools ergänzt |
| `docs/design-leitfaden.md` | geändert | DMS- und Parent-Dateiansichten fachlich getrennt beschrieben |
| `docs/tasks/codex-auftrag-attachment-dms-trennung.md` | neu | Vollständiger Implementierungs- und Testauftrag |
| `tests/fixtures/api/app.ts` | geändert | Parent-Dateirouten in echten Test-Apps registriert |
| `tests/fixtures/api/db.ts` | geändert | Neue Link- und Ordnertabellen sicher bereinigt |

## Testleitplanken

Der Testentwurfs-Skill `test-entwurfsleitplanken` wurde angewendet. Die Aufgabendatei nennt konkrete Unit-, Integrations- und Browserfälle, echte Datenquellen, Isolation, Mock-Grenzen, Permission-Negativfälle und das verpflichtende Testdatei-Kommentarformat. Der MCP-Typecheck ist grün; die Laufzeittests werden im folgenden Testschritt nachgeführt.

## Probleme und Abweichungen

Der in `agents.md` referenzierte Skill `mugplan-codex-auftrag` war in dieser Sitzung nicht verfügbar. Die Aufgabendatei wurde deshalb direkt nach den verbindlichen Abschnittsvorgaben aus `agents.md` und dem vorhandenen Task-Template erstellt.

## Offene Punkte / Folgeaufgaben

Die bestehenden Legacy-Testannahmen zur DMS-Sichtbarkeitsauswahl und zum automatischen Hochstufen müssen noch auf den neuen Vertrag umgestellt werden.
