# Log: MCP Büro Anleitung

**Datum:** 24.05.26  
**Schritt:** Fix / Dokumentation  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Es wurde eine verständliche Anleitung für die Büro-Konfiguration von MCP und ChatGPT unter `docs/` ergänzt. Die Anleitung beschreibt den Büro-Repo-Pfad, das Anlegen und Befüllen von `.env.local`, die stabile Tunnel-Konfiguration, Start über BAT oder Terminal, ChatGPT-Connector-Einrichtung und die weitere Nutzung von Claude Desktop. Zusätzlich wurde `docs/README.md` so aktualisiert, dass die neue Anleitung auffindbar ist. Es wurden keine Code-, API-, Datenbank- oder UI-Änderungen vorgenommen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `docs/mcp-chatgpt-buero-konfiguration.md` | neu | Schritt-für-Schritt-Anleitung für die Büro-Konfiguration |
| `docs/README.md` | geändert | Link auf die neue Anleitung ergänzt |
| `logs/2026-05-24-fix-mcp-buero-anleitung.md` | neu | Schritt-Log angelegt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Die echten Werte für `API_KEY`, `MCP_PUBLIC_URL` und `MCP_TUNNEL_COMMAND` müssen pro Büro-Rechner lokal in `.env.local` eingetragen werden.
