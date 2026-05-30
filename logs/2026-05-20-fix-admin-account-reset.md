# Log: Admin Account Reset

**Datum:** 20.05.26  
**Schritt:** Fix — Admin Account Reset  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der lokale Admin-Account `admin@local` wurde in der SQLite-Entwicklungsdatenbank zurückgesetzt. Der Benutzer wurde aktiviert, wieder der Systemrolle `admin` zugeordnet und mit einem neu erzeugten temporären bcrypt-Passwort versehen. Zusätzlich wurde `app_settings.admin_setup_done` auf `true` gesetzt, damit der normale Login-Flow verwendet wird. Es wurden keine Quellcode-, API- oder Schemaänderungen vorgenommen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/data/taskmanager.sqlite` | geändert | Lokaler Admin-Benutzer zurückgesetzt |
| `logs/2026-05-20-fix-admin-account-reset.md` | neu | Schritt-Log für den operativen Reset |

## Probleme und Abweichungen

Das temporäre Passwort wird aus Sicherheitsgründen nicht im Log dokumentiert. Keine weiteren Abweichungen.

## Offene Punkte / Folgeaufgaben

Nach dem Login sollte das temporäre Passwort in der Benutzerverwaltung geändert werden.
