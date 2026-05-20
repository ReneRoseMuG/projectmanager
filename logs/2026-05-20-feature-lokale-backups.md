# Log: Lokale Backups

**Datum:** 20.05.26  
**Schritt:** Feature — Lokale Backups statt Google Drive  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Google-Drive-Anbindung wurde aus dem aktiven Dump-Workflow entfernt und durch lokale Backup-Dateien im Repository-Root ersetzt. Sicherungen werden jetzt als vollständige ZIP-Dateien in `backups/` geschrieben; der Ordner wird bei Bedarf automatisch angelegt. Die bestehende Dump-Struktur mit `data.json`, `manifest.json`, `uploads/` und `content/` bleibt erhalten. Vorschau und Import lesen die neueste valide lokale Dump-ZIP aus diesem Ordner und nutzen weiterhin Hashprüfung, Sicherheitsphrase, Manifestprüfung, Zielbackup, Fremdschlüsselprüfung und Rollback. Die Sicherungsseite zeigt jetzt den lokalen Backup-Ordner und arbeitet ohne OAuth- oder Drive-Konfiguration.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/dump.service.ts` | geändert | Lokale Backup-Dateien, Status, Sicherung, Vorschau und Import ergänzt; Drive-Transport entfernt |
| `apps/api/src/routes/dumps.ts` | geändert | Lokale Dump-Routen unter `/api/dumps/local/*` statt Drive-Routen |
| `apps/api/src/config.ts` | geändert | Google-Drive-Env-Werte entfernt; `BACKUP_WORK_DIR` relativ zum Repo-Root aufgelöst |
| `apps/api/src/runtime-safety.ts` | geändert | Repo-Root und Schutz des Root-Backup-Ordners ergänzt |
| `apps/api/src/services/google-drive.service.ts` | gelöscht | Google-Drive-Client entfernt |
| `apps/api/src/services/drive-config.service.ts` | gelöscht | Drive-Zielordner-Konfiguration entfernt |
| `apps/api/google-drive-oauth-daten.txt` | gelöscht | Lokale Google-OAuth-Ablage entfernt |
| `packages/shared-types/src/index.ts` | geändert | Dump-DTOs von Drive auf lokale Backup-Dateien umgestellt |
| `apps/web/src/api/dumps.ts` | geändert | Web-API auf lokale Dump-Endpunkte umgestellt |
| `apps/web/src/hooks/useLocalDumpStatus.ts` | neu | TanStack-Query-Hook für lokalen Backup-Status |
| `apps/web/src/hooks/useDriveDumpConfig.ts` | gelöscht | Drive-Konfigurationshook entfernt |
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | UI von Google Drive auf lokalen Backup-Ordner umgestellt |
| `apps/web/src/queries/queryKeys.ts` | geändert | Dump-Query-Key für lokalen Backup-Status ergänzt |
| `apps/web/src/queries/__tests__/invalidation.integration.test.ts` | geändert | Query-Key-Test auf lokalen Backup-Status angepasst |
| `apps/api/tests/integration/dumps-local.test.ts` | neu | Lokale Backup-, Import-, Auth- und Fehlerfalltests |
| `apps/api/tests/integration/dumps-drive.test.ts` | gelöscht | Drive-basierte Tests ersetzt |
| `apps/api/tests/helpers/app.ts` | geändert | Drive-Testclient aus Test-App entfernt |
| `apps/api/src/types.ts` | geändert | Fastify-Decoration für Drive-Client entfernt |
| `apps/api/src/app.ts` | geändert | Drive-Client-Erzeugung entfernt |
| `apps/api/.env.example` | geändert | Google-Drive-Variablen entfernt |
| `.gitignore` | geändert | Root-Backup-Ordner aus Git ausgeschlossen |
| `apps/api/src/runtime-safety.test.ts` | geändert | Backup-Schutzpfad auf Repo-Root angepasst |
| `logs/2026-05-20-feature-lokale-backups.md` | neu | Schritt-Log für diesen Auftrag |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der erste gezielte Dump-Testlauf war in einem neu angelegten Auth-Test rot, weil die Test-App ohne explizites Initialpasswort keinen `admin@local`-Login erlaubte. Der Test wurde auf eine isolierte Auth-Konfiguration mit Wiederherstellung der ursprünglichen Config umgestellt. Danach war der gezielte Dump-Testlauf grün. Keine fachliche Abweichung vom Auftrag.

## Offene Punkte / Folgeaufgaben

Keine.
