# Log: Attachments API

**Datum:** 16.05.26  
**Schritt:** 6 — Attachments-API (multipart Upload, static serve, DELETE)  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Multipart-Upload, statisches Serving über `/uploads/` und Attachment-CRUD wurden implementiert. Uploads erhalten UUID-basierte Dateinamen mit Original-Erweiterung. Löschen entfernt den DB-Eintrag und versucht anschließend die Datei von Disk zu entfernen. Die Upload-Größe ist im Multipart-Plugin auf 25 MB begrenzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/plugins/multipart.ts` | neu | Multipart-Konfiguration |
| `apps/api/src/plugins/static.ts` | neu | Upload-Static-Serving |
| `apps/api/src/routes/attachments.ts` | neu | Attachment-Endpunkte |
| `apps/api/src/services/attachments.service.ts` | neu | Upload- und Löschlogik |
| `apps/api/uploads/.gitkeep` | neu | Upload-Ordner im Repo sichtbar |

## Probleme und Abweichungen

Runtime-Prüfung gegen SQLite ist wegen des blockierten `better-sqlite3`-Native-Bindings nicht möglich.

## Offene Punkte / Folgeaufgaben

Multipart-Integrationstest nach lauffähiger SQLite-Installation ergänzen.
