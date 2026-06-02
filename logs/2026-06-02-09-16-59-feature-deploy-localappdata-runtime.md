# Log: Deploy LocalAppData Runtime

**Datum:** 02.06.26  
**Uhrzeit:** 09:16:59  
**Schritt:** Feature — Deploy LocalAppData Runtime  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Deployment-Script wurde so angepasst, dass der Standardzielpfad nun `C:\Users\r.rose\AppData\Local\Projekt Manager` beziehungsweise `%LOCALAPPDATA%\Projekt Manager` ist. Der Zielordner erhält ein eigenes Runtime-`package.json`, das nur die Produktionsabhängigkeiten aus API und MCP-Server enthält; dadurch wird Web-/Build-Tooling wie `esbuild` im Deployment-Ziel nicht mehr installiert. Nach dem Build werden die API-Migrationen nach `dist` kopiert, die Runtime-Abhängigkeiten installiert und die Datenbankmigration aus dem API-Arbeitsverzeichnis ausgeführt, damit die Ziel-`.env` geladen wird. Zusätzlich wird `docs\Zertifikate` synchronisiert, weil die aktuelle DB-Konfiguration `ca.pem` im Ziel benötigt. Das Startscript nutzt nun einen lokalen Node-Static-Server statt `npx serve`, und Desktop- sowie Autostart-Verknüpfung zeigen auf `Projekt Manager starten.bat`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/deploy.ps1` | geändert | Deployment-Ziel auf LocalAppData umgestellt, Runtime-Install isoliert, Migration und Zertifikatssync ergänzt, Startscript angepasst |
| `logs/2026-06-02-09-16-59-feature-deploy-localappdata-runtime.md` | neu | Schritt-Log für die Deploy-Anpassung |
| `logs/README.md` | geändert | Log-Index um neuen Eintrag ergänzt |

## Probleme und Abweichungen

Beim ersten Deploy-Test zog das Workspace-Lockfile trotz Workspace-Auswahl weiterhin `esbuild` in den Zielordner. Deshalb wurde der Ansatz auf ein eigenständiges Runtime-Manifest im Ziel geändert. Danach war die Runtime-Installation erfolgreich. Die Migration scheiterte zunächst, weil die `.env` erst nach der Migration bereitgestellt wurde und anschließend, weil sie aus dem falschen Arbeitsverzeichnis gestartet wurde. Beides wurde korrigiert. Zusätzlich fehlte das in der `.env` referenzierte Zertifikat `docs\Zertifikate\ca.pem`; der Zertifikatssync wurde ergänzt.

## Offene Punkte / Folgeaufgaben

Keine.
