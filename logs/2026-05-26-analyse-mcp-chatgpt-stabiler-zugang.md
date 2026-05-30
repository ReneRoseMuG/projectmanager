# Log: MCP-ChatGPT stabiler Zugang

**Datum:** 26.05.26  
**Schritt:** Analyse — MCP-ChatGPT stabiler Zugang Home/Büro  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die heutige Session hat den Fehlerzustand des ChatGPT-Zugriffs auf den lokalen Projekt-Manager-MCP-Server eingegrenzt. Die lokale `.env.local` ist grundsätzlich vorhanden und `PROJECT_MANAGER_MCP_AUTOSTART=true` ist gesetzt, sodass `npm run dev` im Repo-Root den lokalen MCP-HTTP-Server mitstarten kann. Gleichzeitig ist `PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART=false` gesetzt, daher startet der öffentliche Zugang für ChatGPT nicht automatisch. Die eingetragene `MCP_PUBLIC_URL` verweist auf einen Cloudflare-Quick-Tunnel vom 25.05.26; diese URL war am 26.05.26 nicht mehr per DNS auflösbar und erklärt den von ChatGPT gemeldeten `Network Error`. Der alte Tunnel-Log und der Schritt-Log vom 25.05.26 bestätigen, dass der Quick-Tunnel nur für einen sofortigen Test geeignet war und keine stabile Einmal-Einrichtung darstellt.

Als Zielbild wurde festgehalten, dass ChatGPT nach einmaliger Einrichtung dauerhaft und reproduzierbar auf den MCP-Server zugreifen soll. Für Homeoffice und Büro soll dieselbe Struktur nutzbar sein, aber mit jeweils eigenem Standortprofil und Connector. Der passende Weg ist ein stabiler Tunnel pro Standort, bevorzugt OpenAI Secure MCP Tunnel, weil ChatGPT lokale MCP-Server nicht direkt anspricht und der private MCP-Server dabei nicht öffentlich exponiert werden muss.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-26-analyse-mcp-chatgpt-stabiler-zugang.md` | neu | Session-Log zur ChatGPT-MCP-Analyse und den fehlenden Anforderungen |
| `logs/README.md` | geändert | Log-Index um den neuen Analyse-Eintrag ergänzt |

## Probleme und Abweichungen

Der Auftrag konnte nur als Analyse und Anforderungslog abgeschlossen werden, weil für die stabile Zielkonfiguration noch externe Voraussetzungen fehlen. Auf dem Homeoffice-Rechner ist kein `tunnel-client` im `PATH` vorhanden. Es liegt außerdem noch kein OpenAI-Tunnelprofil mit `tunnel_id` und Runtime-API-Key vor, das lokal in `.env.local` oder einer separaten nicht versionierten Tunnel-Konfiguration genutzt werden könnte. Die vorhandene Cloudflare-Konfiguration nutzt Reste eines Quick-Tunnels; ein benannter Cloudflare-Tunnel mit stabiler Domain oder eine OpenAI-Secure-MCP-Tunnel-Konfiguration ist noch nicht eingerichtet. Zusätzlich ist `cloudflared` nicht global im `PATH`, obwohl eine portable Version unter `.local-ai/cloudflared.exe` vorhanden ist.

## Offene Punkte / Folgeaufgaben

- OpenAI Secure MCP Tunnel oder alternativ einen benannten Cloudflare-/ngrok-Tunnel als verbindliche Lösung auswählen.
- Für Homeoffice ein stabiles Tunnelprofil einrichten, inklusive `tunnel_id`, Runtime-Key beziehungsweise Tunnel-Token und reproduzierbarem Startbefehl.
- Für Büro dieselbe Struktur mit eigenem Standortprofil einrichten, zum Beispiel `Projekt Manager Home` und `Projekt Manager Büro` als getrennte ChatGPT-Connectoren.
- `.env.local.example` und die MCP-Dokumentation so anpassen, dass Quick-Tunnel nur noch als kurzfristiger Testpfad beschrieben wird und nicht als Zielzustand.
- `PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART=true` erst aktivieren, wenn der stabile Tunnelbefehl auf dem jeweiligen Rechner funktioniert.
- Nach Einrichtung verifizieren: lokaler MCP-HTTP-Server auf `127.0.0.1:3010/mcp`, Tunnel-Health, ChatGPT-Toolscan und mindestens ein lesender Toolaufruf.
