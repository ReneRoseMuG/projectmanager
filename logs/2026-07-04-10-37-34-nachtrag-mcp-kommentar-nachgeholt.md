# Log: Nachtrag — MCP-Abschlusskommentar nachgeholt (MS-75 Migrations-Fix)

**Datum:** 04.07.26  
**Uhrzeit:** 10:37:34  
**Schritt:** Auflösung des Blockers aus Nachtrag 07:33:00 (MCP-Kommentar)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der zuvor blockierte Abschlusskommentar (agents.md §13.1.1) wurde nachgeholt. Nach dem App-Neustart durch den Nutzer war die MCP-Verbindung wieder erreichbar — der vorherige Fehlschlag hatte zwei Ursachen: erst der Auto-Mode-Wächter (External System Write), dann ein Verbindungsproblem des MCP-Servers zur lokalen API (`fetch failed`, IPv4/IPv6-Loopback), das sich mit dem Neustart erledigte. Auf ausdrücklichen Nutzerauftrag wurden beide Kommentare über den regulären MCP-Weg geschrieben:

- PROJ-3 (Standard-Log-Ziel): Kommentar id=148
- MS-75 (Meilenstein, Auftragskontext, aufgelöst via `resolve_reference` → DB-id 75): Kommentar id=149

Dabei wurde nebenbei der Fix verifiziert: Die MS-75-Antwort liefert an Tags das neue Feld `isSystem` — die Spalte `tags.is_system` existiert also und wird von der API sauber gelesen. Das bestätigt, dass die reparierte Migration `20260703085813_parched_unus` vollständig durchgelaufen ist (Nutzer meldete „Update fehlerfrei gelaufen").

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| — | — | Keine Codeänderung; nur MCP-Kommentare + dieser Nachtrags-Log |

## Probleme und Abweichungen

Keine. Der im Nachtrag von 07:33:00 dokumentierte Blocker (MCP-Kommentar nicht schreibbar) ist damit aufgelöst.

## Offene Punkte / Folgeaufgaben

- Automatisierte DMS-Tests weiterhin offen (bekannte Test-DB-Zeitüberschreitung).
- Architektur-Leitfaden-Ergänzung zum DMS-Datenmodell, sobald das Schema final ist.
- Optional: dauerhafte Permission-Regel für `add_comment_to_parent`/`add_note_to_parent`, damit künftige Abschlusskommentare nicht am Auto-Mode-Wächter hängen bleiben.
