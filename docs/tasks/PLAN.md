# Plan: Projekt-Manager-MCP lokal in ChatGPT testen

## Verständliche Zusammenfassung

ChatGPT kann deinen lokalen MCP-Server nicht direkt über `localhost` oder `stdio` nutzen. Für den lokalen Test braucht jede aktive Repo-Kopie, also Homeoffice oder Büro, einen lokal laufenden Projekt-Manager-API-Server, den MCP-HTTP-Server und einen HTTPS-Tunnel zu diesem lokalen MCP-Endpunkt.

Die Codeänderung selbst muss nur einmal umgesetzt, committed und in die jeweils andere Repo-Kopie gepullt werden. Die lokale Einrichtung mit `.env`, API-Key, Startbefehlen, Tunnel und ChatGPT-Connector-URL muss aber pro Maschine/Repo-Kopie erfolgen, weil Homeoffice und Büro verschiedene lokale Rechner, Ports und Tunnel-URLs haben.

## Was Ich Plane

Ich plane einen sicheren lokalen ChatGPT-Testmodus für `apps/mcp-server`, ohne zentralen Produktivbetrieb und ohne Änderungen an API, Web-App oder Datenbank. Der MCP-Server bleibt standardmäßig geschützt; für ChatGPT-Developer-Mode wird ein expliziter lokaler No-Auth-Testmodus ergänzt, weil ChatGPT-Apps laut OpenAI-Doku remote erreichbare HTTPS-MCP-Endpunkte verwenden und für Apps OAuth, No Auth oder Mixed Auth vorgesehen sind.

OpenAI-Grundlagen: ChatGPT-Connector per HTTPS-MCP-URL, Developer Mode, Streamable HTTP/SSE und lokale Server nur über Tunnel.  
Quellen: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt, https://developers.openai.com/api/docs/guides/developer-mode, https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt-beta

## Betroffene Dateien Und Änderungen

- `apps/mcp-server/src/config.ts` und HTTP-Startlogik: Auth-Modus explizit machen, z. B. `MCP_HTTP_AUTH_MODE=bearer|none`, Default `bearer`; `none` nur als bewusst gesetzter lokaler ChatGPT-Testmodus mit deutlicher Warnung.
- `apps/mcp-server/src/http.ts`: HTTP-Transport so kapseln, dass er in Tests mit echtem Streamable-HTTP-Client prüfbar ist; bestehender Bearer-Schutz bleibt der Standard.
- `apps/mcp-server/README.md`, `apps/mcp-server/.env.example`, `docs/MCP-Tools.md`: Doku korrigieren, ChatGPT-Local-Test mit PowerShell-Befehlen, Tunnel-URL und ChatGPT-Connector-Schritten beschreiben.
- Keine Änderungen an Datenbankschema, API-Routen, Web-UI, TanStack Query, Permissions oder Migrationen.
- Bei Umsetzung: vorhandene uncommitted Änderungen im Arbeitsbaum nicht berühren; kein Branch ohne ausdrücklichen Wunsch.

## Auswirkungen, Risiken Und Abnahme

Der lokale Testfluss wird: API starten, MCP-Server im lokalen ChatGPT-Testmodus starten, per ngrok/Cloudflare/OpenAI Secure MCP Tunnel als HTTPS verfügbar machen, in ChatGPT Developer Mode als Connector anlegen, Tools auswählen und mit Testdaten ausführen.

Schadenspotential: mittel bis hoch, weil MCP-Schreibtools Projekt-Manager-Daten ändern können. Begrenzung: No-Auth nur explizit für lokalen Test, Tunnel nach Test beenden, keine produktive DB für Abnahmetests verwenden, ChatGPT-Write-Bestätigungen prüfen.

Akzeptiert ist die Änderung, wenn ChatGPT die Projekt-Manager-Tools listen kann, ein lesendes Tool funktioniert, ein schreibendes Tool nach Bestätigung gegen eine Testdatenbank wirkt und der Server ohne expliziten Testmodus nicht ungeschützt startet.

## Ausführlicher Testplan

Testentwurfs-Skill angewendet. Testebenen: Unit, Integration, manueller ChatGPT-Abnahmetest. Echte Daten/Isolation: Integration gegen echte isolierte Test-API mit Temp-SQLite und Temp-Upload-Verzeichnis; keine produktive DB, keine produktiven Uploads. Mocks nur in bestehenden Unit-Tests für den MCP-Toolkern.

- Unit: Konfiguration prüft Default `bearer`, fehlenden Bearer-Token im Bearer-Modus, expliziten `none`-Modus, ungültige Auth-Modi und Warn-/Fehlerpfade.
- Unit: HTTP-Auth-Helfer akzeptiert nur passende Bearer-Header; fehlende, falsche und falsch formatierte Header bleiben abgelehnt.
- Unit: Tool-Annotationen bleiben korrekt: `list_*`, `get_*`, `resolve_reference` sind read-only; Create/Update/Link/Add-Tools sind Write-Tools.
- Integration: Streamable-HTTP-MCP mit Bearer-Modus lehnt Requests ohne/falschen Header ab und akzeptiert korrekten Header.
- Integration: Streamable-HTTP-MCP im expliziten lokalen No-Auth-Modus erlaubt `initialize`/`listTools` ohne Header und liefert die erwarteten Projekt-Manager-Tools.
- Integration: Falscher MCP-Pfad liefert JSON-RPC-kompatible Fehlerantwort.
- Bestehende Integration bleibt: jedes registrierte MCP-Tool wird einmal gegen echte isolierte App-Daten ausgeführt.
- Manuelle ChatGPT-Abnahme: mit Testdatenbank starten, HTTPS-Tunnel öffnen, Connector in ChatGPT anlegen, `list_projects` ausführen, ein Testprojekt oder Testtask erstellen, Tool-Payload und Ergebnis in ChatGPT prüfen, Tunnel wieder beenden.

Serielle Prüfkommandos für die Umsetzung:

```powershell
npm run build -w apps/mcp-server
npm run test -w apps/mcp-server
npm run test -w apps/api
npm run build
```

## Annahmen

- Zielbetrieb ist ausdrücklich **lokaler Test**, nicht zentraler Produktivbetrieb.
- Homeoffice und Büro sind getrennte lokale Repo-Kopien: Code nur einmal ändern und verteilen, lokale `.env`/Tunnel/ChatGPT-Connector-Konfiguration je Umgebung einrichten.
- Für eine spätere dauerhafte Nutzung wäre ein zentraler HTTPS-Betrieb mit OAuth oder vorgeschaltetem Auth-Gateway der bessere Folgeplan.
