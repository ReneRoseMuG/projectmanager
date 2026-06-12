# Log: Benutzerdokumentation für den MCP (alle Werkzeuge)

**Datum:** 12.06.26  
**Uhrzeit:** 09:31:36  
**Schritt:** Doku — Anwender-Benutzerhandbuch für alle MCP-Werkzeuge (Ziel: Wiki-Seite WIKI-19)  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Auf Wunsch eine Benutzerdokumentation erstellt, die alle verfügbaren MCP-Werkzeuge und ihre Funktion in anwenderfreundlicher Sprache beschreibt (Fokus Lesbarkeit, technische Details minimiert). Quelle und Verifikation: die tatsächlichen Tool-Registrierungen in `apps/mcp-server/src/tools.ts` (60 Werkzeuge, per Code-Grep abgeglichen) sowie die technische Referenz `docs/MCP-Tools.md`.

Die Doku gruppiert die Werkzeuge nach Tätigkeit (Überblick/Suchen, Anlegen, Ändern, Verknüpfen, Tags, Kommentare/Notizen/Dateien, Berichte, Löschen) statt nach technischer Schicht, erklärt Kurzkennungen (PROJ-/MS-/TASK-/TKT-/FEAT-/UC-) und gibt Sicherheitshinweise (Löschvorschau, lesende Werkzeuge unkritisch, Journal).

Dabei festgestellt: `create_backlog_item` und `update_backlog_item` sind im MCP vorhanden, fehlen aber in `docs/MCP-Tools.md`. In der Benutzerdoku sind sie enthalten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `docs/wiki/WIKI-19-mcp-benutzerhandbuch.md` | neu | Anwender-Benutzerhandbuch für alle 60 MCP-Werkzeuge |

## Probleme und Abweichungen

- **Blocker — Veröffentlichung in WIKI-19 nicht über MCP möglich:** Der Projekt-Manager-MCP stellt keine Wiki-Werkzeuge bereit (kein Lesen/Erstellen/Aktualisieren von Wiki-Seiten); `resolve_reference("WIKI-19")` wird mit „Ungültige Referenz" abgelehnt. Die Doku konnte daher nicht direkt in WIKI-19 geschrieben werden. Sie wurde als Markdown-Datei abgelegt und dem Nutzer übergeben; der Übernahmeweg in die Wiki-Seite (Copy-Paste oder direkter API-Schreibzugriff) ist mit dem Nutzer abzustimmen.

## Offene Punkte / Folgeaufgaben

- Übernahme des Inhalts in WIKI-19 (durch den Nutzer oder, nach Bestätigung, über die laufende App-API).
- Optional: `docs/MCP-Tools.md` um `create_backlog_item`/`update_backlog_item` ergänzen (bestehende Lücke, nicht Teil dieses Auftrags).
- Optional: MCP um Wiki-Werkzeuge erweitern, falls Wiki-Pflege über den MCP gewünscht ist.
