# Log: TASK-95 SFTP Streaming Progress

**Datum:** 26.05.26  
**Schritt:** 1 — Backup-SFTP, Archiv-Streaming und Import-Cache  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Backup-SFTP-Helfer wurden um eine wiederverwendbare Session-Schicht ergänzt, sodass der inkrementelle Sync Manifest, Uploads, Deletes und finalen Manifest-Upload über genau eine Verbindung ausführen kann. Die bisherigen Einzeloperationen bleiben erhalten und delegieren auf dieselben Session-Helfer. Vollbackups erzeugen das ZIP nicht mehr über einen großen Archiv-Buffer, sondern schreiben das Archiv per Stream direkt auf die lokale Datei und laden es bei aktivem SFTP ebenfalls per Stream hoch. Der Import nutzt die beim ZIP-Scan bereits gelesenen Datei-Buffer für das Staging weiter und räumt den Cache nach dem Import auf. Fortschritts-Callbacks werden im Dump-Service gekapselt, sodass Callback-Fehler Backup, Sync oder Import nicht abbrechen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/backup-sftp.service.ts` | geändert | Persistente SFTP-Session-Helfer, Batch-Operationen und Stream-Uploads ergänzt |
| `apps/api/src/services/dump.service.ts` | geändert | ZIP-Erzeugung auf Datei-Streaming umgestellt, Sync über eine SFTP-Verbindung geführt und ZIP-Import-Buffer wiederverwendet |

## Probleme und Abweichungen

Keine. Die geplante DB- und Response-Kompatibilität blieb unverändert; es wurden keine Migrationen und keine neuen HTTP-Endpunkte angelegt.

## Offene Punkte / Folgeaufgaben

Realer SFTP-/NAS-Abnahmetest bleibt manuell, weil dafür eine konkrete Zielumgebung benötigt wird.
