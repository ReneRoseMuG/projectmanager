# Log: Attachment-Sync/SFTP-Env bereinigt

**Datum:** 08.07.26  
**Uhrzeit:** 05:58:23  
**Schritt:** Fix — Attachment-Sync/SFTP-Env bereinigt  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die realen Env-Dateien im Projekt und im Installationspfad wurden auf Artefakte der deaktivierten Attachment-Sync/SFTP-Konfiguration geprüft. Entfernt wurden ausschließlich die alten SFTP-, Attachment-Sync- und unreferenzierten Backup-SFTP-Schlüsselzeilen. Die übrige API-, Datenbank-, Admin-, Preview- und MCP-Konfiguration blieb unverändert. Die Prüfung erfolgte schlüsselbasiert, damit keine geheimen Werte in Logs oder Ausgaben übernommen werden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/.env` | geändert | Alte `BACKUP_SFTP_*`-Artefakte entfernt |
| `C:\Users\schro\AppData\Local\Projekt Manager\apps\api\.env` | geändert | Alte `SFTP_*`, `ATTACHMENT_SYNC_*` und `BACKUP_SFTP_*`-Artefakte entfernt |
| `logs/2026-07-08-05-58-23-fix-attachment-sync-sftp-env.md` | neu | Schritt-Log zur Konfigurationsbereinigung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
