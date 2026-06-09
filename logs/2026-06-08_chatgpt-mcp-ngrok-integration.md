# Log: ChatGPT MCP-Integration via ngrok

**Datum:** 08.06.26  
**Scope:** Infrastruktur / Deployment  
**Typ:** Konfiguration, Bugfix, Deploy-Erweiterung

---

## Zweck

Der Projekt-Manager-MCP-Server war bisher nur für Claude Desktop (stdio-Transport) erreichbar.
Ziel dieser Session: ChatGPT über den HTTP-Transport dauerhaft und stabil mit dem MCP verbinden.

---

## Ausgangslage und Problemanalyse

- Der MCP-Server verfügt über zwei Transporte: `stdio` (Claude Desktop) und HTTP (`apps/mcp-server/dist/http.js`, Port 3010).
- Der HTTP-Server war technisch korrekt implementiert (StreamableHTTP, `MCP_HTTP_AUTH_MODE=none`), aber lokal auf `127.0.0.1` gebunden — für ChatGPT aus der Cloud nicht erreichbar.
- Ein OpenAI-eigener Tunnel-Client (`context-conduit-topaz`, `.local-ai/tunnel-client/tunnel-client.exe`) war installiert, aber nicht konfiguriert: `OPENAI_TUNNEL_ID` und `CONTROL_PLANE_API_KEY` waren leer. Zugang zum OpenAI Control Plane war nicht verfügbar.
- In ChatGPT war eine abgelaufene Cloudflare-Quick-Tunnel-URL hinterlegt (`clearing-batch-prefix-buck.trycloudflare.com`), die sich bei jedem Tunnelstart ändert.
- Die Toolbar-App (`Start.ps1`, generiert von `deploy.ps1`) startete bisher nur API und Web — MCP-HTTP-Server und Tunnel wurden nicht gestartet.

---

## Lösung

**ngrok mit stabiler Static Domain** als Ersatz für den nicht zugänglichen OpenAI-Tunnel.

- Stabile Domain (kostenloser Free-Plan): `motivator-sizably-rind.ngrok-free.dev`
- Die URL ändert sich nie, ChatGPT-Konfiguration ist einmalig.

---

## Durchgeführte Schritte

### 1. ngrok installieren und konfigurieren
```
winget install ngrok.ngrok          # installiert v3.3.1
ngrok config add-authtoken <token>  # Authtoken aus ngrok-Dashboard
ngrok update                        # v3.3.1 → v3.39.6 (Pflicht: Free-Account erfordert ≥ 3.20.0)
```

**Blocker:** winget liefert v3.3.1, Free-Accounts erfordern mindestens v3.20.0 (`ERR_NGROK_121`).  
**Lösung:** `ngrok update` aktualisiert die Binary in-place auf v3.39.6.

### 2. `.env.local` aktualisieren
```
# vorher:
PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART=false
MCP_TUNNEL_COMMAND=.local-ai\tunnel-client\tunnel-client.exe run --profile projekt-manager-home
MCP_PUBLIC_URL=

# nachher:
PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART=true
MCP_TUNNEL_COMMAND=ngrok http --domain=motivator-sizably-rind.ngrok-free.dev 3010
MCP_PUBLIC_URL=https://motivator-sizably-rind.ngrok-free.dev/mcp
```

### 3. `deploy.ps1` erweitert

Vier Änderungen:

**a) `Invoke-CheckedCommand` — stderr-Fix**  
`& $Command` → `& $Command 2>&1 | Out-Default`  
Hintergrund: `$ErrorActionPreference = "Stop"` + stderr von node.exe = fälschlicher Abbruch in PowerShell 5.1.

**b) `Read-EnvLocal`-Funktion** hinzugefügt  
Liest `.env.local` aus dem Repo-Root zur Deploy-Zeit; gibt Hashtable zurück.

**c) Env/ngrok-Auflösung vor Schritt [6/7]**  
Liest `PROJECT_MANAGER_API_KEY`, `MCP_HTTP_*`-Werte und ngrok-Domain aus `.env.local`.  
Findet ngrok-Pfad: erst in `$PATH`, dann im WinGet-Package-Pfad als Fallback.

**d) Generiertes `Start.ps1` erweitert**  
Startet zusätzlich:
- MCP-HTTP-Server: `node apps\mcp-server\dist\http.js` mit eingebetteten Env-Variablen
- ngrok-Tunnel: `ngrok http --domain=motivator-sizably-rind.ngrok-free.dev 3010`

PID-Datei enthält nun alle vier PIDs: `api web mcp tunnel`.

**e) Generiertes `Stop.ps1` erweitert**  
Port 3010 zur Port-Kill-Liste hinzugefügt; ngrok-Prozess wird explizit per Name beendet.

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `scripts/deploy.ps1` | `Invoke-CheckedCommand`-Fix, `Read-EnvLocal`, ngrok-Auflösung, Start/Stop-Generierung erweitert |
| `.env.local` | ngrok-Domain, Tunnel-Autostart aktiviert, OpenAI-Tunnel-Einträge entfernt |
| `AppData\Local\Projekt Manager\Start.ps1` | Generiert — startet MCP + ngrok |
| `AppData\Local\Projekt Manager\Stop.ps1` | Generiert — beendet Port 3010 + ngrok |

---

## Testen

1. Toolbar → „Projekt Manager starten"
2. Prüfen: `Get-NetTCPConnection -LocalPort 3010 -State Listen` → PID vorhanden
3. Prüfen: `Get-Process -Name ngrok` → läuft
4. Prüfen: `Invoke-RestMethod http://127.0.0.1:4040/api/tunnels` → public_url sichtbar
5. ChatGPT → Einstellungen → Apps → Projekt Manager → „Aktualisieren" → grüne Verbindung

---

## Bekannte Einschränkungen

- **ngrok Free-Plan:** Eine Static Domain, kein TLS-Auth, keine regionalen PoPs. Ausreichend für den Heimgebrauch.
- **`MCP_HTTP_AUTH_MODE=none`:** Kein Bearer-Token. Der ngrok-Tunnel ist öffentlich erreichbar. Wer den Endpunkt kennt, kann die MCP-Tools aufrufen. Für produktivere Szenarien `bearer`-Auth und `MCP_HTTP_BEARER_TOKEN` konfigurieren.
- **ngrok-Pfad:** Der WinGet-Pfad ist im generierten `Start.ps1` als Literal hinterlegt. Bei einem ngrok-Neuinstall via WinGet in einer neuen Version muss `deploy.ps1` erneut ausgeführt werden.
- **OpenAI-Tunnel-Client:** `.local-ai/tunnel-client/tunnel-client.exe` verbleibt im Repo, wird aber nicht mehr genutzt.
