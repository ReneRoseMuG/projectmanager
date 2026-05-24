# Log: Referenz-Kontext MCP Skill

**Datum:** 24.05.26  
**Schritt:** Feature — Projekt-Manager-Referenzen automatisch lesen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der neue Repo-Skill `projekt-manager-referenz-lesen` wurde angelegt und beschreibt, wann Projekt-Manager-IDs automatisch über den MCP-Server gelesen werden. Der MCP-Server wurde um das read-only Tool `get_reference_context` erweitert, das Kurzreferenzen und eindeutige ausgeschriebene ID-Formen normalisiert und rekursiv Kinder, Notes, Attachments, Comments sowie relevante Relationen lädt. Die rekursive Logik liegt in einem eigenen Helper und dedupliziert bereits expandierte Objekte, damit verknüpfte Tasks, Tickets oder Features nicht endlos verfolgt werden. Attachments werden als Metadaten geladen; für textartige Dateien wird zusätzlich die vorhandene Preview gelesen. Die MCP-Dokumentation und die MCP-Unit- und Integrationstests wurden entsprechend erweitert.

Der Testentwurfs-Skill wurde angewendet. Betroffen sind MCP-Unit-Tests für Referenzparsing, Rekursionspfade, Deduplizierung und Attachment-Preview-Auswahl sowie MCP-Integrationstests mit echter Fastify-App, isolierter Temp-SQLite-Datenbank und Temp-Upload-Verzeichnis. Bewiesen wird, dass `get_reference_context` einen echten Projektkontext inklusive rekursiver Kinder und Supportobjekte über den MCP-Transport zurückgibt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `skills/projekt-manager-referenz-lesen/SKILL.md` | neu | Skill-Trigger und MCP-Leseablauf für Projekt-Manager-Referenzen |
| `skills/projekt-manager-referenz-lesen/agents/openai.yaml` | neu | UI-Metadaten und implizite Skill-Aktivierung |
| `apps/mcp-server/src/reference-context.ts` | neu | Rekursiver Referenz-Kontext-Builder |
| `apps/mcp-server/src/tools.ts` | geändert | `get_reference_context` registriert |
| `apps/mcp-server/src/tools.test.ts` | geändert | Unit-Tests für Parsing, Kontextbaum und Preview-Auswahl |
| `apps/mcp-server/src/tools.integration.test.ts` | geändert | Echter MCP-Kontexttest ergänzt |
| `docs/MCP-Tools.md` | geändert | Lesende Tools um Referenz-Kontext ergänzt |
| `logs/2026-05-24-feature-referenz-kontext-mcp-skill.md` | neu | Schritt-Log angelegt |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Das Skill-Creator-Initialisierungsskript und `quick_validate.py` konnten nicht ausgeführt werden, weil auf dem System kein `python`, `python3`, `py` oder `uv` verfügbar ist. Der Skill wurde deshalb manuell nach Skill-Creator-Struktur angelegt und zusätzlich per PowerShell auf Frontmatter und `allow_implicit_invocation` geprüft.

## Offene Punkte / Folgeaufgaben

`quick_validate.py` sollte nachgeholt werden, sobald ein Python-Launcher verfügbar ist. Die MCP-Prüfungen selbst sind grün: `npm run build -w apps/mcp-server` und `npm run test -w apps/mcp-server`.
