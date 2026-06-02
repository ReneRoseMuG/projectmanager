# Log: Deploy Shared Types Runtime

**Datum:** 02.06.26  
**Uhrzeit:** 09:24:17  
**Schritt:** Fix — Deploy Shared Types Runtime  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Startfehler wurde auf eine falsch erzeugte Runtime-Junction für `@taskmanager/shared-types` zurückgeführt. Das Runtime-Manifest im Deployment-Ziel übernahm zuvor den Workspace-Pfad `file:../../packages/shared-types`; aus Sicht des Zielordners zeigte dieser Pfad auf `C:\Users\r.rose\AppData\packages\shared-types` und damit ins Leere. In `scripts/deploy.ps1` wurde der Dependency-Pfad für `@taskmanager/shared-types` gezielt auf `file:packages/shared-types` gesetzt. Danach wurde das Deployment erneut ausgeführt, wodurch `node_modules` neu aufgebaut und die Junction korrekt in den Deployment-Ordner gelegt wurde.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/deploy.ps1` | geändert | Runtime-Pfad für `@taskmanager/shared-types` im Ziel-Manifest korrigiert |
| `logs/2026-06-02-09-24-17-fix-deploy-shared-types-runtime.md` | neu | Schritt-Log für den Runtime-Fix |
| `logs/README.md` | geändert | Log-Index um neuen Eintrag ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
