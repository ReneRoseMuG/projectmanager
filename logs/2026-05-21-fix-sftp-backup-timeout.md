# Log: SFTP Backup Timeout

**Datum:** 21.05.26  
**Schritt:** Fix — SFTP Backup Timeout  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Web-API-Aufruf für das lokale Sichern wurde so angepasst, dass er für den kombinierten lokalen Dump und SFTP-Upload einen eigenen Timeout von zehn Minuten verwendet. Damit bricht der Browser den laufenden POST auf `dumps/local/save` nicht mehr nach dem globalen API-Timeout von 20 Sekunden ab. Der bestehende Backend-Endpunkt, die SFTP-Service-Logik, das Dump-Format und die Berechtigungslogik wurden bewusst unverändert gelassen. Zusätzlich wurde ein fokussierter Unit-Test ergänzt, der den spezialisierten Timeout des Sicherungsaufrufs absichert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/api/dumps.ts` | geändert | `saveLocalDump` nutzt einen längeren Timeout für den Backup-Sichern-Aufruf |
| `tests/unit/web/api/dumps.test.ts` | neu | Unit-Test für den spezialisierten Timeout des Sicherungsaufrufs |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
