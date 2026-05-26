# Log: Standard-Admin zurückgesetzt

**Datum:** 26.05.26  
**Schritt:** Fix  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der lokale Standard-Admin wurde auf `Rene Rose <schroedingerskater@web.de>` umgestellt. Die API-Konfiguration in `apps/api/.env` nutzt diese E-Mail und den Namen nun als Standard-Admin-Daten. In der lokalen SQLite-Datenbank wurde der passende Admin-Datensatz aktiv gehalten, auf die Admin-Rolle gesetzt und der Passwort-Hash entfernt. Zusätzlich wurde `admin_setup_done` auf `false` gesetzt, damit beim nächsten Login der Passwort-Setzen-Flow greift. Der alte zusätzliche Admin `admin@local` wurde nach Prüfung eines aktiven neuen Admins aus der lokalen Datenbank gelöscht.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/.env` | geändert | Lokale Standard-Admin-Mail und Name auf Rene Rose gesetzt |
| `apps/api/data/taskmanager.sqlite` | geändert | Lokaler Admin-Datensatz zurückgesetzt und alter Admin gelöscht |
| `logs/2026-05-26-fix-standard-admin-reset.md` | neu | Schritt-Log für den lokalen Auth-Datenfix |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
