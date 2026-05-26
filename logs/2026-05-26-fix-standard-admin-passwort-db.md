# Log: Standard-Admin Passwort DB

**Datum:** 26.05.26  
**Schritt:** Fix — Standard-Admin Passwort DB  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für den bestehenden aktiven Admin-Benutzer Rene Rose wurde in der lokalen SQLite-Datenbank ein neuer bcrypt-Passwort-Hash mit 12 Salt-Rounds gespeichert. Der Eingriff wurde auf den eindeutig gefundenen Benutzer mit der Rolle `admin` begrenzt. Zusätzlich wurde `admin_setup_done` auf `true` gesetzt, weil die Auth-Logik diesen Status beim regulären Initial-Passwort-Setup ebenfalls setzt und der Benutzer sonst nach dem Login erneut in den Setup-Flow geleitet würde. Rollen, Berechtigungen, Profildaten, Schema und Anwendungscode wurden nicht geändert. Das Passwort und der erzeugte Hash wurden nicht in den Log aufgenommen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/data/taskmanager.sqlite` | geändert | Passwort-Hash und Admin-Setup-Status für den Standard-Admin aktualisiert |
| `logs/2026-05-26-fix-standard-admin-passwort-db.md` | neu | Schritt-Log für die lokale DB-Änderung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

`admin_setup_done` stand vor der Änderung auf `false`. Um den Login mit dem gesetzten Passwort ohne erneuten Setup-Flow zu ermöglichen, wurde der Status auf `true` gesetzt.

## Offene Punkte / Folgeaufgaben

Keine.
