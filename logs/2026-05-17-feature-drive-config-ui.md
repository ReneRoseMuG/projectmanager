# Log: Drive-Konfiguration in der UI

**Datum:** 17.05.26  
**Schritt:** Feature — Drive-Konfiguration in der UI  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Google-Drive-Zielordner-Konfiguration wurde in die Sicherungsseite integriert. Nutzer können jetzt entweder eine reine Google-Drive-Folder-ID oder eine vollständige Google-Drive-Ordner-URL einfügen; das Backend normalisiert daraus die Folder-ID und speichert sie persistent in SQLite. Die direkte Drive-Anbindung nutzt diese gespeicherte ID als primäre Quelle und fällt nur auf `GOOGLE_DRIVE_BACKUP_FOLDER_ID` aus `.env` zurück, wenn in der UI noch nichts gespeichert wurde. OAuth-Client-ID, Secret und Refresh-Token bleiben weiterhin ausschließlich in der Backend-Konfiguration. Die neue `app_settings`-Tabelle wurde per Drizzle-Migration angelegt und in den Dump-Vertrag aufgenommen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | `app_settings`-Tabelle ergänzt |
| `apps/api/src/db/migrations/0009_little_korath.sql` | neu | Migration für `app_settings` |
| `apps/api/src/services/drive-config.service.ts` | neu | Persistenz, URL-/ID-Normalisierung und effektive Drive-Konfiguration |
| `apps/api/src/services/google-drive.service.ts` | geändert | Drive-Client nutzt dynamische Folder-ID |
| `apps/api/src/services/dump.service.ts` | geändert | `app_settings` in Dump-Registry aufgenommen |
| `apps/api/src/routes/dumps.ts` | geändert | `GET/PUT /api/dumps/drive/config` ergänzt |
| `packages/shared-types/src/index.ts` | geändert | Shared Types für Drive-Konfiguration ergänzt |
| `apps/web/src/api/dumps.ts` | geändert | Frontend-API für Drive-Konfiguration ergänzt |
| `apps/web/src/hooks/useDriveDumpConfig.ts` | neu | Custom Hook für Laden und Speichern der Drive-Konfiguration |
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | Konfigurationsbereich mit URL-/ID-Eingabe ergänzt |
| `apps/web/src/queries/queryKeys.ts` | geändert | Query-Key für Drive-Konfiguration ergänzt |
| `apps/api/tests/integration/dumps-drive.test.ts` | geändert | Tests für URL-Eingabe, Persistenz und unveränderte Import-Sicherheit ergänzt |
| `apps/api/tests/helpers/db.ts` | geändert | Test-Truncate um neue Settings-Tabelle ergänzt |

## Probleme und Abweichungen

Beim ersten gezielten Testlauf zeigte `PREVIEW_CACHE_DIR` im Multipart-Test noch auf das App-Verzeichnis. Das Test-Setup wurde auf ein temporäres Preview-Verzeichnis erweitert; die Produktlogik wurde dadurch nicht verändert. Der Gesamt-Build ist erfolgreich, Vite meldet weiterhin nur die bekannte Bundle-Größenwarnung.

## Offene Punkte / Folgeaufgaben

Keine.
