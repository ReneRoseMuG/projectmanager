# Log: Google-Drive-Dump

**Datum:** 17.05.26  
**Schritt:** Feature — Google-Drive-Dump und Aktualisieren  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Es wurde eine vollständige Dump- und Restore-Komponente für Projekt Manager umgesetzt. Der Dump exportiert alle aktuell registrierten SQLite-Anwendungstabellen sowie die Dateibereiche `uploads/` und `content/` in ein ZIP mit `data.json` und `manifest.json`. Die neue Google-Drive-Anbindung lädt Sicherungen über die Drive-API in einen festen Ordner hoch und kann die neueste valide Sicherung für eine Aktualisierung finden. Der Import prüft Manifest, Tabellen- und Datei-Hashes, Sicherheitsphrase und Datei-Hash, erstellt vor dem Import ein Zielbackup und rollt bei DB- oder Dateisystemfehlern zurück. Zusätzlich wurde ein Sicherungsbereich im Frontend ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/dump.service.ts` | neu | Dump-Erzeugung, Preview, Restore, Verifikation und Rollback |
| `apps/api/src/services/google-drive.service.ts` | neu | Direkter Google-Drive-Client über OAuth-Refresh-Token |
| `apps/api/src/routes/dumps.ts` | neu | Fastify-Endpunkte für Sichern, Preview und Apply |
| `apps/api/src/app.ts` | geändert | SQLite- und Drive-Client-Dekoration sowie Dump-Routen registriert |
| `apps/api/src/config.ts` | geändert | Google-Drive- und Backup-Konfiguration ergänzt |
| `packages/shared-types/src/index.ts` | geändert | Gemeinsame Dump-/Drive-Typen ergänzt |
| `apps/web/src/pages/SettingsBackupPage.tsx` | neu | UI für Sichern und Aktualisieren |
| `apps/web/src/api/dumps.ts` | neu | Frontend-API-Client für Dump-Endpunkte |
| `apps/api/tests/integration/dumps-drive.test.ts` | neu | Roundtrip-, Drive- und Fehlerfalltests mit echter temporärer DB und echten Dateien |

## Probleme und Abweichungen

Der vollständige Root-Lintlauf ist durch bestehende, nicht im Rahmen dieses Auftrags geänderte Altbefunde blockiert: ein ungenutzter `Badge`-Import in `TaskDetail.tsx` sowie bestehende Lint-Befunde in `wiki-import.service.ts`. Die neuen Backend- und Frontend-Dateien wurden separat gelintet und sind sauber. Der Web-Build meldet weiterhin nur die Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Für reale Google-Drive-Zugriffe müssen `GOOGLE_DRIVE_BACKUP_FOLDER_ID`, `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET` und `GOOGLE_DRIVE_REFRESH_TOKEN` lokal in `apps/api/.env` gepflegt werden.
