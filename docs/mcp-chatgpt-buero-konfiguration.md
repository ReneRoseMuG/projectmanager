# MCP und ChatGPT im Büro konfigurieren

Diese Anleitung beschreibt die einmalige lokale Einrichtung im Büro. Danach kann der Projekt Manager über `Projekt Manager starten.bat` oder `npm run dev` gestartet werden; MCP und der stabile ChatGPT-Tunnel starten automatisch mit, wenn die lokale Konfiguration aktiviert ist.

## 1. Ausgangspunkt prüfen

Im Büro liegt das Repo normalerweise hier:

```powershell
C:\Users\r.rose\repos\Projekt Manager
```

Falls das Repo an einem anderen Ort liegt, alle folgenden Befehle im tatsächlichen Repo-Root ausführen. Wichtig ist, dass dort `package.json`, `.env.local.example` und `Projekt Manager starten.bat` liegen.

## 2. Lokale Konfiguration anlegen

Im Repo-Root die Beispielkonfiguration kopieren:

```powershell
Copy-Item .env.local.example .env.local
```

Danach `.env.local` bearbeiten. Für den Büro-Rechner sollten mindestens diese Werte gesetzt werden:

```env
API_KEY=<lokaler-projekt-manager-api-key>
PROJECT_MANAGER_API_KEY=<derselbe-lokale-projekt-manager-api-key>

PROJECT_MANAGER_MCP_AUTOSTART=true
PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART=true

MCP_HTTP_AUTH_MODE=none
MCP_HTTP_HOST=127.0.0.1
MCP_HTTP_PORT=3010
MCP_HTTP_PATH=/mcp

MCP_PUBLIC_URL=https://<stabile-buero-tunnel-url>/mcp
MCP_TUNNEL_COMMAND=<befehl-fuer-den-stabilen-buero-tunnel>
```

`MCP_HTTP_AUTH_MODE=none` ist nur für den lokalen ChatGPT-Test über einen privaten stabilen Tunnel gedacht. Der Tunnel darf nicht öffentlich geteilt werden, weil ChatGPT den MCP-Endpunkt in diesem Modus ohne zusätzlichen Bearer-Header erreicht.

## 3. Stabilen Tunnel vorbereiten

Der Wert `MCP_TUNNEL_COMMAND` muss ein Befehl sein, der eine stabile HTTPS-URL auf den lokalen MCP-Endpunkt weiterleitet:

```text
http://127.0.0.1:3010/mcp
```

Beispiele für geeignete Varianten:

```env
MCP_TUNNEL_COMMAND=cloudflared tunnel run projekt-manager-buero
```

oder:

```env
MCP_TUNNEL_COMMAND=ngrok http --domain=<stabile-buero-domain> 3010
```

Die dazugehörige öffentliche URL wird in `MCP_PUBLIC_URL` eingetragen, zum Beispiel:

```env
MCP_PUBLIC_URL=https://projekt-manager-buero.example.com/mcp
```

## 4. Projekt Manager starten

Variante A, per Startscript:

```powershell
.\Projekt Manager starten.bat
```

Variante B, per Terminal:

```powershell
npm run dev
```

Ohne aktivierte `.env.local` starten nur API und Web. Mit den Werten aus Abschnitt 2 starten zusätzlich:

- MCP-HTTP auf `http://127.0.0.1:3010/mcp`
- der stabile Büro-Tunnel aus `MCP_TUNNEL_COMMAND`

## 5. ChatGPT-Connector einrichten

In ChatGPT den Developer Mode für MCP-Apps öffnen und einen Connector für das Büro anlegen.

Empfohlene Werte:

- Name: `Projekt Manager Büro`
- Beschreibung: `Lokaler Projekt Manager im Büro`
- Connector URL: Wert aus `MCP_PUBLIC_URL`

Wenn später auch Homeoffice genutzt wird, am besten einen zweiten Connector `Projekt Manager Home` mit der Homeoffice-Tunnel-URL anlegen. So muss die URL nicht jedes Mal umgestellt werden.

## 6. Claude Desktop weiter nutzen

Claude nutzt weiterhin den lokalen `stdio`-Transport und nicht den ChatGPT-HTTP-Tunnel. Nach Änderung des lokalen API-Keys einmal die Claude-Konfiguration aktualisieren:

```powershell
.\setup-mcp.bat
```

Das Script liest den API-Key aus `.env.local` und schreibt ihn in die Claude-Desktop-Konfiguration. Danach Claude Desktop neu starten.

## 7. Kurzer Funktionstest

Nach dem Start prüfen:

1. Web-App öffnet unter `http://localhost:5173`.
2. Im Startfenster erscheint ein MCP-Start auf `127.0.0.1:3010`.
3. Der Tunnelprozess läuft ohne Fehler.
4. In ChatGPT den Connector `Projekt Manager Büro` auswählen.
5. Ein lesendes Tool ausführen, zum Beispiel Projekte auflisten.
6. Optional ein klar benanntes Testobjekt anlegen und anschließend in der Web-App prüfen.

Wenn ChatGPT den Connector nicht erreicht, zuerst `MCP_PUBLIC_URL`, `MCP_TUNNEL_COMMAND` und den laufenden Tunnel prüfen.
