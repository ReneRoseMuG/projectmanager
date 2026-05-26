# Log: TASK-95 Realtime Progress Events

**Datum:** 26.05.26  
**Schritt:** 2 — Backup-Fortschritt über Realtime/SSE  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die gemeinsamen Typen enthalten nun ein `BackupProgressEvent` und eine `RealtimeEvent`-Union, ohne den bestehenden Invalidierungs-Typ zu ersetzen. Der Realtime-Event-Bus veröffentlicht diese Union und die SSE-Route schreibt je Nachricht den passenden Event-Namen, also weiterhin `invalidate` und zusätzlich `backup_progress`. Die Dump-Routen übergeben einen sicheren Progress-Publisher an Backup-, Sync- und Import-Operationen. Der Publisher kapselt `realtimeBus.publish` in `try/catch`, damit Realtime-Probleme keine Backup- oder Importvorgänge abbrechen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | `BackupProgressEvent` und `RealtimeEvent` ergänzt |
| `apps/api/src/services/realtime-event-bus.service.ts` | geändert | Event-Bus auf die neue Realtime-Union erweitert |
| `apps/api/src/routes/realtime.ts` | geändert | SSE-Ausgabe für `invalidate` und `backup_progress` vereinheitlicht |
| `apps/api/src/routes/dumps.ts` | geändert | Sicheren Backup-Progress-Publisher an Dump-Operationen übergeben |

## Probleme und Abweichungen

Keine. Die bestehenden Auth- und Permission-Regeln bleiben unverändert; SSE benötigt weiterhin `realtime:read`, Dump-Aktionen nutzen weiter die bestehenden `dumps:*`-Berechtigungen.

## Offene Punkte / Folgeaufgaben

Keine.
