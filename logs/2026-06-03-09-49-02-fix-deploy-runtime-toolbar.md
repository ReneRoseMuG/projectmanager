# Log: Deploy Runtime Toolbar

**Datum:** 03.06.26  
**Uhrzeit:** 09:49:02  
**Schritt:** Fix — Deploy Runtime Toolbar  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Deployment-Script wurde auf einen isolierten Runtime-Deploy umgestellt, damit im Zielordner nicht mehr das vollständige Workspace-Manifest installiert wird. Der Zielordner erhält nun ein eigenes `projekt-manager-runtime`-Manifest mit den Laufzeitabhängigkeiten aus API und MCP-Server; `@taskmanager/shared-types` wird gezielt als `file:packages/shared-types` eingebunden. Zusätzlich wird ein lokaler statischer Webserver über `scripts/serve-static.mjs` ausgeliefert, sodass der Start nicht mehr von `npx serve` oder Netzwerkzugriff abhängt. Das Deploy kopiert API-Migrationen nach `dist`, führt die Datenbankmigration im Ziel aus, erzeugt Start-/Stop-Scripts, aktualisiert Desktop- und Autostart-Verknüpfungen und startet die Toolbar nach erfolgreichem Abschluss. Das Startscript prüft API und Web über `127.0.0.1`, weil `localhost` im Windows-PowerShell-Healthcheck über IPv6/Nameauflösung hängen blieb.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/deploy.ps1` | geändert | Runtime-Manifest, LocalAppData-Ziel, Migration, Start-/Stop-Scripts, Toolbar-Start und Healthchecks korrigiert |
| `scripts/toolbar.ps1` | geändert | Deploy-Ziel und Repo-Root als Parameter ergänzt |
| `scripts/update.ps1` | geändert | LocalAppData-Ziel und Weitergabe von `-Target` an `deploy.ps1` ergänzt |
| `scripts/serve-static.mjs` | neu | Lokaler Webserver für `apps/web/dist` ohne `npx serve` |
| `logs/2026-06-03-09-49-02-fix-deploy-runtime-toolbar.md` | neu | Schritt-Log für den Deploy-Fix |
| `logs/README.md` | geändert | Log-Index um neuen Eintrag ergänzt |

## Testleitplanken und Testebenen

Angewendet wurden `projekt-manager-planungsleitplanken` und `projekt-manager-test-entwurfsleitplanken`. Testebene war ein systemnaher manueller Deploy-/Runtime-Abnahmetest mit echten Zielpfaden unter `%LOCALAPPDATA%\Projekt Manager`; es wurden keine Mocks verwendet. Bewiesen wurde: frischer Deploy-Lauf, Runtime-Abhängigkeiten ohne `esbuild`, erzeugte Shortcuts, gestartete Toolbar, Startscript mit API-/Web-Healthchecks, Stopscript mit freigegebenen Ports.

## Probleme und Abweichungen

Beim ersten echten Test brach das alte Skript in `npm ci --omit=dev` wegen `esbuild` im Workspace-Deploy-Ziel ab. Nach der Runtime-Umstellung lief der Deploy durch, aber `Start.ps1` hing zunächst im Healthcheck: Sowohl `Invoke-WebRequest` als auch `HttpClient` waren über `localhost` unzuverlässig, während `127.0.0.1` sofort antwortete. Deshalb wurden die internen Startscript-Healthchecks gezielt auf `127.0.0.1` umgestellt. Die Vite-Build-Warnung zu großen Chunks besteht unverändert und ist kein Deploy-Blocker.

## Offene Punkte / Folgeaufgaben

Keine.
