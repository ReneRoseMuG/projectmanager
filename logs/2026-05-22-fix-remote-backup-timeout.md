# Log: Remote Backup Timeout

**Datum:** 22.05.26  
**Schritt:** Fix — Remote Backup Timeout  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Timeout für Remote-Backup-Importe wurde an den bereits vorhandenen langen Backup-Timeout angepasst. `previewRemoteDump` verwendet jetzt wie `saveLocalDump` einen Timeout von zehn Minuten, damit der Browser den SFTP-Download und die Import-Prüfung nicht nach dem globalen API-Timeout von 20 Sekunden abbricht. Zusätzlich wurde `applyRemoteDump` mit demselben Timeout versehen, weil der anschließende Import denselben langlaufenden Remote-Workflow nutzt. Backend-Routen, SFTP-Service, Authentifizierung, Berechtigungen und Dump-Format wurden nicht verändert. Der bestehende Unit-Test für Dump-API-Timeouts wurde um Remote-Preview und Remote-Apply erweitert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/api/dumps.ts` | geändert | Langer Timeout für Remote-Preview und Remote-Apply ergänzt |
| `tests/unit/web/api/dumps.test.ts` | geändert | Timeout-Absicherung für Remote-Import-Prüfung und Remote-Import ergänzt |
| `logs/2026-05-22-fix-remote-backup-timeout.md` | neu | Schritt-Log für den Timeout-Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. `npm run test -w apps/web -- dumps.test.ts` lief grün mit 1 Testdatei und 3 Tests. `npm run build -w apps/web` lief grün; Vite meldete nur die bekannte Chunk-Size-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
