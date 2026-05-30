# Log: TASK-95 Backup Progress UI

**Datum:** 26.05.26  
**Schritt:** 3 — Fortschrittsanzeige auf der Backup-Adminseite  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Im Web wurde ein lokaler Backup-Progress-Store auf Basis von `useSyncExternalStore` ergänzt. `useRealtimeSync` hört nun zusätzlich auf `backup_progress`, validiert eingehende Events und speist nur gültige Fortschrittsdaten in diesen Store ein. Die Backup-Einstellungsseite zeigt laufende oder zuletzt empfangene Fortschritte für Vollbackup, inkrementellen Sync und Import als kompakten Abschnitt mit bestehender `ProgressBar`, `Badge`, Token-Farben und Business-Tool-Layout. Vor neuen Backup-, Sync- oder Importaktionen wird der jeweilige lokale Fortschritt gezielt zurückgesetzt, damit alte Events nicht irreführend wirken.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/hooks/useBackupProgress.ts` | neu | Lokaler Store und Hook für Backup-Fortschrittsereignisse |
| `apps/web/src/hooks/useRealtimeSync.ts` | geändert | Verarbeitung von `backup_progress` neben bestehenden Invalidierungen ergänzt |
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | Sichtbare Fortschrittsanzeige für Backup, Sync und Import ergänzt |

## Probleme und Abweichungen

Keine. Es wurde keine neue Navigation und kein Server-State über TanStack Query eingeführt, weil Progress-Events nur flüchtige Realtime-Zustände sind.

## Offene Punkte / Folgeaufgaben

Keine.
