# Log: Windows-Autostart und MCP-Anbindung

**Datum:** 05.09.26  
**Uhrzeit:** 09:17:18  
**Schritt:** Feature — Projekt Manager und MCP-Server mit Windows starten, MCP für alle Claude-Oberflächen verfügbar machen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Bisher startete mit Windows nur die Tray-Toolbar; die Dienste liefen erst nach einem manuellen Klick im Tray-Menü. Die Autostart-Verknüpfung wird jetzt mit `-AutoStart` angelegt und fährt die Dienste über eine neue `scripts/autostart.ps1` hoch, die in einem eigenen Hintergrundprozess läuft, damit das Tray-Symbol sofort erscheint. Sie überspringt den Start, wenn die API schon antwortet, und unternimmt einen zweiten Versuch nach 20 Sekunden für den Fall, dass beim Anmelden das Netzwerk zur Aiven-Datenbank noch nicht steht.

Das von `deploy.ps1` erzeugte `Start.ps1` bekam den Schalter `-NoBrowser` (Windows-Start öffnet kein Browserfenster, manueller Tray-Start weiterhin schon) sowie eine Bereitschaftsprüfung für den MCP-Server. Diese prüft den lauschenden Port statt einer HTTP-Antwort, weil der MCP-Endpunkt nur POST beantwortet. Damit fällt ein stiller Fehlstart des MCP jetzt auf.

Für die Client-Anbindung wurde der Server einmal benutzerweit in Claude Code registriert (`--scope user`, HTTP auf `127.0.0.1:3010/mcp`) — dadurch in jedem Verzeichnis und jeder Session verfügbar — und über das überarbeitete `setup-mcp.ps1` per stdio in beide Claude-Desktop-Konfigurationen eingetragen. Das Schreiben der Desktop-Konfiguration übernimmt jetzt `scripts/write-claude-mcp-config.mjs`: `ConvertTo-Json` in Windows PowerShell 5.1 hätte das einelementige Array `remoteFolderConsentMemory` zu einem Skalar gemacht und die tiefe `epitaxyPrefs`-Struktur bei `-Depth 10` gekappt, also die bestehenden Einstellungen beschädigt. Der Eintrag zeigt auf das Deployment-Verzeichnis, nicht auf das Repository, damit ein Build hier keine laufenden Chats unterbricht.

Auf Entscheidung des Nutzers bleibt claude.ai im Browser außen vor; dafür wäre ein dauerhafter HTTPS-Tunnel nötig. Der MCP-Server bleibt an `127.0.0.1` gebunden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/autostart.ps1` | neu | Hochfahren der Dienste beim Windows-Start, mit Übersprung- und Wiederholungslogik |
| `scripts/write-claude-mcp-config.mjs` | neu | Verlustfreies Schreiben des MCP-Eintrags in die Claude-Desktop-Konfiguration |
| `scripts/toolbar.ps1` | geändert | Schalter `-AutoStart`, startet `autostart.ps1` im Hintergrund |
| `scripts/deploy.ps1` | geändert | `Start.ps1` mit `-NoBrowser` und MCP-Portprüfung; Autostart-Verknüpfung mit `-AutoStart` |
| `setup-mcp.ps1` | geändert | Schreibt über Node, mit Sicherungskopie, Ziel ist das Deployment-Verzeichnis |
| `apps/mcp-server/README.md` | geändert | Abschnitte „Windows-Autostart" und „Anbindung an die Claude-Oberflächen" |

Zusätzlich außerhalb des Repositorys: benutzerweiter Eintrag in `~/.claude.json` und `projekt-manager` in beiden `claude_desktop_config.json` (jeweils mit `.bak`-Sicherung).

## Probleme und Abweichungen

Beim Stoppen zeigte sich, dass im Deployment-Verzeichnis eine veraltete `Stop.ps1` lag, die Port 3010 nicht kannte — der MCP-Prozess blieb dadurch verwaist zurück und musste einmalig von Hand beendet werden. Dasselbe galt für `Start.ps1`, die den MCP-Teil nicht enthielt, obwohl das Update vom Morgen ihn ausgeführt hatte. Das aktuelle Deployment hat beide Dateien ersetzt; seitdem stimmen Repository- und Deployment-Stand überein.

Für PowerShell-Skripte gibt es in diesem Repository keine automatisierte Testebene. Die Verifikation erfolgte deshalb am realen Ablauf.

## Verifikation

- Autostart-Verknüpfung genau so ausgeführt, wie Windows es beim Anmelden tut: API, Web und MCP waren nach 14 Sekunden bereit, `autostart.log` meldet „Versuch 1 erfolgreich", `start.log` meldet „browser skipped (-NoBrowser)".
- Ports 3001, 5173 und 3010 belegt; `Stop.ps1` im Deployment kennt jetzt alle drei.
- MCP über beide Wege geprüft: HTTP und stdio liefern je 73 identische Werkzeuge.
- Echter Werkzeugaufruf `list_projects` über HTTP liefert Projektdaten aus der Datenbank — die Kette MCP → API → Aiven ist durchgängig.
- `claude mcp list` aus dem Home-Verzeichnis (außerhalb des Repositorys): `projekt-manager … ✔ Connected`.
- Claude-Desktop-Konfiguration gegen die Sicherungskopie verglichen: alle 22 `preferences`-Schlüssel unverändert, einelementiges Array intakt, `epitaxyPrefs` vollständig.

## Offene Punkte / Folgeaufgaben

- Ein echter Windows-Neustart als Endabnahme steht noch aus; simuliert wurde er über die Autostart-Verknüpfung selbst.
- Claude Desktop muss einmal neu gestartet werden, damit die Chats den Server laden. Laufende Claude-Code-Sessions sehen ihn erst in einer neuen Session.
- claude.ai im Browser bleibt bewusst unversorgt (Entscheidung des Nutzers, benötigt dauerhaften HTTPS-Tunnel).
