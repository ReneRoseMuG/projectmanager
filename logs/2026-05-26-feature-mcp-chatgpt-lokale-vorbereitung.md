# Log: MCP ChatGPT lokale Vorbereitung

**Datum:** 26.05.26  
**Schritt:** Feature — MCP ChatGPT lokale Vorbereitung  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die lokale Vorbereitung für eine stabile ChatGPT-Anbindung an den Projekt-Manager-MCP-Server wurde eingerichtet. Im Repo-Root wurde eine nicht versionierte `.env.local` mit lokal erzeugtem API-Key, aktiviertem MCP-Autostart, deaktiviertem Tunnel-Autostart sowie Platzhaltern für `OPENAI_TUNNEL_ID` und `CONTROL_PLANE_API_KEY` angelegt. Der offizielle OpenAI `tunnel-client` wurde als Windows-AMD64-Binary in `.local-ai/tunnel-client/` installiert; das Release-Archiv wurde vor der Installation gegen die veröffentlichte SHA256-Summe geprüft. Der MCP-Server wurde erfolgreich gebaut und ein lokaler Streamable-HTTP-Startcheck konnte 37 MCP-Tools listen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `.env.local` | neu, nicht versioniert | Lokale API- und MCP-Konfiguration mit deaktiviertem Tunnel-Autostart |
| `.local-ai/tunnel-client/tunnel-client.exe` | neu, nicht versioniert | Lokaler OpenAI Secure MCP Tunnel Client |
| `logs/2026-05-26-feature-mcp-chatgpt-lokale-vorbereitung.md` | neu | Schritt-Log zur lokalen MCP-/ChatGPT-Vorbereitung |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Die erste PowerShell-Variante zur Erzeugung des lokalen API-Keys nutzte zwei auf diesem Rechner nicht verfügbare moderne PowerShell/.NET-Aufrufe. Der Schritt wurde mit kompatiblen Methoden wiederholt und abgeschlossen. Der vollständige ChatGPT-Anschluss ist noch nicht abgeschlossen, weil dafür ein OpenAI-Tunnel in den Platform-Einstellungen, eine `tunnel_id` und ein Runtime-API-Key mit Tunnel-Berechtigung nötig sind. Diese Werte kann Codex nicht selbst aus dem Nutzerkonto erzeugen.

## Offene Punkte / Folgeaufgaben

- OpenAI Secure MCP Tunnel im Browser anlegen und `tunnel_id` notieren.
- Runtime-API-Key für den Tunnel erzeugen und lokal als `CONTROL_PLANE_API_KEY` hinterlegen.
- `tunnel-client init` mit dem Profil `projekt-manager-home` ausführen.
- `tunnel-client doctor --profile projekt-manager-home --explain` ausführen.
- ChatGPT-Connector über Verbindungstyp `Tunnel` erstellen und Tools scannen.
- Nach erfolgreicher Tunnel-Prüfung `PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART=true` aktivieren.
