# Log: Backup straffen

**Datum:** 27.05.26  
**Schritt:** 2 — Hash-basiertes Backup und Sync-Entfernung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Lokale Backups schreiben nach erfolgreicher Erstellung ein letztes Hash-Manifest neben der SQLite-Datei und verwenden es beim nächsten ZIP-Aufbau, um unveränderte Upload-Dateien aus dem Archiv wegzulassen. `data.json` bleibt vollständig, `manifest.json` beschreibt weiterhin den vollständigen Upload-Zielzustand und markiert partielle Upload-Wurzeln mit `partial: true`; neue Backups enthalten keine `content/`-Dateien mehr. Der Import baut partielle Upload-Wurzeln aus ZIP-Dateien plus lokal verifizierten Basisdateien auf und blockiert, wenn eine unveränderte lokale Basisdatei fehlt oder nicht zum Hash passt. Die frühere Safety-ZIP-Sicherung wurde durch einen SQLite-Snapshot ersetzt; Datei-Roots werden per Rename-Swap mit Copy-Fallback übernommen. Der separate Remote-Sync-Workflow wurde aus Service, Routes, Shared Types, Web-API, Hooks, Realtime-Operationen und Backup-Seite entfernt.

Testleitplanken wurden angewendet. Testebenen: API-Integration mit echter Temp-DB, echten ZIPs, temporären Upload-/Content-/Backup-Verzeichnissen und SFTP-Testdouble; Web-Unit mit jsdom und Hook-Doubles. Bewiesen wurde: erster Backup-Lauf packt alle Uploads, Folgelauf packt nur geänderte Uploads, Partial-Import rekonstruiert den vollständigen Upload-Zielzustand, fehlende Basisdateien blockieren, alte Sync-Endpunkte sind nicht mehr verfügbar und die Backup-Seite zeigt keine Sync-Bedienung mehr.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/dump.service.ts` | geändert | Hash-Manifest, Partial-ZIP, Partial-Import und SQLite-Snapshot umgesetzt; Sync-Service entfernt |
| `apps/api/src/routes/dumps.ts` | geändert | `/dumps/remote/sync*`-Routen entfernt |
| `packages/shared-types/src/index.ts` | geändert | Sync-DTOs und `incremental_sync` entfernt, `DumpFileRootSummary.partial` ergänzt |
| `apps/web/src/api/dumps.ts` | geändert | Sync-API-Funktionen entfernt |
| `apps/web/src/hooks/useLocalDumpStatus.ts` | geändert | Sync-Hook entfernt |
| `apps/web/src/hooks/useBackupProgress.ts` | geändert | Progress-State auf Vollbackup und Import reduziert |
| `apps/web/src/hooks/useRealtimeSync.ts` | geändert | `incremental_sync` wird nicht mehr als Progress-Operation akzeptiert |
| `apps/web/src/queries/queryKeys.ts` | geändert | Sync-Preview-Query-Key entfernt |
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | Sync-Bereich entfernt, Vollbackup und Remote-Import bleiben |
| `tests/integration/api/dumps-local.test.ts` | geändert | Partial-Backup/-Import, entfernte Sync-Routen und content-freie neue Backups geprüft |
| `tests/integration/api/realtime.test.ts` | geändert | Backup-Progress ohne `incremental_sync` geprüft |
| `tests/unit/web/api/dumps.test.ts` | geändert | Web-API-Tests auf Vollbackup/Remote-Import reduziert |
| `tests/unit/web/pages/SettingsBackupPage.test.tsx` | geändert | Backup-Seite ohne Sync-Bereich geprüft |

## Probleme und Abweichungen

Keine. Die bestehenden Änderungen in `dump.service.ts`, `dumps-local.test.ts`, `SettingsBackupPage.tsx` und dem zugehörigen Web-Test wurden weitergeführt und nicht zurückgesetzt. Reader-Aufrufe auf entfernte POST-Sync-Pfade liefern weiterhin `FORBIDDEN`, weil der globale Auth-Guard die Schreibberechtigung vor der 404-Routenantwort prüft; Admin-Aufrufe belegen die entfernten Routen mit `NOT_FOUND`.

## Offene Punkte / Folgeaufgaben

Keine.
