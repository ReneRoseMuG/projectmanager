# Log: MCP-Tools-Doku um Tag-Tools ergänzt

**Datum:** 12.06.26  
**Uhrzeit:** 09:10:43  
**Schritt:** Doku — `docs/MCP-Tools.md` um die drei neuen Tag-Tools erweitern  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Folgeauftrag „docs ergänzen" zur MCP-Tag-Erweiterung (siehe `logs/2026-06-12-09-06-42-feature-mcp-tag-tools.md`). Die zentrale Tool-Referenz `docs/MCP-Tools.md` wurde gezielt um die drei neuen Tools aktualisiert (agents.md §13.3 — nur betroffene Abschnitte, keine Neuschrift):

- Stand-Datum auf 12.06.26 gesetzt.
- `list_tags` in den Abschnitt „Lesende Tools" aufgenommen (Lookup für die Tag-Tools).
- `add_tags_to_parent` und `remove_tags_from_parent` in „Schreibende Tools" ergänzt, inkl. Eingaben (`tags[]` per Name) und Ergebnisfeldern (`added`/`created`/`alreadyPresent` bzw. `removed`/`notPresent`).
- Zeile „Tags → project, milestone, task, ticket" in der Matrix „Unterstützte Parent-Typen" ergänzt.

Geprüft, dass `apps/mcp-server/README.md` keine Tool-Liste führt (nur Betrieb/Umgebung) — daher dort keine Änderung nötig. Die Skill-Bauplan-Dateien unter `docs/skill-documentation/` beschreiben Skills, nicht die Tool-Matrix, und blieben unberührt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `docs/MCP-Tools.md` | geändert | Stand-Datum; `list_tags`; `add_tags_to_parent`/`remove_tags_from_parent`; Parent-Typen-Zeile „Tags" |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
