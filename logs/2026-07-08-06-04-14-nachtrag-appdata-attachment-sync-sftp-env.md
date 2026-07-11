# Log: APPDATA-Env für Attachment-Sync/SFTP nachgezogen

**Datum:** 08.07.26  
**Uhrzeit:** 06:04:14  
**Schritt:** Nachtrag — APPDATA-Env für Attachment-Sync/SFTP nachgezogen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Installationspfad wurde nach Nutzerhinweis zusätzlich unter `%APPDATA%\Projekt Manager` geprüft. Dort existierte die reale API-Env-Datei `apps/api/.env` mit den alten SFTP-, Attachment-Sync- und Backup-SFTP-Schlüsselzeilen. Diese Schlüssel wurden aus der `%APPDATA%`-Installation entfernt. Anschließend wurden die beiden maßgeblichen Zielpfade, Repo und `%APPDATA%`, erneut schlüsselbasiert geprüft; in beiden Dateien bleiben keine passenden Alt-Schlüssel zurück.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `C:\Users\schro\AppData\Roaming\Projekt Manager\apps\api\.env` | geändert | Alte `SFTP_*`, `ATTACHMENT_SYNC_*` und `BACKUP_SFTP_*`-Artefakte entfernt |
| `logs/2026-07-08-06-04-14-nachtrag-appdata-attachment-sync-sftp-env.md` | neu | Nachtrag zum tatsächlich maßgeblichen `%APPDATA%`-Installationspfad |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der erste Installationspfad wurde aus `scripts/deploy.ps1` als `%LOCALAPPDATA%\Projekt Manager` abgeleitet. Nach Nutzerhinweis wurde der tatsächlich gemeinte zweite Pfad `%APPDATA%\Projekt Manager` zusätzlich geprüft und bereinigt.

## Offene Punkte / Folgeaufgaben

Keine.
