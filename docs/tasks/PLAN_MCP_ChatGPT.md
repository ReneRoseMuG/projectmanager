# Plan: MCP-Start in `npm run dev` und Startscript integrieren

## Zusammenfassung Für Dich

Ja: Die Erweiterung kann so eingebunden werden, dass nach einmaliger Konfiguration keine zusätzlichen Startschritte nötig sind. `npm run dev` und `Projekt Manager starten.bat` starten dann API, Web, MCP-HTTP und den stabilen HTTPS-Tunnel gemeinsam.

Die Codeänderung muss nur einmal ins Repo. Pro Rechner, also Homeoffice und Büro, braucht es aber eine lokale Konfiguration: API-Key, Tunnel-Befehl und stabile Tunnel-URL. Empfehlung: zwei getrennte ChatGPT-Connectoren, z. B. „Projekt Manager Home“ und „Projekt Manager Büro“. Claude bleibt kompatibel, weil `start:stdio` und `dist/stdio.js` unverändert bleiben; bei einer API-Key-Vereinheitlichung muss die Claude-Konfiguration einmal mit demselben Key aktualisiert werden.

## Technischer Plan

- Root-Startlogik ergänzen: Der alte `npm run dev`-Pfad wird in einen internen App-Start ausgelagert; `npm run dev` startet danach API und Web wie bisher und optional MCP + Tunnel, wenn `.env.local` das aktiviert.
- `Projekt Manager starten.bat` erweitert denselben Ablauf: Build und Migration bleiben seriell; danach laufen API, Web, MCP und Tunnel gemeinsam im Terminal und werden zusammen beendet.
- Lokale Konfiguration über ignorierte `.env.local`: `PROJECT_MANAGER_MCP_AUTOSTART=true`, gemeinsamer Projekt-Manager-API-Key, `MCP_HTTP_AUTH_MODE=none` nur für lokalen ChatGPT-Test, `MCP_TUNNEL_COMMAND=...`, `MCP_PUBLIC_URL=https://.../mcp`.
- MCP-HTTP bleibt standardmäßig sicher: Ohne explizite lokale ChatGPT-Testkonfiguration startet kein ungeschützter HTTP-MCP-Endpunkt. Bearer-Modus bleibt Default.
- Claude-stdio bleibt unverändert: `apps/mcp-server/src/stdio.ts`, `start:stdio` und das bestehende Claude-MCP-Prinzip werden nicht umgebaut. `setup-mcp.ps1` wird nur so angepasst/dokumentiert, dass es denselben lokalen API-Key verwenden kann.

## Tests Und Abnahme

- Unit-Tests MCP-Konfiguration: Default bleibt Bearer; No-Auth ist nur mit explizitem ChatGPT-Testmodus zulässig; fehlende Tunnel-Konfiguration blockiert Autostart klar.
- Unit-Tests Start-Orchestrierung: Ohne `.env.local` startet nur API+Web wie bisher; mit Autostart startet zusätzlich MCP; mit Tunnel-Befehl wird auch der Tunnelprozess eingeplant.
- HTTP-MCP-Integrationstest: Bearer-Modus lehnt fehlende/falsche Header ab und akzeptiert korrekten Header; lokaler ChatGPT-Testmodus erlaubt `initialize`/`listTools` ohne Header.
- Bestehende MCP-Tool-Tests bleiben Pflicht: Toolliste, Read/Write-Annotationen und Integrationstest gegen echte isolierte Fastify-App mit Temp-SQLite und Temp-Upload-Verzeichnis.
- Claude-Regression: Build erzeugt weiterhin `dist/stdio.js`; `start:stdio` bleibt vorhanden; Doku beschreibt den unveränderten Claude-Weg.
- Manuelle ChatGPT-Abnahme je Rechner: Start über `npm run dev` oder `.bat`, Connector mit stabiler URL öffnen, `list_projects` ausführen, einen klar benannten Testeintrag erstellen, Ergebnis in der Projekt-Manager-UI prüfen, Stoppen beendet MCP/Tunnel mit.

Serielle Prüfkommandos:

```powershell
npm run build -w apps/mcp-server
npm run test -w apps/mcp-server
npm run build
```

## Annahmen

- Ziel bleibt lokaler ChatGPT-Test, kein zentraler Dauerbetrieb.
- Homeoffice und Büro bekommen getrennte stabile Tunnel-URLs oder getrennte ChatGPT-Connectoren.
- Externe ChatGPT- und Claude-Desktop-Flows werden manuell abgenommen, weil sie außerhalb der Repo-Testumgebung liegen.
- Gelesene Grundlagen: Startscript, Root-/Workspace-`package.json`, MCP-Konfiguration, HTTP-Auth, API-Auth, lokale MCP-Doku und offizielle OpenAI-Hinweise zu HTTPS-MCP-Connectoren.
