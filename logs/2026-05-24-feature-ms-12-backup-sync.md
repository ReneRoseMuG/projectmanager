# Log: MS-12 Backup und Sync

**Datum:** 24.05.26  
**Schritt:** Feature — MS-12 Backup und Sync  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

MS-12 wurde als vollständige Backup- und Sync-Erweiterung umgesetzt. Der bestehende lokale ZIP-Backup-Workflow bleibt erhalten; zusätzlich gibt es nun einen inkrementellen SFTP-Sync mit `manifest.json`, `data.json`, `uploads/` und `content/`. Tabellenänderungen werden über Tabellen-Hashes erkannt, Dateiänderungen über SHA-256 je Datei; neue und gelöschte Dateien werden hochgeladen beziehungsweise remote entfernt. Für den Büro/Homeoffice-Abgleich gibt es Preview und Apply für den inkrementellen Remote-Stand inklusive Manifest-Hash-Prüfung, Zielbackup, Tabellenrestore, Dateiroot-Swap, Rollback und Verifikation. Außerdem aktualisiert ein Attachment-Watcher nach externen Dateiänderungen `size`, `version`, `updatedAt` und `updatedBy`; wegen Windows-/Editor-Speicherverhalten kombiniert er `fs.watch` mit einem leichten Stat-Polling-Fallback und kurzem Settle-Delay.

Testleitplanken angewendet: API-Integration mit Temp-DB und Temp-Dateiroots, Web-Unit-Tests ohne echte HTTP-Requests, SFTP als kontrollierter Transport-Double. Beweises Verhalten: vollständiger erster Sync, unveränderter Folgesync ohne Upload, Tabellenänderung, neue/geänderte/gelöschte Dateien, Restore des Remote-Sync-Stands, Auth-/Permission-Schutz und Attachment-Metadatenupdate nach externer Dateiänderung.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/attachment-watcher.service.ts` | neu | Attachment-Watcher mit Timeout, Polling-Fallback und Shutdown-Helfern |
| `apps/api/src/repositories/attachment.repository.ts` | geändert | `updateSizeAndVersion` für externe Dateiänderungen ergänzt |
| `apps/api/src/services/attachments.service.ts` | geändert | `openAttachment` registriert Watcher mit Actor-Kontext |
| `apps/api/src/routes/attachments.ts` | geändert | Actor wird an `openAttachment` weitergegeben |
| `apps/api/src/app.ts` | geändert | Offene Attachment-Watcher werden beim App-Close beendet |
| `apps/api/src/services/backup-sftp.service.ts` | geändert | SFTP-Operationen für verschachtelte Pfade, Textdownload, Delete, Exists und sichere Pfadauflösung ergänzt |
| `apps/api/src/services/dump.service.ts` | geändert | Inkrementeller SFTP-Sync, Preview und Apply mit Manifest-/Dateiverifikation ergänzt |
| `apps/api/src/routes/dumps.ts` | geändert | Neue geschützte Sync-Endpunkte unter `/api/dumps/remote/sync` |
| `packages/shared-types/src/index.ts` | geändert | DTOs für inkrementellen Sync, Preview und Apply ergänzt |
| `apps/web/src/api/dumps.ts` | geändert | Web-API-Funktionen für Sync, Preview und Apply ergänzt |
| `apps/web/src/hooks/useLocalDumpStatus.ts` | geändert | TanStack-Query-Mutations und Preview-Query für inkrementellen Sync ergänzt |
| `apps/web/src/queries/queryKeys.ts` | geändert | Query-Key für Remote-Sync-Preview ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | Zentrale Dump-Invalidierung ergänzt |
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | Sync- und Sync-Import-Aktionen plus Ergebnis-/Preview-Anzeige ergänzt |
| `tests/integration/api/dumps-local.test.ts` | geändert | Inkrementeller Sync, Restore und Auth-/Permission-Fälle ergänzt |
| `tests/integration/api/attachments.test.ts` | geändert | Watcher-Metadatenupdate und Timeout-Verhalten ergänzt |
| `tests/unit/web/api/dumps.test.ts` | geändert | Lange Timeouts für neue Sync-Web-API-Funktionen abgesichert |
| `tests/fixtures/api/app.ts` | geändert | Test-App beendet Watcher beim Close |

## Probleme und Abweichungen

Die Aufgabendatei nennt einen bestehenden `POST /api/dumps/remote/upload`-Endpunkt, im Code existiert dieser Endpunkt nicht; der vorhandene ZIP-SFTP-Upload über `POST /api/dumps/local/save` wurde deshalb unverändert beibehalten. Beim Testen zeigte sich, dass `fs.watch` in der Windows-Testumgebung Dateiänderungen nicht zuverlässig beziehungsweise zu früh beim 0-Byte-Zwischenzustand meldet. Die Watcher-Implementierung wurde deshalb robuster gelöst als in der Aufgabendatei skizziert: Parent-Directory-Watcher mit Dateinamenfilter, Polling-Fallback und Settle-Delay.

## Offene Punkte / Folgeaufgaben

Keine.
