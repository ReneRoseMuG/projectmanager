# Log: SFTP Backups

**Datum:** 21.05.26  
**Schritt:** Feature — SFTP Backups  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der bestehende lokale Dump-Workflow wurde um einen SFTP-Transport erweitert. `Sichern` erzeugt weiterhin eine lokale Dump-ZIP und versucht anschließend, diese Datei in den konfigurierten Remote-Ordner hochzuladen. Die Sicherungsseite listet jetzt lokale und Remote-Backups, bietet einen Import der neuesten Remote-Datei sowie einen Import per Dateiauswahl an und verwendet dafür nur eine einfache Ja/Nein-Bestätigung. Erfolgreich importierte Remote-Dateinamen werden in `app_settings` gespeichert und beim Restore erhalten, damit dieselbe Remote-Datei nicht erneut importiert werden kann. Die echten SFTP-Zugangsdaten wurden ausschließlich in die ignorierte lokale `.env` eingetragen; `.env.example` enthält nur Platzhalter.

Zusätzlich wurde ein realer SFTP-Upload ausgeführt. Die Datei `taskmanager_dump_2026-05-20T15-27-13-089Z.zip` wurde erfolgreich nach `/home/p-ev6w6q/html/backups` hochgeladen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/backup-sftp.service.ts` | neu | SFTP-Verbindung, Remote-Listing, Upload und Download |
| `apps/api/src/services/dump.service.ts` | geändert | Remote-Status, Remote-Preview, Remote-Apply, Upload nach lokaler Sicherung und Import-Historie |
| `apps/api/src/routes/dumps.ts` | geändert | Remote-Endpunkte für Status, Preview und Apply ergänzt |
| `apps/api/src/config.ts` | geändert | SFTP-Konfigurationswerte aus `.env` ergänzt |
| `packages/shared-types/src/index.ts` | geändert | Remote-Dump-DTOs und Uploadstatus ergänzt |
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | UI für Remote-Liste, neueste Datei importieren und Dateiauswahl-Import |
| `apps/web/src/api/dumps.ts` | geändert | Web-API-Funktionen für Remote-Dumps ergänzt |
| `apps/web/src/hooks/useLocalDumpStatus.ts` | geändert | Remote-Status-Hook ergänzt |
| `apps/web/src/queries/queryKeys.ts` | geändert | Remote-Dump-Query-Key ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | Dump-Queries in breite Import-Invalidierung aufgenommen |
| `apps/web/src/App.tsx` | geändert | Sicherungsroute über `dumps:read` geschützt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Sicherungsnavigation an `dumps:read` gekoppelt |
| `tests/integration/api/dumps-local.test.ts` | geändert | SFTP-Mocktests für Upload, Remote-Import und Doppelimport-Sperre |
| `tests/integration/web/queries/invalidation.integration.test.ts` | geändert | Remote-Dump-Query-Key und Invalidierung ergänzt |
| `apps/api/.env.example` | geändert | SFTP-Platzhalter ergänzt |
| `apps/api/package.json`, `package-lock.json` | geändert | `ssh2-sftp-client` und Typen ergänzt |

## Probleme und Abweichungen

Der API-Build ist weiterhin durch bestehende Drizzle-Typfehler in mehreren Services blockiert, unter anderem `src/db/client.ts`, `backlog.service.ts`, `features.service.ts`, `milestones.service.ts`, `projects.service.ts`, `tags.service.ts`, `use-cases.service.ts` und `wiki.service.ts`. Ein gefilterter TypeScript-Check zeigte keine Fehler in den SFTP- und Dump-Dateien dieser Änderung.

Der vollständige gezielte Dump-Testlauf ist in einem bestehenden Auth-Fixture-Pfad rot: `Local backup status > schützt lokale Dump-Routen über Auth und Dumps-Berechtigungen` bricht mit `no such table: roles` beim Auth-Seeding ab. Die neuen SFTP-spezifischen Tests laufen isoliert grün.

Der direkte Service-Aufruf per `tsx` konnte wegen eines lokalen `esbuild`-Spawn-Problems nicht gestartet werden. Für den realen Webspace-Nachweis wurde deshalb die neueste vorhandene lokale Dump-ZIP per schlankem Node-SFTP-Aufruf hochgeladen.

## Offene Punkte / Folgeaufgaben

- Bestehende Drizzle-Buildfehler separat beheben.
- Bestehenden Auth-Fixture-Fehler im Dump-Test separat prüfen.
- Sobald der API-Build wieder grün ist, den vollständigen API-Testlauf erneut ausführen.
